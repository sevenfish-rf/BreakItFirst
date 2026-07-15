export type ThemeId =
  | "ember"
  | "violet"
  | "ocean"
  | "forest"
  | "gold";

export type AppTheme = {
  id: ThemeId;
  label: string;
  /** Circle swatch color */
  swatch: string;
  /** BorderGlow glowColor as "H S L" */
  glowColor: string;
  /** BorderGlow card background */
  backgroundColor: string;
  /** Mesh gradient border colors (3) */
  colors: [string, string, string];
  /** Primary UI accent (hex) */
  accent: string;
  accentHover: string;
  /** Soft accent wash for page mesh */
  mesh: string;
  /** PixelBlast color */
  blastColor: string;
  /** CSS page background */
  pageBg: string;
};

export const THEME_STORAGE_KEY = "breakitfirst.theme";

/** Default + 4 additional themes */
export const THEMES: Record<ThemeId, AppTheme> = {
  ember: {
    id: "ember",
    label: "Ember",
    swatch: "#FF6B6B",
    glowColor: "0 90 72",
    backgroundColor: "#110b0b",
    colors: ["#FF6B6B", "#f472b6", "#38bdf8"],
    accent: "#FF6B6B",
    accentHover: "#ff5252",
    mesh: "rgba(255, 107, 107, 0.14)",
    blastColor: "#FF6B6B",
    pageBg: "#070708",
  },
  violet: {
    id: "violet",
    label: "Violet",
    swatch: "#a78bfa",
    glowColor: "270 90 75",
    backgroundColor: "#0e0b14",
    colors: ["#c084fc", "#a78bfa", "#f472b6"],
    accent: "#a78bfa",
    accentHover: "#8b5cf6",
    mesh: "rgba(167, 139, 250, 0.14)",
    blastColor: "#a78bfa",
    pageBg: "#08060c",
  },
  ocean: {
    id: "ocean",
    label: "Ocean",
    swatch: "#38bdf8",
    glowColor: "199 95 70",
    backgroundColor: "#0a1016",
    colors: ["#38bdf8", "#22d3ee", "#818cf8"],
    accent: "#38bdf8",
    accentHover: "#0ea5e9",
    mesh: "rgba(56, 189, 248, 0.14)",
    blastColor: "#38bdf8",
    pageBg: "#06090d",
  },
  forest: {
    id: "forest",
    label: "Forest",
    swatch: "#34d399",
    glowColor: "160 75 55",
    backgroundColor: "#0a120f",
    colors: ["#34d399", "#2dd4bf", "#a3e635"],
    accent: "#34d399",
    accentHover: "#10b981",
    mesh: "rgba(52, 211, 153, 0.14)",
    blastColor: "#34d399",
    pageBg: "#060a08",
  },
  gold: {
    id: "gold",
    label: "Gold",
    swatch: "#fbbf24",
    glowColor: "43 95 60",
    backgroundColor: "#14100a",
    colors: ["#fbbf24", "#fb923c", "#f472b6"],
    accent: "#fbbf24",
    accentHover: "#f59e0b",
    mesh: "rgba(251, 191, 36, 0.14)",
    blastColor: "#fbbf24",
    pageBg: "#0a0805",
  },
};

export const THEME_LIST: AppTheme[] = [
  THEMES.ember,
  THEMES.violet,
  THEMES.ocean,
  THEMES.forest,
  THEMES.gold,
];

export function isThemeId(value: string): value is ThemeId {
  return value in THEMES;
}

export function applyThemeToDocument(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.style.setProperty("--background", theme.pageBg);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-hover", theme.accentHover);
  root.style.setProperty("--accent-soft", `${theme.accent}1f`);
  root.style.setProperty("--border-glow", `${theme.accent}59`);
  root.style.setProperty("--theme-mesh", theme.mesh);
  root.style.setProperty("--theme-card-bg", theme.backgroundColor);
}
