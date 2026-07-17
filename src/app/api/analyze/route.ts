import { NextResponse } from "next/server";
import {
  completeJobFailure,
  completeJobSuccess,
  createAnalyzeJob,
  publishJobEvent,
} from "@/lib/analyze-jobs";
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
export const dynamic = "force-dynamic";
/** Deep analysis can run 4+ model calls; raise when host allows (Vercel Pro+). */
export const maxDuration = 300;

type AnalyzeBody = {
  idea?: unknown;
  category?: unknown;
  locale?: unknown;
  deepAnalysis?: unknown;
  provider?: {
    baseUrl?: unknown;
    apiKey?: unknown;
    pass1Model?: unknown;
    pass2Model?: unknown;
  };
};

/**
 * Start an analysis job that survives browser refresh.
 * Client watches progress via GET /api/analyze/status?jobId=…
 * Only explicit cancel aborts provider calls (not refresh/disconnect).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const sessionId = getSessionId(request);
  const strict = isStrictMode({ ip, sessionId });

  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const deepAnalysis = body.deepAnalysis === true;

  const limitResult = checkRateLimit({
    ip,
    sessionId,
    route: "analyze",
    strict,
    cost: deepAnalysis ? 2 : 1,
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
        status: 400,
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
  const job = createAnalyzeJob();

  console.info("[analyze] job started", {
    jobId: job.id,
    ip,
    sessionId,
    deepAnalysis,
    category: input.category,
  });

  // Fire-and-forget: job.abort only — NOT request.signal (refresh must not kill job)
  void (async () => {
    try {
      publishJobEvent(job, {
        type: "stage",
        stage: "ingest",
        detail: "Pipeline connected",
        at: Date.now(),
      });

      const result = await runFailureAnalysisPipeline({
        idea: input.idea,
        category: input.category,
        locale,
        deepAnalysis,
        provider: {
          baseUrl: providerFields.baseUrl,
          apiKey: providerFields.apiKey,
          pass1Model: providerFields.pass1Model,
          pass2Model: providerFields.pass2Model,
        },
        signal: job.abort.signal,
        onStage: (event) => {
          if (job.status !== "running") return;
          console.info(
            `[analyze] job=${job.id} stage → ${event.stage}`,
            event.detail ?? "",
          );
          publishJobEvent(job, {
            type: "stage",
            stage: event.stage,
            detail: event.detail,
            at: Date.now(),
          });
        },
      });

      // If cancelled mid-flight, pipeline may return provider_error; prefer cancelled
      if (job.status !== "running") {
        return;
      }

      if (!result.ok) {
        if (result.code === "not_analyzable") {
          recordAbuseStrike({
            ip,
            sessionId,
            reason: "model_not_analyzable",
          });
          console.warn("[analyze] not_analyzable", {
            jobId: job.id,
            details: result.details,
            pipelineMs: result.meta?.totalMs,
          });
        } else {
          console.warn("[analyze] fail", {
            jobId: job.id,
            code: result.code,
            stage: result.stage,
            details: result.details,
            pipelineMs: result.meta?.totalMs,
          });
        }

        // Abort after cancel often surfaces as provider_error
        if (
          job.abort.signal.aborted ||
          /cancel|abort/i.test(result.message)
        ) {
          completeJobFailure(job, {
            message: "Analysis cancelled.",
            code: "cancelled",
            cancelled: true,
          });
          return;
        }

        completeJobFailure(job, {
          message:
            result.code === "not_analyzable"
              ? NEUTRAL_IDEA_MESSAGE
              : result.message,
          code: result.code,
          stage: result.stage,
        });
        return;
      }

      console.info("[analyze] ok", {
        jobId: job.id,
        pipelineMs: result.meta.totalMs,
        stages: result.meta.stages,
        spof: result.analysis.single_point_of_failure.component,
      });

      completeJobSuccess(job, {
        analysis: result.analysis,
        warnings: result.warnings,
        meta: result.meta,
      });
    } catch (err) {
      if (job.status !== "running") return;

      if (job.abort.signal.aborted) {
        completeJobFailure(job, {
          message: "Analysis cancelled.",
          code: "cancelled",
          cancelled: true,
        });
        return;
      }

      const message =
        err instanceof ProviderError
          ? err.message
          : humanizeCaughtError(err, undefined);

      console.error("[analyze] unexpected", job.id, message, err);
      completeJobFailure(job, {
        message: message || "Analysis failed. Retry.",
        code: "pipeline_error",
      });
    }
  })();

  return NextResponse.json(
    {
      ok: true,
      jobId: job.id,
      message: "Analysis started. Subscribe via /api/analyze/status?jobId=…",
    },
    { headers: rateLimitHeaders(limitResult) },
  );
}
