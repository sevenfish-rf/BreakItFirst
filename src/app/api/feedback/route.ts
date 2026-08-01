import { NextResponse } from "next/server";

import { parseFeedbackEvent } from "@/lib/feedback-event";
import { appendFeedbackEvent } from "@/lib/feedback-store";
import {
  checkRateLimit,
  getClientIp,
  getSessionId,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * S6/N6 — record one anonymous verdict on the SPOF the report just showed.
 *
 * SECURITY POSTURE, STATED PLAINLY: this endpoint is **unauthenticated**, like
 * every other route in this app (there are no accounts — `01-product.md` §6).
 * Anyone who can reach the app can POST a verdict, so the numbers it collects
 * are *unauthenticated signal*, not an audited ballot: treat a shift in the
 * ratio as a prompt to go read reports, never as a metric to defend. Three
 * walls limit the damage: a 20/min rate limit per ip+session, a 4 KB body cap,
 * and a hard file-size cap in the store. What it cannot stop is a determined
 * ballot-stuffer; if this ever informs a decision that matters, the fix is
 * signing the report id at generation time, not a bigger rate limit.
 *
 * It never touches the provider, so a request here costs $0 and no GPU time.
 */

/** A valid submission is ~250 bytes. 4 KB is generous and still a wall. */
const MAX_BODY_BYTES = 4096;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const sessionId = getSessionId(request);

  const limitResult = checkRateLimit({ ip, sessionId, route: "feedback" });
  if (!limitResult.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        message: `Too many feedback submissions. Try again in ${limitResult.retryAfterSec}s.`,
        retryAfterSec: limitResult.retryAfterSec,
      },
      { status: 429, headers: rateLimitHeaders(limitResult) },
    );
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Could not read request body." },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, code: "too_large", message: "Feedback payload too large." },
      { status: 413, headers: rateLimitHeaders(limitResult) },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  const parsed = parseFeedbackEvent(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, code: "invalid_event", message: parsed.message },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  const written = appendFeedbackEvent(parsed.event);

  // A sink that cannot be written to is an operations problem, not a user
  // problem: the click is still acknowledged, and the reason is logged (never
  // the event contents — the log is not a second copy of the signal).
  if (!written.ok) {
    console.warn("[feedback] not recorded", {
      reason: written.reason,
      message: written.message,
    });
    return NextResponse.json(
      { ok: true, recorded: false, reason: written.reason },
      { headers: rateLimitHeaders(limitResult) },
    );
  }

  console.info("[feedback] recorded", {
    verdict: parsed.event.verdict,
    locale: parsed.event.locale,
    mode: parsed.event.mode,
    hasAltHinge: parsed.event.alt_hinge !== null,
  });

  return NextResponse.json(
    { ok: true, recorded: true },
    { headers: rateLimitHeaders(limitResult) },
  );
}
