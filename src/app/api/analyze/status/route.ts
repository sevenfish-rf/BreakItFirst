import { NextResponse } from "next/server";
import {
  getAnalyzeJob,
  isJobTerminal,
  subscribeJob,
  type AnalyzeJobEvent,
} from "@/lib/analyze-jobs";
import {
  encodeFlushedNdjson,
  NDJSON_STREAM_HEADERS,
} from "@/lib/ndjson-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Stream (or resume) events for an analysis job.
 * Safe to reconnect after browser refresh — replays history then live tail.
 * Disconnecting this stream does NOT cancel the job.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId")?.trim() ?? "";

  if (!jobId || jobId.length < 8 || jobId.length > 80) {
    return NextResponse.json(
      { ok: false, message: "Missing or invalid jobId." },
      { status: 400 },
    );
  }

  const job = getAnalyzeJob(jobId);
  if (!job) {
    return NextResponse.json(
      {
        ok: false,
        code: "job_not_found",
        message:
          "Analysis job not found or expired (server may have restarted). Start a new analysis.",
      },
      { status: 404 },
    );
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let closed = false;

  const write = async (obj: unknown) => {
    if (closed) return;
    try {
      await writer.write(encodeFlushedNdjson(obj));
    } catch {
      closed = true;
    }
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await writer.close();
    } catch {
      /* ignore */
    }
  };

  void (async () => {
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let unsub: (() => void) | null = null;
    let resolveDone: (() => void) | undefined;

    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    const finishStream = () => {
      resolveDone?.();
      resolveDone = undefined;
    };

    const onEvent = (event: AnalyzeJobEvent) => {
      void write(event).then(() => {
        if (event.type === "result") {
          finishStream();
        }
      });
    };

    try {
      // Identity so client can confirm reconnect
      await write({
        type: "hello",
        jobId: job.id,
        status: job.status,
        at: Date.now(),
      });

      unsub = subscribeJob(job, onEvent);

      // If already finished, subscribeJob already replayed result
      if (isJobTerminal(job)) {
        finishStream();
      } else {
        heartbeat = setInterval(() => {
          void write({ type: "ping", at: Date.now() });
        }, 8_000);

        // Stop this status stream only — does NOT cancel the job
        request.signal.addEventListener("abort", finishStream, { once: true });
      }

      await done;
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      unsub?.();
      await close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      ...NDJSON_STREAM_HEADERS,
    },
  });
}
