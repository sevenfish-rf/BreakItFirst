import { NextResponse } from "next/server";
import {
  ProviderError,
  listProviderModels,
  testProviderConnection,
} from "@/lib/provider-client";
import { humanizeCaughtError } from "@/lib/provider-errors";
import { MAX_BASE_URL_LENGTH, MAX_MODEL_ID_LENGTH } from "@/lib/input-validation";
import {
  checkRateLimit,
  getClientIp,
  getSessionId,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  baseUrl?: unknown;
  apiKey?: unknown;
  test?: unknown;
  model?: unknown;
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const sessionId = getSessionId(request);

  const limitResult = checkRateLimit({
    ip,
    sessionId,
    route: "models",
  });

  if (!limitResult.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        message: `Too many provider requests. Try again in ${limitResult.retryAfterSec}s.`,
        retryAfterSec: limitResult.retryAfterSec,
      },
      {
        status: 429,
        headers: rateLimitHeaders(limitResult),
      },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const doTest = body.test === true;

  if (!baseUrl || baseUrl.length > MAX_BASE_URL_LENGTH) {
    return NextResponse.json(
      { ok: false, message: "Base URL is required." },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  if (apiKey.length > 4096) {
    return NextResponse.json(
      { ok: false, message: "API key is too long." },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  if (model.length > MAX_MODEL_ID_LENGTH) {
    return NextResponse.json(
      { ok: false, message: "Model id is too long." },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  try {
    if (doTest) {
      const result = await testProviderConnection({
        baseUrl,
        apiKey,
        model: model || undefined,
        signal: request.signal,
      });
      const models = await listProviderModels({
        baseUrl,
        apiKey,
        signal: request.signal,
      }).catch(() => result.sampleModels.map((id) => ({ id })));

      return NextResponse.json(
        {
          ok: true,
          tested: true,
          modelCount: models.length || result.modelCount,
          models: models.map((m) => m.id),
        },
        { headers: rateLimitHeaders(limitResult) },
      );
    }

    const models = await listProviderModels({
      baseUrl,
      apiKey,
      signal: request.signal,
    });

    return NextResponse.json(
      {
        ok: true,
        tested: false,
        modelCount: models.length,
        models: models.map((m) => m.id),
      },
      { headers: rateLimitHeaders(limitResult) },
    );
  } catch (err) {
    const message =
      err instanceof ProviderError
        ? err.message
        : humanizeCaughtError(err, "models");

    console.warn("[models]", message);

    return NextResponse.json(
      {
        ok: false,
        message,
        code: "provider_error",
      },
      {
        status:
          err instanceof ProviderError && err.status >= 400 && err.status < 600
            ? err.status
            : 502,
        headers: rateLimitHeaders(limitResult),
      },
    );
  }
}
