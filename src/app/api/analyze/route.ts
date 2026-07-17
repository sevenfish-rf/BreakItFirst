import { NextResponse } from "next/server";
import {
  NEUTRAL_IDEA_MESSAGE,
  validateAnalyzeInput,
  validateProviderFields,
} from "@/lib/input-validation";
import { runFailureAnalysisPipeline } from "@/lib/pipeline";
import type { PipelineStageEvent } from "@/lib/pipeline-stages";
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
  /** C.6 opt-in multi Pass 1 calibration */
  deepAnalysis?: unknown;
  provider?: {
    baseUrl?: unknown;
    apiKey?: unknown;
    pass1Model?: unknown;
    pass2Model?: unknown;
  };
};

const encoder = new TextEncoder();

/**
 * Encode one NDJSON event and pad to ~4KB so Node / Next / browsers actually
 * flush the chunk instead of buffering tiny stage lines until the request ends.
 * Padding lines start with `:` (SSE-style comment) and are ignored by the client.
 */
function encodeFlushedEvent(obj: unknown): Uint8Array {
  const line = `${JSON.stringify(obj)}\n`;
  // 4KB is a common proxy buffer threshold
  const minBytes = 4096;
  if (line.length >= minBytes) {
    return encoder.encode(line);
  }
  const padLen = minBytes - line.length;
  // ":" comment line — not valid JSON, client skips it
  const pad = `:${" ".repeat(Math.max(0, padLen - 2))}\n`;
  return encoder.encode(line + pad);
}

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
    // Deep analysis ≈ 2× provider load (extra Pass 1)
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
  const rlHeaders = rateLimitHeaders(limitResult);

  // TransformStream: return Response immediately; write stages as they happen.
  // (ReadableStream start() can still buffer under some Next/Turbopack paths.)
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  let closed = false;
  const safeWrite = async (obj: unknown) => {
    if (closed) return;
    try {
      await writer.write(encodeFlushedEvent(obj));
    } catch {
      closed = true;
    }
  };

  const safeClose = async () => {
    if (closed) return;
    closed = true;
    try {
      await writer.close();
    } catch {
      /* already closed */
    }
  };

  // Run pipeline without blocking the Response return
  void (async () => {
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    try {
      // Immediate first byte so the client leaves "waiting for headers" state
      await safeWrite({
        type: "stage",
        stage: "ingest",
        detail: "Pipeline connected",
        at: Date.now(),
      });

      // Keepalive while model calls run (70s+ each) — prevents idle proxies
      // from buffering / dropping, and gives the client a chance to re-paint.
      heartbeat = setInterval(() => {
        void safeWrite({
          type: "ping",
          at: Date.now(),
        });
      }, 8_000);

      const onStage = (event: PipelineStageEvent) => {
        console.info(`[analyze] stage → ${event.stage}`, event.detail ?? "");
        void safeWrite({
          type: "stage",
          stage: event.stage,
          detail: event.detail,
          at: Date.now(),
        });
      };

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
        signal: request.signal,
        onStage,
      });

      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      if (!result.ok) {
        if (result.code === "not_analyzable") {
          recordAbuseStrike({
            ip,
            sessionId,
            reason: "model_not_analyzable",
          });
          console.warn("[analyze] not_analyzable", {
            ip,
            sessionId,
            deepAnalysis,
            details: result.details,
            pipelineMs: result.meta?.totalMs,
          });
        } else {
          console.warn("[analyze] fail", {
            code: result.code,
            stage: result.stage,
            deepAnalysis,
            details: result.details,
            pipelineMs: result.meta?.totalMs,
            stages: result.meta?.stages,
          });
        }

        await safeWrite({
          type: "result",
          ok: false,
          code: result.code,
          stage: result.stage,
          message:
            result.code === "not_analyzable"
              ? NEUTRAL_IDEA_MESSAGE
              : result.message,
        });
      } else {
        console.info("[analyze] ok", {
          ip,
          sessionId,
          deepAnalysis,
          category: input.category,
          pipelineMs: result.meta.totalMs,
          stages: result.meta.stages,
          warningCount: result.warnings.length,
          spof: result.analysis.single_point_of_failure.component,
        });

        await safeWrite({
          type: "result",
          ok: true,
          analysis: result.analysis,
          warnings: result.warnings,
          meta: result.meta,
        });
      }
    } catch (err) {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      const message =
        err instanceof ProviderError
          ? err.message
          : humanizeCaughtError(err, undefined);

      console.error("[analyze] unexpected", message, err);
      await safeWrite({
        type: "result",
        ok: false,
        code: "pipeline_error",
        message: message || "Analysis failed. Retry.",
      });
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      await safeClose();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
      // Hint to intermediaries that this is a long-lived stream
      Connection: "keep-alive",
      ...rlHeaders,
    },
  });
}
