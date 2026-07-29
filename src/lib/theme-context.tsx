"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  isThemeMode,
  systemPrefersDark,
  type ThemeMode,
} from "@/lib/themes";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "navy";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && isThemeMode(raw)) {
      if (raw === "light") return "navy";
      return raw;
    }
  } catch {
    /* ignore */
  }
  return systemPrefersDark() ? "dark" : "navy";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() =>
    typeof window === "undefined" ? "navy" : readStoredMode(),
  );

  useEffect(() => {
    applyThemeToDocument(mode);
  }, [mode]);

  const persist = useCallback((next: ThemeMode) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      persist(next);
    },
    [persist],
  );

  const toggle = useCallback(() => {
    setModeState((prev) => {
      let next: ThemeMode = "navy";
      if (prev === "navy" || prev === "light") {
        next = "crimson";
      } else if (prev === "crimson") {
        next = "dark";
      } else {
        next = "navy";
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, toggle }),
    [mode, setMode, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
