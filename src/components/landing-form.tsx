"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { AnalyzingOverlay } from "@/components/analyzing-overlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CATEGORIES,
  EXAMPLE_CHIPS,
  MIN_IDEA_LENGTH,
  type Category,
  type ExampleChip,
} from "@/lib/categories";
import {
  cancelAnalysisJob,
  startAnalysisJob,
  watchAnalysisJob,
  type AnalyzeResult,
} from "@/lib/analyze-client";
import {
  clearActiveJob,
  clearFormDraft,
  loadActiveJob,
  loadFormDraft,
  saveActiveJob,
  saveFormDraft,
} from "@/lib/draft";
import { validateAnalyzeInput } from "@/lib/input-validation";
import type { ProviderSettings } from "@/lib/provider-settings";
import { useLanguage } from "@/lib/i18n/context";
import type { PipelineLiveStage } from "@/lib/pipeline-stages";
import type { FailureAnalysis } from "@/types/analysis";
import { cn } from "@/lib/utils";

type LandingFormProps = {
  providerReady: boolean;
  provider: ProviderSettings;
  onNeedProvider: () => void;
  onSuccess: (analysis: FailureAnalysis, warnings?: string[]) => void;
};

function ideaTextForLocale(chip: ExampleChip, locale: string): string {
  if (locale === "id") {
    return (chip.ideaId || chip.ideaEn || "").trim();
  }
  return (chip.ideaEn || chip.ideaId || "").trim();
}

function shouldShowProviderTip(message: string): boolean {
  return /provider|model id|base url|api key|connection|network|backend|timeout|fetch models|pass 1|pass 2|mimo|openai/i.test(
    message,
  );
}

