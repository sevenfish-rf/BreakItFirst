"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, RefreshCw, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_PROVIDER_SETTINGS,
  PROVIDER_PRESETS,
  type ProviderSettings,
  isProviderConfigured,
  saveProviderSettings,
  clearProviderSettings,
} from "@/lib/provider-settings";
import { getOrCreateSessionId } from "@/lib/session";
import { cn } from "@/lib/utils";

type ProviderSettingsModalProps = {
  open: boolean;
  initial: ProviderSettings;
  onClose: () => void;
  onSave: (settings: ProviderSettings) => void;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; count: number; message?: string }
  | { status: "error"; message: string };

export function ProviderSettingsModal({
  open,
  initial,
  onClose,
  onSave,
}: ProviderSettingsModalProps) {
  const [draft, setDraft] = useState<ProviderSettings>(initial);
  const [showKey, setShowKey] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("openai");
  const [models, setModels] = useState<string[]>([]);
  const [modelFilter, setModelFilter] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setShowKey(false);
      setModels([]);
      setModelFilter("");
      setFetchState({ status: "idle" });
      const match = PROVIDER_PRESETS.find(
        (p) => p.baseUrl && p.baseUrl === initial.baseUrl,
      );
      setActivePreset(match?.id ?? "custom");
    }
  }, [open, initial]);

  const filteredModels = useMemo(() => {
    const q = modelFilter.trim().toLowerCase();
    if (!q) return models;
    return models.filter((id) => id.toLowerCase().includes(q));
  }, [models, modelFilter]);

  const fetchModels = useCallback(
    async (opts?: { test?: boolean }) => {
      if (!draft.baseUrl.trim()) {
        setFetchState({
          status: "error",
          message: "Enter a base URL first.",
        });
        return;
      }

      setFetchState({ status: "loading" });
      try {
        const res = await fetch("/api/models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Id": getOrCreateSessionId(),
          },
          body: JSON.stringify({
            baseUrl: draft.baseUrl.trim(),
            apiKey: draft.apiKey,
            test: opts?.test === true,
            model: draft.pass1Model || draft.pass2Model || undefined,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          models?: string[];
          modelCount?: number;
        };

        if (!res.ok || !data.ok) {
          setModels([]);
          setFetchState({
            status: "error",
            message: data.message || "Failed to fetch models.",
          });
          return;
        }

        const list = Array.isArray(data.models) ? data.models : [];
        setModels(list);
        setFetchState({
          status: "ok",
          count: list.length,
          message:
            list.length > 0
              ? `Loaded ${list.length} models${opts?.test ? " · connection OK" : ""}.`
              : opts?.test
                ? "Connection OK, but model list is empty — type model ids manually."
                : "No models returned — type model ids manually.",
        });

        // Auto-pick defaults if empty
        setDraft((prev) => {
          if (list.length === 0) return prev;
          const next = { ...prev };
          if (!next.pass1Model) next.pass1Model = list[0];
          if (!next.pass2Model) {
            next.pass2Model = list[Math.min(1, list.length - 1)] || list[0];
          }
          // Keep selection if still valid; otherwise leave as-is (user typed)
          return next;
        });
      } catch {
        setModels([]);
        setFetchState({
          status: "error",
          message: "Could not reach BreakItFirst API (/api/models).",
        });
      }
    },
    [draft.baseUrl, draft.apiKey, draft.pass1Model, draft.pass2Model],
  );

  // Auto-fetch when base URL + key settle (debounced), only while modal open
  useEffect(() => {
    if (!open) return;
    if (!draft.baseUrl.trim()) return;

    const timer = window.setTimeout(() => {
      void fetchModels({ test: false });
    }, 600);

    return () => window.clearTimeout(timer);
    // Intentionally only when credentials change, not on every model pick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft.baseUrl, draft.apiKey]);

  if (!open) return null;

  const ready = isProviderConfigured(draft);

  function applyPreset(id: string) {
    const preset = PROVIDER_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setActivePreset(id);
    setModels([]);
    setFetchState({ status: "idle" });
    if (id === "custom") {
      setDraft((prev) => ({
        ...prev,
        baseUrl: prev.baseUrl || "",
      }));
      return;
    }
    setDraft((prev) => ({
      ...prev,
      baseUrl: preset.baseUrl,
      // keep key; clear models so auto-fetch repicks for new provider
      pass1Model: "",
      pass2Model: "",
    }));
  }

  function handleSave() {
    saveProviderSettings(draft);
    onSave(draft);
    onClose();
  }

  function handleClear() {
    clearProviderSettings();
    const reset = { ...DEFAULT_PROVIDER_SETTINGS };
    setDraft(reset);
    setModels([]);
    setFetchState({ status: "idle" });
    onSave(reset);
  }

  function selectModel(which: "pass1Model" | "pass2Model", id: string) {
    setDraft((prev) => ({ ...prev, [which]: id }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-settings-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="provider-settings-title"
              className="text-base font-semibold text-text"
            >
              AI Provider
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              BYOK · models auto-load from{" "}
              <code className="text-text-muted">/v1/models</code>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <Label>Preset</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    activePreset === preset.id
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-border bg-background text-text-secondary hover:text-text",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={draft.baseUrl}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, baseUrl: e.target.value }))
              }
              placeholder="https://api.openai.com/v1"
              autoComplete="off"
            />
            <p className="mt-1.5 text-[11px] text-text-muted">
              Root URL only (…/v1). Works with OpenAI, OpenRouter, Ollama, vLLM,
              LiteLLM, etc.
            </p>
          </div>

          <div>
            <Label htmlFor="apiKey">API key (optional for local)</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                value={draft.apiKey}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                placeholder="sk-… or leave empty for Ollama"
                autoComplete="off"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-secondary hover:text-text"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchModels({ test: false })}
              disabled={fetchState.status === "loading" || !draft.baseUrl.trim()}
            >
              {fetchState.status === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Fetch models
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchModels({ test: true })}
              disabled={fetchState.status === "loading" || !draft.baseUrl.trim()}
            >
              <Zap className="h-3.5 w-3.5" />
              Test connection
            </Button>
          </div>

          {fetchState.status === "ok" && (
            <p className="text-xs text-healthy">{fetchState.message}</p>
          )}
          {fetchState.status === "error" && (
            <p className="text-xs leading-relaxed text-accent">
              {fetchState.message}
            </p>
          )}
          {fetchState.status === "loading" && (
            <p className="text-xs text-text-muted">Talking to provider…</p>
          )}

          {models.length > 0 && (
            <div>
              <Label htmlFor="modelFilter">Available models</Label>
              <Input
                id="modelFilter"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                placeholder="Filter models…"
                className="mt-1.5"
              />
              <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-border bg-background/60 p-1.5">
                {filteredModels.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-text-muted">
                    No models match filter.
                  </p>
                ) : (
                  filteredModels.map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-surface"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-xs text-text-secondary hover:text-text"
                        title={id}
                        onClick={() => selectModel("pass1Model", id)}
                      >
                        {id}
                      </button>
                      <button
                        type="button"
                        className="shrink-0 rounded-md border border-border px-1.5 py-1 text-[10px] text-text-muted hover:border-accent/40 hover:text-accent"
                        onClick={() => selectModel("pass1Model", id)}
                        title="Use for Pass 1"
                      >
                        P1
                      </button>
                      <button
                        type="button"
                        className="shrink-0 rounded-md border border-border px-1.5 py-1 text-[10px] text-text-muted hover:border-accent/40 hover:text-accent"
                        onClick={() => selectModel("pass2Model", id)}
                        title="Use for Pass 2"
                      >
                        P2
                      </button>
                    </div>
                  ))
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-text-muted">
                Click a model or use P1 / P2 shortcuts.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pass1Model">Pass 1 model (reasoning)</Label>
              <Input
                id="pass1Model"
                value={draft.pass1Model}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, pass1Model: e.target.value }))
                }
                list="model-suggestions"
                placeholder="select or type model id"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="pass2Model">Pass 2 model (structuring)</Label>
              <Input
                id="pass2Model"
                value={draft.pass2Model}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, pass2Model: e.target.value }))
                }
                list="model-suggestions"
                placeholder="select or type model id"
                autoComplete="off"
              />
            </div>
          </div>
          <datalist id="model-suggestions">
            {models.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>

          <div className="rounded-xl border border-border bg-background/60 px-3.5 py-3 text-xs leading-relaxed text-text-secondary">
            Key is stored only in this browser. On analyze, it is proxied once
            through BreakItFirst to your provider — never written to a database.
            API key can be empty for local Ollama.
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!ready}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
