/**
 * Theme = color mode. Editorial identity in light + dark; dark is driven by
 * a `dark` class on <html> (matches the concept's html.dark selectors).
 */

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "breakitfirst.theme";

export function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark";
}

/** Apply the mode by toggling the `dark` class on <html>. */
export function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}
