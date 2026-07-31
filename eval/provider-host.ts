/**
 * One place that decides how a provider endpoint may be written down.
 *
 * Standing rule for this repo: run records name the provider **host** and never
 * the full base URL. A BYOK base URL can carry a path, a query string, or a
 * tenant/account id, and run summaries are read, pasted into docs, and diffed —
 * so the safe form is the only form the harnesses get.
 *
 * `hostOf` is deliberately total: a summary must never fail to be written
 * because an endpoint could not be parsed.
 */

/** Host of `u` (`host:port`, no scheme, no path, no credentials). */
export function hostOf(u: string): string {
  try {
    const parsed = new URL(u);
    return parsed.host || "(no host in base URL)";
  } catch {
    return "(unparseable base URL)";
  }
}
