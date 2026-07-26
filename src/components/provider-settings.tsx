"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   Intentional: the draft form state resets to `initial` when the modal opens. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, RefreshCw, X, Zap } from "lucide-react";
import {
  DEFAULT_PROVIDER_SETTINGS,
  PROVIDER_PRESETS,
  type ProviderSettings,
  isProviderConfigured,
  saveProviderSettings,
  clearProviderSettings,
} from "@/lib/provider-settings";
import { getOrCreateSessionId } from "@/lib/session";

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
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-settings-title"
        className="modal-card"
      >
        <div className="modal-head">
          <div>
            <h2 id="provider-settings-title" className="modal-title">
              AI Provider
            </h2>
            <p className="label" style={{ marginTop: 6 }}>
              BYOK · models auto-load from{" "}
              <code className="mono">/v1/models</code>
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        <div className="modal-body">
          <div className="ed-field">
            <span className="label">Preset</span>
            <div className="preset-row">
              {PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={activePreset === preset.id ? "preset on" : "preset"}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ed-field">
            <label className="label" htmlFor="baseUrl">
              Base URL
            </label>
            <input
              id="baseUrl"
              className="ed-input"
              value={draft.baseUrl}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, baseUrl: e.target.value }))
              }
              placeholder="https://api.openai.com/v1"
              autoComplete="off"
            />
            <p style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
              Root URL only (…/v1). Works with OpenAI, OpenRouter, Ollama, vLLM,
              LiteLLM, etc.
            </p>
          </div>

          <div className="ed-field">
            <label className="label" htmlFor="apiKey">
              API key (optional for local)
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="apiKey"
                className="ed-input"
                type={showKey ? "text" : "password"}
                value={draft.apiKey}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                placeholder="sk-… or leave empty for Ollama"
                autoComplete="off"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  border: "none",
                  borderRadius: 7,
                  background: "transparent",
                  color: "var(--ink-3)",
                  cursor: "pointer",
                }}
              >
                {showKey ? (
                  <EyeOff size={15} strokeWidth={1.75} />
                ) : (
                  <Eye size={15} strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void fetchModels({ test: false })}
              disabled={fetchState.status === "loading" || !draft.baseUrl.trim()}
              style={
                fetchState.status === "loading" || !draft.baseUrl.trim()
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : undefined
              }
            >
              {fetchState.status === "loading" ? (
                <Loader2
                  size={13}
                  strokeWidth={1.75}
                  style={{ animation: "spin .7s linear infinite" }}
                />
              ) : (
                <RefreshCw size={13} strokeWidth={1.75} />
              )}
              Fetch models
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void fetchModels({ test: true })}
              disabled={fetchState.status === "loading" || !draft.baseUrl.trim()}
              style={
                fetchState.status === "loading" || !draft.baseUrl.trim()
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : undefined
              }
            >
              <Zap size={13} strokeWidth={1.75} />
              Test connection
            </button>
          </div>

          {fetchState.status === "ok" && (
            <p style={{ fontSize: 12.5, color: "var(--calm)" }}>
              {fetchState.message}
            </p>
          )}
          {fetchState.status === "error" && (
            <p
              style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--signal)" }}
            >
              {fetchState.message}
            </p>
          )}
          {fetchState.status === "loading" && (
            <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
              Talking to provider…
            </p>
          )}

          {models.length > 0 && (
            <div className="ed-field">
              <label className="label" htmlFor="modelFilter">
                Available models
              </label>
              <input
                id="modelFilter"
                className="ed-input"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                placeholder="Filter models…"
              />
              <div
                style={{
                  maxHeight: 148,
                  overflowY: "auto",
                  border: "1px solid var(--hair)",
                  borderRadius: 10,
                  background: "var(--bg-inset)",
                }}
              >
                {filteredModels.length === 0 ? (
                  <p
                    style={{
                      padding: "12px 13px",
                      fontSize: 12,
                      fontStyle: "italic",
                      color: "var(--ink-3)",
                    }}
                  >
                    No models match filter.
                  </p>
                ) : (
                  filteredModels.map((id, i) => (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "2px 8px 2px 4px",
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--hair-soft)",
                      }}
                    >
                      <button
                        type="button"
                        className="mono"
                        title={id}
                        onClick={() => selectModel("pass1Model", id)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textAlign: "left",
                          padding: "8px 9px",
                          border: "none",
                          background: "transparent",
                          color: "var(--ink-2)",
                          cursor: "pointer",
                        }}
                      >
                        {id}
                      </button>
                      <button
                        type="button"
                        className="mono"
                        onClick={() => selectModel("pass1Model", id)}
                        title="Use for Pass 1"
                        style={{
                          flex: "none",
                          fontSize: 10,
                          letterSpacing: ".08em",
                          padding: "3px 7px",
                          border: "1px solid var(--hair)",
                          borderRadius: 6,
                          background: "var(--bg-raised)",
                          color: "var(--ink-3)",
                          cursor: "pointer",
                        }}
                      >
                        P1
                      </button>
                      <button
                        type="button"
                        className="mono"
                        onClick={() => selectModel("pass2Model", id)}
                        title="Use for Pass 2"
                        style={{
                          flex: "none",
                          fontSize: 10,
                          letterSpacing: ".08em",
                          padding: "3px 7px",
                          border: "1px solid var(--hair)",
                          borderRadius: 6,
                          background: "var(--bg-raised)",
                          color: "var(--ink-3)",
                          cursor: "pointer",
                        }}
                      >
                        P2
                      </button>
                    </div>
                  ))
                )}
              </div>
              <p style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                Click a model or use P1 / P2 shortcuts.
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <div className="ed-field">
              <label className="label" htmlFor="pass1Model">
                Pass 1 model (reasoning)
              </label>
              <input
                id="pass1Model"
                className="ed-input mono"
                value={draft.pass1Model}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, pass1Model: e.target.value }))
                }
                list="model-suggestions"
                placeholder="select or type model id"
                autoComplete="off"
              />
            </div>
            <div className="ed-field">
              <label className="label" htmlFor="pass2Model">
                Pass 2 model (structuring)
              </label>
              <input
                id="pass2Model"
                className="ed-input mono"
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

          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.65,
              color: "var(--ink-2)",
              fontStyle: "italic",
              fontFamily: "var(--serif)",
              borderTop: "1px solid var(--hair-soft)",
              paddingTop: 14,
            }}
          >
            Key is stored only in this browser. On analyze, it is proxied once
            through BreakItFirst to your provider — never written to a database.
            API key can be empty for local Ollama.
          </p>
        </div>

        <div className="modal-foot">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleClear}
            style={{ marginRight: "auto" }}
          >
            Clear
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-solid"
            onClick={handleSave}
            disabled={!ready}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
