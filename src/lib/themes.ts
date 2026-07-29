/**
 * Theme = color mode. Supported presets:
 * - `navy`: Combo 1 — Navy & Buttercream (#1c4777 + #fffce1)
 * - `crimson`: Combo 2 — Crimson & Vanilla (#A90E02 + #FFFBD4)
 * - `dark`: Dark Mode (#0C0C0E)
 */

export type ThemeMode = "navy" | "crimson" | "dark" | "light";

export const THEME_STORAGE_KEY = "breakitfirst.theme";

export function isThemeMode(value: string): value is ThemeMode {
  return value === "navy" || value === "crimson" || value === "dark" || value === "light";
}

/** Apply theme by setting classes on <html>. */
export function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "theme-navy", "theme-crimson");

  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "crimson") {
    root.classList.add("theme-crimson");
  } else {
    // Default light mode maps to Navy & Buttercream
    root.classList.add("theme-navy");
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}
