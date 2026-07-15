import { NextResponse } from "next/server";
import {
  NEUTRAL_IDEA_MESSAGE,
  validateAnalyzeInput,
  validateProviderFields,
} from "@/lib/input-validation";
import { runFailureAnalysisPipeline } from "@/lib/pipeline";
import { ProviderError } from "@/lib/provider-client";
import { humanizeCaughtError } from "@/lib/provider-errors";
import {
  checkRateLimit,
  getClientIp,
  getSessionId,
  isStrictMode,
  rateLimitHeaders,
  recordAbuseStrike,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

type AnalyzeBody = {
  idea?: unknown;
  category?: unknown;
  locale?: unknown;
  provider?: {
    baseUrl?: unknown;
    apiKey?: unknown;
    pass1Model?: unknown;
    pass2Model?: unknown;
  };
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const sessionId = getSessionId(request);
  const strict = isStrictMode({ ip, sessionId });

  const limitResult = checkRateLimit({
    ip,
    sessionId,
    route: "analyze",
    strict,
  });

  if (!limitResult.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        message: `Too many analyses. Try again in ${limitResult.retryAfterSec}s.`,
        retryAfterSec: limitResult.retryAfterSec,
      },
      {
        status: 429,
        headers: rateLimitHeaders(limitResult),
      },
    );
  }

  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  const input = validateAnalyzeInput({
    idea: body.idea,
    category: body.category,
  });

  if (!input.ok) {
    if (input.code === "not_analyzable") {
      recordAbuseStrike({
        ip,
        sessionId,
        reason: "pre_model_not_analyzable",
      });
    }
    return NextResponse.json(
      {
        ok: false,
        code: input.code,
        message: input.message,
      },
      {
        status: input.code === "invalid_category" ? 400 : 400,
        headers: rateLimitHeaders(limitResult),
      },
    );
  }

  const providerFields = validateProviderFields({
    baseUrl: body.provider?.baseUrl,
    apiKey: body.provider?.apiKey,
    pass1Model: body.provider?.pass1Model,
    pass2Model: body.provider?.pass2Model,
  });

  if (!providerFields.ok) {
    return NextResponse.json(
      { ok: false, message: providerFields.message },
      { status: 400, headers: rateLimitHeaders(limitResult) },
    );
  }

  const locale = body.locale === "id" ? "id" : "en";

  try {
    const result = await runFailureAnalysisPipeline({
      idea: input.idea,
      category: input.category,
      locale,
      provider: {
        baseUrl: providerFields.baseUrl,
        apiKey: providerFields.apiKey,
        pass1Model: providerFields.pass1Model,
        pass2Model: providerFields.pass2Model,
      },
      signal: request.signal,
    });

    if (!result.ok) {
      if (result.code === "not_analyzable") {
        recordAbuseStrike({
          ip,
          sessionId,
          reason: "model_not_analyzable",
        });
        // Spec §14: neutral message; log details server-side only
        console.warn("[analyze] not_analyzable", {
          ip,
          sessionId,
          details: result.details,
        });
      } else if (result.details?.length) {
        console.warn("[analyze]", result.code, result.stage, result.details);
      }

      const status =
        result.code === "not_analyzable"
          ? 422
          : result.code === "provider_error" || result.code === "schema_invalid"
            ? 502
            : 500;

      return NextResponse.json(
        {
          ok: false,
          code: result.code,
          stage: result.stage,
          message:
            result.code === "not_analyzable"
              ? NEUTRAL_IDEA_MESSAGE
              : result.message,
        },
        { status, headers: rateLimitHeaders(limitResult) },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        analysis: result.analysis,
        warnings: result.warnings,
      },
      { headers: rateLimitHeaders(limitResult) },
    );
  } catch (err) {
    const message =
      err instanceof ProviderError
        ? err.message
        : humanizeCaughtError(err, undefined);

    console.error("[analyze] unexpected", message, err);
    return NextResponse.json(
      {
        ok: false,
        code: "pipeline_error",
        message: message || "Analysis failed. Retry.",
      },
      { status: 500, headers: rateLimitHeaders(limitResult) },
    );
  }
}