export function LandingForm({
  providerReady,
  provider,
  onNeedProvider,
  onSuccess,
}: LandingFormProps) {
  const { locale, t } = useLanguage();
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState<Category>("Startup");
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveStage, setLiveStage] = useState<PipelineLiveStage | null>(null);
  const [liveDetail, setLiveDetail] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [loadedHint, setLoadedHint] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const ideaRef = useRef<HTMLTextAreaElement | null>(null);
  /** Aborts only the status poll loop — never cancels the server job. */
  const watchAbortRef = useRef<AbortController | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const userCancelledRef = useRef(false);
  /** Prevent double POST (Strict Mode / double-click). */
  const startingRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const tRef = useRef(t);
  tRef.current = t;

  const finishFromResult = useCallback(
    (result: AnalyzeResult, _jobId: string) => {
      if (userCancelledRef.current) {
        clearActiveJob();
        activeJobIdRef.current = null;
        setLoading(false);
        setLiveStage(null);
        setLiveDetail(null);
        setError(tRef.current.form.cancelled);
        return;
      }

      if (!result.ok) {
        if (
          result.code === "cancelled" ||
          result.code === "stream_disconnected"
        ) {
          // stream_disconnected = tab refresh; keep job for resume on next mount
          if (result.code === "stream_disconnected") {
            // Keep loading true only if still mounted with active job —
            // usually component is unmounting. If still here, stay in loading
            // and let effect reconnect.
            return;
          }
          clearActiveJob();
          activeJobIdRef.current = null;
          setLoading(false);
          setLiveStage(null);
          setLiveDetail(null);
          setError(tRef.current.form.cancelled);
          return;
        }
        if (
          result.code === "job_not_found" ||
          result.code === "job_orphaned"
        ) {
          clearActiveJob();
          activeJobIdRef.current = null;
          setLoading(false);
          setLiveStage(null);
          setLiveDetail(null);
          setError(
            result.code === "job_orphaned" && result.message
              ? result.message
              : localeRef.current === "id"
                ? "Sesi analisis hilang (server reload). Ide masih di form — klik Analyze lagi."
                : "Analysis session was lost (server reload). Your idea is still in the form — click Analyze again.",
          );
          return;
        }
        if (result.code === "rate_limited" && result.retryAfterSec) {
          setError(tRef.current.errors.rateLimited(result.retryAfterSec));
        } else {
          setError(result.message || tRef.current.errors.failed);
        }
        clearActiveJob();
        activeJobIdRef.current = null;
        setLoading(false);
        setLiveStage(null);
        setLiveDetail(null);
        return;
      }

      clearActiveJob();
      activeJobIdRef.current = null;
      setLoading(false);
      setLiveStage(null);
      setLiveDetail(null);
      onSuccessRef.current(result.analysis, result.warnings);
    },
    [],
  );

  const attachWatch = useCallback(
    async (jobId: string) => {
      activeJobIdRef.current = jobId;

      // Cancel previous poll loop only
      watchAbortRef.current?.abort();
      const controller = new AbortController();
      watchAbortRef.current = controller;

      // Overlay ON immediately
      setLoading(true);
      setError(null);
      setLiveStage((s) => s ?? "ingest");

      const result = await watchAnalysisJob({
        jobId,
        locale: localeRef.current,
        signal: controller.signal,
        onStage: (p) => {
          // Always apply if this is still the active controller
          if (watchAbortRef.current !== controller) return;
          setLiveStage(p.stage);
          setLiveDetail(p.detail ?? null);
        },
      });

      // Superseded by a newer watch
      if (watchAbortRef.current !== controller) {
        return;
      }

      if (!result.ok && result.code === "stream_disconnected") {
        // Refresh/unmount — do not clear active job; next mount resumes
        return;
      }

      finishFromResult(result, jobId);
    },
    [finishFromResult],
  );

  // ── Restore draft + IMMEDIATELY reopen analyzer if job active ────────
  useLayoutEffect(() => {
    const draft = loadFormDraft();
    if (draft) {
      setIdea(draft.idea);
      setCategory(draft.category);
      setDeepAnalysis(draft.deepAnalysis);
      if (draft.activeChip) setActiveChip(draft.activeChip);
    }

    const active = loadActiveJob();
    if (active?.jobId) {
      // Paint analyzer overlay before first paint if possible
      setLoading(true);
      setLiveStage("ingest");
      setLoadedHint(
        localeRef.current === "id"
          ? "Menyambung ulang ke analisis yang sedang berjalan…"
          : "Reconnecting to your running analysis…",
      );
      if (!draft?.idea.trim() && active.idea) {
        setIdea(active.idea);
        setCategory(active.category);
        setDeepAnalysis(active.deepAnalysis);
      } else if (draft?.idea.trim()) {
        setLoadedHint(
          localeRef.current === "id"
            ? "Menyambung ulang ke analisis yang sedang berjalan…"
            : "Reconnecting to your running analysis…",
        );
      }
      activeJobIdRef.current = active.jobId;
    } else if (draft?.idea.trim()) {
      setLoadedHint(tRef.current.form.draftRestored);
    }

    setDraftHydrated(true);
  }, []);

  // Start/resume status watch for active job (re-runs cleanly after Strict Mode)
  useEffect(() => {
    if (!draftHydrated) return;

    const active = loadActiveJob();
    if (!active?.jobId) return;

    let cancelled = false;

    // Ensure overlay is showing
    setLoading(true);
    setLiveStage((s) => s ?? "ingest");
    activeJobIdRef.current = active.jobId;

    void (async () => {
      if (cancelled) return;
      await attachWatch(active.jobId);
    })();

    return () => {
      cancelled = true;
      // Only abort status stream — server job keeps running
      watchAbortRef.current?.abort();
    };
  }, [draftHydrated, attachWatch]);

  // Persist draft
  useEffect(() => {
    if (!draftHydrated) return;
    const id = window.setTimeout(() => {
      saveFormDraft({ idea, category, deepAnalysis, activeChip });
    }, 350);
    return () => window.clearTimeout(id);
  }, [idea, category, deepAnalysis, activeChip, draftHydrated]);

  // Soft browser warning while analyzing
  useEffect(() => {
    if (!loading) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [loading]);

  const charCount = idea.trim().length;
  const tooShort = charCount > 0 && charCount < MIN_IDEA_LENGTH;

  const helper = useMemo(() => {
    if (tooShort) {
      return t.form.tooShort(MIN_IDEA_LENGTH - charCount);
    }
    return t.form.helper;
  }, [charCount, tooShort, t]);

  function applyChip(chip: ExampleChip) {
    const text = ideaTextForLocale(chip, locale);
    if (!text) {
      setError(
        locale === "id"
          ? "Template ini kosong — coba template lain."
          : "This template has no text — try another.",
      );
      return;
    }
    setIdea(text);
    setCategory(chip.category);
    setActiveChip(chip.label);
    setError(null);
    setLoadedHint(
      locale === "id"
        ? `Template “${chip.label}” dimuat · ${text.length} karakter · ${chip.category}`
        : `Loaded “${chip.label}” · ${text.length} chars · ${chip.category}`,
    );
    requestAnimationFrame(() => {
      const el = ideaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(0, 0);
      el.scrollTop = 0;
    });
  }

  function handleClearDraft() {
    setIdea("");
    setCategory("Startup");
    setDeepAnalysis(false);
    setActiveChip(null);
    setLoadedHint(null);
    setError(null);
    clearFormDraft();
  }

  async function handleCancel() {
    userCancelledRef.current = true;
    const jobId = activeJobIdRef.current ?? loadActiveJob()?.jobId ?? null;
    watchAbortRef.current?.abort();
    if (jobId) {
      await cancelAnalysisJob(jobId);
    }
    clearActiveJob();
    activeJobIdRef.current = null;
    setLoading(false);
    setLiveStage(null);
    setLiveDetail(null);
    setError(t.form.cancelled);
    userCancelledRef.current = false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    userCancelledRef.current = false;

    const input = validateAnalyzeInput(
      { idea, category },
      { verbose: true },
    );
    if (!input.ok) {
      setError(input.message);
      return;
    }

    if (!providerReady) {
      onNeedProvider();
      setError(t.form.needProvider);
      return;
    }

    // Already running → reconnect only (no second API job)
    const existing = loadActiveJob();
    if (existing?.jobId) {
      setLoadedHint(
        locale === "id"
          ? "Analisis masih berjalan — menyambung ulang (tanpa call API baru)."
          : "Analysis still running — reconnecting (no new API call).",
      );
      await attachWatch(existing.jobId);
      return;
    }

    if (startingRef.current || loading) {
      return;
    }
    startingRef.current = true;

    saveFormDraft({
      idea: input.idea,
      category: input.category,
      deepAnalysis,
      activeChip,
    });

    setLoading(true);
    setLiveStage("ingest");
    setLiveDetail(null);
    setLoadedHint(null);

    try {
      // 1) Start job (rate limit + provider work begins here)
      const started = await startAnalysisJob({
        idea: input.idea,
        category: input.category,
        provider,
        locale,
        deepAnalysis,
      });

      if (!started.ok) {
        setLoading(false);
        setLiveStage(null);
        if (started.code === "rate_limited" && started.retryAfterSec) {
          setError(t.errors.rateLimited(started.retryAfterSec));
        } else {
          setError(started.message || t.errors.failed);
        }
        return;
      }

      // 2) Persist jobId BEFORE watching — critical for refresh resume
      activeJobIdRef.current = started.jobId;
      saveActiveJob({
        jobId: started.jobId,
        startedAt: new Date().toISOString(),
        idea: input.idea,
        category: input.category,
        deepAnalysis,
      });

      // 3) Poll status snapshot every ~1.2s (reliable stage % / labels)
      await attachWatch(started.jobId);
    } finally {
      startingRef.current = false;
    }
  }

  return (
    <div className="relative -m-6 min-h-[28rem] sm:-m-8">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full space-y-6 p-6 sm:p-8",
          loading && "pointer-events-none select-none opacity-0",
        )}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="idea">{t.form.ideaLabel}</Label>
            {charCount > 0 || category !== "Startup" || deepAnalysis ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleClearDraft}
                className="text-[11px] text-text-muted underline-offset-2 hover:text-text-secondary hover:underline"
              >
                {t.form.clearDraft}
              </button>
            ) : null}
          </div>
          <Textarea
            id="idea"
            ref={ideaRef}
            value={idea}
            onChange={(e) => {
              setIdea(e.target.value);
              setActiveChip(null);
              setLoadedHint(null);
              setError(null);
            }}
            placeholder={t.form.ideaPlaceholder}
            className="mt-1.5 min-h-[180px]"
            disabled={loading}
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
            <p
              className={cn(
                tooShort
                  ? "text-warning"
                  : loadedHint
                    ? "text-healthy"
                    : "text-text-muted",
              )}
            >
              {loadedHint ?? helper}
            </p>
            <p
              className={cn(
                "shrink-0 tabular-nums",
                charCount >= MIN_IDEA_LENGTH
                  ? "text-text-secondary"
                  : "text-text-muted",
              )}
            >
              {charCount} {t.form.chars}
            </p>
          </div>
        </div>

        <div>
          <Label>{t.form.categoryLabel}</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <motion.button
                  key={cat}
                  type="button"
                  disabled={loading}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    selected
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-border bg-background/50 text-text-secondary hover:border-border-strong hover:text-text",
                  )}
                >
                  {cat}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-text-muted">{t.form.examplesLabel}</p>
            <p className="text-[10px] tabular-nums text-text-muted/80">
              {EXAMPLE_CHIPS.length} templates
            </p>
          </div>
          <div className="max-h-[7.5rem] overflow-y-auto rounded-xl border border-border/50 bg-background/20 p-2 no-scrollbar">
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_CHIPS.map((chip) => {
                const selected = activeChip === chip.label;
                return (
                  <motion.button
                    key={chip.label}
                    type="button"
                    disabled={loading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    title={`${chip.category} · click to fill idea`}
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      applyChip(chip);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      selected
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-dashed border-border bg-background/40 text-text-secondary hover:border-accent/40 hover:text-text",
                    )}
                  >
                    {selected ? (
                      <Check className="h-3 w-3 shrink-0" strokeWidth={3} />
                    ) : null}
                    {chip.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-background/40 px-3.5 py-3 transition-colors hover:border-accent/30">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border accent-[var(--accent,#FF6B6B)]"
            checked={deepAnalysis}
            disabled={loading}
            onChange={(e) => setDeepAnalysis(e.target.checked)}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-text">
              {t.form.deepLabel}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-text-muted">
              {t.form.deepHint}
            </span>
          </span>
        </label>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-3 text-sm text-accent"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="break-words leading-relaxed">{error}</p>
              {shouldShowProviderTip(error) ? (
                <p className="text-[11px] text-accent/80">{t.form.tipProvider}</p>
              ) : charCount === 0 ? (
                <p className="text-[11px] text-accent/80">
                  {locale === "id"
                    ? "Tip: klik salah satu template di atas — teks ide harus muncul di kotak."
                    : "Tip: click a template above — the idea box should fill with text."}
                </p>
              ) : null}
            </div>
          </motion.div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto sm:min-w-[220px]"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.form.analyzing}
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              {t.form.cta}
            </>
          )}
        </Button>
      </form>

      <AnimatePresence>
        {loading && (
          <div
            className="absolute inset-0 z-20 overflow-hidden"
            style={{ borderRadius: 28 }}
          >
            <AnalyzingOverlay
              open={loading}
              liveStage={liveStage}
              liveDetail={liveDetail}
              onCancel={handleCancel}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
