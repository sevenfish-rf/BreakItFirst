/**
 * Turn provider HTTP failures into user-facing messages.
 * Never echo API keys. Truncate and strip sensitive-looking strings.
 */

export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, "sk-***")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer ***")
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"',\s}]+/gi, "api_key=***");
}

export function extractProviderErrorMessage(body: string): string | null {
  const raw = body.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const err = parsed.error;
    if (typeof err === "string" && err.trim()) return err.trim();
    if (err && typeof err === "object") {
      const obj = err as Record<string, unknown>;
      if (typeof obj.message === "string" && obj.message.trim()) {
        return obj.message.trim();
      }
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    // plain text body
  }

  // Keep short plain-text bodies
  if (raw.length <= 280 && !raw.includes("<html")) {
    return raw;
  }

  return null;
}

export function humanizeProviderFailure(params: {
  status: number;
  body: string;
  stage?: "pass1" | "pass2" | "models" | "test";
}): string {
  const stageLabel =
    params.stage === "pass1"
      ? "Pass 1 (reasoning)"
      : params.stage === "pass2"
        ? "Pass 2 (structuring)"
        : params.stage === "models"
          ? "Model list"
          : params.stage === "test"
            ? "Connection test"
            : "Provider";

  const extracted = extractProviderErrorMessage(params.body);
  const detail = extracted ? redactSecrets(extracted) : null;

  switch (params.status) {
    case 0:
      return `${stageLabel}: cannot reach provider. Check base URL, network, and CORS/firewall.`;
    case 401:
    case 403:
      return `${stageLabel}: auth failed (${params.status}). Check API key and permissions.${detail ? ` — ${detail}` : ""}`;
    case 404:
      return `${stageLabel}: endpoint or model not found (404). Verify base URL ends with /v1 and model id is correct.${detail ? ` — ${detail}` : ""}`;
    case 408:
    case 504:
      return `${stageLabel}: timed out. Try a faster model or shorter idea.`;
    case 429:
      return `${stageLabel}: rate limited (429). Wait and retry.${detail ? ` — ${detail}` : ""}`;
    case 400:
    case 422:
      return `${stageLabel}: bad request (${params.status}). Often wrong model id or unsupported params.${detail ? ` — ${detail}` : ""}`;
    case 500:
    case 502:
    case 503:
      return `${stageLabel}: provider is down or errored (${params.status}).${detail ? ` — ${detail}` : ""}`;
    default:
      return `${stageLabel}: error ${params.status}.${detail ? ` — ${detail}` : " Analysis failed. Retry."}`;
  }
}

export function humanizeCaughtError(
  err: unknown,
  stage?: "pass1" | "pass2" | "models" | "test",
): string {
  if (err && typeof err === "object" && "status" in err && "body" in err) {
    const pe = err as { status: number; body: string; message?: string };
    return humanizeProviderFailure({
      status: pe.status,
      body: pe.body ?? "",
      stage,
    });
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network|Failed to fetch/i.test(msg)) {
    return humanizeProviderFailure({ status: 0, body: msg, stage });
  }

  if (/Invalid provider base URL|not allowed|must be http/i.test(msg)) {
    return `Provider URL rejected: ${msg}`;
  }

  return redactSecrets(msg) || "Analysis failed. Retry.";
}
