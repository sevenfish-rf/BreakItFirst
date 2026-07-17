export type ProviderSettings = {
  baseUrl: string;
  apiKey: string;
  pass1Model: string;
  pass2Model: string;
};

export const PROVIDER_STORAGE_KEY = "breakitfirst.provider";

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  pass1Model: "",
  pass2Model: "",
};

export const PROVIDER_PRESETS = [
  {
    id: "mimo",
    label: "Xiaomi MiMo",
    baseUrl: "https://api.xiaomimimo.com/v1",
    pass1Model: "mimo-v2.5-pro",
    pass2Model: "mimo-v2.5-pro",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    pass1Model: "",
    pass2Model: "",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    pass1Model: "",
    pass2Model: "",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    baseUrl: "http://127.0.0.1:11434/v1",
    pass1Model: "",
    pass2Model: "",
  },
  {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    pass1Model: "",
    pass2Model: "",
  },
] as const;

export function isProviderConfigured(settings: ProviderSettings): boolean {
  // API key optional for local gateways (Ollama, etc.)
  return Boolean(
    settings.baseUrl.trim() &&
      settings.pass1Model.trim() &&
      settings.pass2Model.trim(),
  );
}

/** True when provider likely needs a cloud key (not localhost). */
export function providerLikelyNeedsKey(settings: ProviderSettings): boolean {
  try {
    const host = new URL(settings.baseUrl).hostname.toLowerCase();
    return !(
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]"
    );
  } catch {
    return true;
  }
}

export function loadProviderSettings(): ProviderSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PROVIDER_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROVIDER_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
    return {
      ...DEFAULT_PROVIDER_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_PROVIDER_SETTINGS };
  }
}

export function saveProviderSettings(settings: ProviderSettings): void {
  window.localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(settings));
}

export function clearProviderSettings(): void {
  window.localStorage.removeItem(PROVIDER_STORAGE_KEY);
}
