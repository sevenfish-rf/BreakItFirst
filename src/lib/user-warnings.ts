/**
 * Pipeline warnings include developer soft-checks (claim guard, schema soft
 * asserts). End users must not see raw technical strings.
 */

const TECH_PATTERNS: RegExp[] = [
  /soft claim guard/i,
  /soft check/i,
  /soft-check/i,
  /pass\s*2.*grounded/i,
  /match=\d/i,
  /cascade may be disconnected/i,
  /spof theme may be missing/i,
  /resilience profile/i,
  /stress test/i,
  /failure_modes/i,
  /spof label/i,
  /cascade depth/i,
  /critical_assumption/i,
  /point_of_no_return/i,
  /schema/i,
  /pass 1\.5 critique returned empty/i,
  /self_consistency was filled/i,
  /pipeline fallback/i,
];

/** Keep only notes that are meaningful (and safe) for product UI. */
export function filterUserFacingWarnings(warnings: string[]): string[] {
  return warnings.filter((w) => {
    const text = w.trim();
    if (!text) return false;
    if (TECH_PATTERNS.some((re) => re.test(text))) return false;
    return true;
  });
}

/**
 * Optional human copy for a few pipeline events. Technical strings that
 * don't match stay filtered out (not rewritten as jargon).
 */
export function humanizeUserWarning(
  warning: string,
  locale: "en" | "id" = "en",
): string {
  const w = warning.toLowerCase();
  if (w.includes("pass 2 succeeded after") && w.includes("retry")) {
    return locale === "id"
      ? "Struktur laporan diperbaiki otomatis setelah satu percobaan ulang (format JSON)."
      : "Report structure was auto-fixed after one formatting retry.";
  }
  if (w.includes("draft b was empty")) {
    return locale === "id"
      ? "Mode deep: salah satu draf penalaran kosong; analisis dilanjutkan dengan draf yang tersedia."
      : "Deep mode: one reasoning draft was empty; analysis continued with the available draft.";
  }
  // Unknown non-tech warning — pass through carefully
  return warning;
}

export function toUserFacingWarnings(
  warnings: string[] | undefined,
  locale: "en" | "id" = "en",
): string[] {
  if (!warnings?.length) return [];
  return filterUserFacingWarnings(warnings).map((w) =>
    humanizeUserWarning(w, locale),
  );
}
