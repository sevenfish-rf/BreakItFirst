const SESSION_KEY = "breakitfirst.sessionId";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-browser session id for rate limiting (no auth). */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";

  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,128}$/.test(existing)) {
      return existing;
    }
    const id = randomId();
    window.localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}
