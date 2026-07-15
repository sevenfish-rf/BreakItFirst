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
  THEME_LIST,
  THEME_STORAGE_KEY,
  THEMES,
  applyThemeToDocument,
  isThemeId,
  type AppTheme,
  type ThemeId,
} from "@/lib/themes";

type ThemeContextValue = {
  themeId: ThemeId;
  theme: AppTheme;
  themes: AppTheme[];
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "ember";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && isThemeId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "ember";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>("ember");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = readStoredTheme();
    setThemeIdState(id);
    applyThemeToDocument(THEMES[id]);
    setHydrated(true);
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    applyThemeToDocument(THEMES[id]);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const id = hydrated ? themeId : "ember";
    return {
      themeId: id,
      theme: THEMES[id],
      themes: THEME_LIST,
      setThemeId,
    };
  }, [themeId, setThemeId, hydrated]);

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
