/**
 * In-memory sliding-window rate limiter for MVP.
 * Works per Node process (fine for single-instance / local).
 * For multi-instance deploy, swap store for Redis later.
 */

export type RateLimitResult =
  | { allowed: true; remaining: number; limit: number; resetMs: number }
  | {
      allowed: false;
      remaining: 0;
      limit: number;
      resetMs: number;
      retryAfterSec: number;
    };

type WindowEntry = {
  timestamps: number[];
};

type AbuseEntry = {
  count: number;
  windowStart: number;
};

const windows = new Map<string, WindowEntry>();
const abuseFlags = new Map<string, AbuseEntry>();

// ── Limits (MVP defaults) ─────────────────────────────────────────────
export const LIMITS = {
  analyze: {
    limit: 8,
    windowMs: 15 * 60 * 1000, // 8 analyses / 15 min
  },
  analyzeStrict: {
    limit: 2,
    windowMs: 15 * 60 * 1000, // after repeated not_analyzable
  },
  models: {
    limit: 40,
    windowMs: 60 * 1000, // 40 model-list calls / min
  },
  abuseStrikeWindowMs: 60 * 60 * 1000, // 1 hour
  abuseStrikeThreshold: 3, // 3× not_analyzable → strict mode
} as const;

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

function getClientKey(parts: {
  ip: string;
  sessionId?: string | null;
  route: string;
}): string {
  const session = parts.sessionId?.trim() || "anon";
  return `${parts.route}:${parts.ip}:${session}`;
}

export function checkRateLimit(params: {
  ip: string;
  sessionId?: string | null;
  route: "analyze" | "models";
  strict?: boolean;
}): RateLimitResult {
  const now = Date.now();
  const cfg =
    params.route === "models"
      ? LIMITS.models
      : params.strict
        ? LIMITS.analyzeStrict
        : LIMITS.analyze;

  const key = getClientKey({
    ip: params.ip,
    sessionId: params.sessionId,
    route: params.route,
  });

  const entry = windows.get(key) ?? { timestamps: [] };
  entry.timestamps = prune(entry.timestamps, cfg.windowMs, now);

  if (entry.timestamps.length >= cfg.limit) {
    const oldest = entry.timestamps[0] ?? now;
    const resetMs = oldest + cfg.windowMs;
    const retryAfterSec = Math.max(1, Math.ceil((resetMs - now) / 1000));
    windows.set(key, entry);
    return {
      allowed: false,
      remaining: 0,
      limit: cfg.limit,
      resetMs,
      retryAfterSec,
    };
  }

  entry.timestamps.push(now);
  windows.set(key, entry);

  return {
    allowed: true,
    remaining: Math.max(0, cfg.limit - entry.timestamps.length),
    limit: cfg.limit,
    resetMs: now + cfg.windowMs,
  };
}

/** Record not_analyzable / injection short-circuit for harder throttling. */
export function recordAbuseStrike(params: {
  ip: string;
  sessionId?: string | null;
  reason: string;
}): { strikes: number; strict: boolean } {
  const now = Date.now();
  const key = `abuse:${params.ip}:${params.sessionId?.trim() || "anon"}`;
  const existing = abuseFlags.get(key);

  let count = 1;
  let windowStart = now;

  if (existing && now - existing.windowStart < LIMITS.abuseStrikeWindowMs) {
    count = existing.count + 1;
    windowStart = existing.windowStart;
  }

  abuseFlags.set(key, { count, windowStart });

  console.warn("[abuse]", {
    ip: params.ip,
    session: params.sessionId ?? "anon",
    reason: params.reason,
    strikes: count,
  });

  return {
    strikes: count,
    strict: count >= LIMITS.abuseStrikeThreshold,
  };
}

export function isStrictMode(params: {
  ip: string;
  sessionId?: string | null;
}): boolean {
  const key = `abuse:${params.ip}:${params.sessionId?.trim() || "anon"}`;
  const existing = abuseFlags.get(key);
  if (!existing) return false;
  if (Date.now() - existing.windowStart >= LIMITS.abuseStrikeWindowMs) {
    abuseFlags.delete(key);
    return false;
  }
  return existing.count >= LIMITS.abuseStrikeThreshold;
}

/**
 * Extract best-effort client IP from standard proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);

  return "unknown";
}

export function getSessionId(request: Request): string | null {
  const header = request.headers.get("x-session-id")?.trim();
  if (!header) return null;
  // UUID-ish or opaque token, hard cap length
  if (header.length < 8 || header.length > 128) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(header)) return null;
  return header;
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSec);
  }
  return headers;
}
