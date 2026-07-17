import { NextResponse } from "next/server";
import { cancelAnalyzeJob } from "@/lib/analyze-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Explicit cancel only — browser refresh does NOT hit this.
 * Aborts provider calls for the job and marks it cancelled.
 */
export async function POST(request: Request) {
  let body: { jobId?: unknown };
  try {
    body = (await request.json()) as { jobId?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!jobId) {
    return NextResponse.json(
      { ok: false, message: "Missing jobId." },
      { status: 400 },
    );
  }

  const result = cancelAnalyzeJob(jobId);
  if (!result.ok && result.message.includes("not found")) {
    return NextResponse.json(
      { ok: false, code: "job_not_found", message: result.message },
      { status: 404 },
    );
  }

  console.info("[analyze] cancel", { jobId, ...result });
  return NextResponse.json({
    ok: true,
    jobId,
    status: result.status,
    message: result.message,
  });
}
