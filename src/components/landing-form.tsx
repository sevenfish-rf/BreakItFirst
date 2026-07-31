"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   Intentional: draft + active-job are restored from localStorage after mount,
   and the status-watch effect drives loading/stage UI state. */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnalyzingOverlay } from "@/components/analyzing-overlay";
import { ReportHistory } from "@/components/report-history";
import {
  CATEGORIES,
  MIN_IDEA_LENGTH,
  type Category,
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
import { detectInputDamage } from "@/lib/input-damage";
import type { ProviderSettings } from "@/lib/provider-settings";
import { useLanguage } from "@/lib/i18n/context";
import type { PipelineLiveStage } from "@/lib/pipeline-stages";
import type { FailureAnalysis } from "@/types/analysis";
import type { SavedReport } from "@/lib/report-storage";

type LandingFormProps = {
  providerReady: boolean;
  provider: ProviderSettings;
  onNeedProvider: () => void;
  onSuccess: (analysis: FailureAnalysis, warnings?: string[]) => void;
  onOpenHistoryReport?: (report: SavedReport) => void;
  historyRefreshKey?: number;
};

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
  onOpenHistoryReport,
  historyRefreshKey = 0,
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
  /** Review note is advisory — once dismissed it stays dismissed for this draft. */
  const [reviewDismissed, setReviewDismissed] = useState(false);

  const ideaRef = useRef<HTMLTextAreaElement | null>(null);
  /** Aborts only the status poll loop — never cancels the server job. */
  const watchAbortRef = useRef<AbortController | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const userCancelledRef = useRef(false);
  /** Prevent double POST (Strict Mode / double-click). */
  const startingRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const localeRef = useRef(locale);
  const tRef = useRef(t);
  // Keep "latest" refs fresh without touching them during render.
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    localeRef.current = locale;
    tRef.current = t;
  });

  const finishFromResult = useCallback(
    (result: AnalyzeResult) => {
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
          if (result.code === "stream_disconnected") {
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

      watchAbortRef.current?.abort();
      const controller = new AbortController();
      watchAbortRef.current = controller;

      setLoading(true);
      setError(null);
      setLiveStage((s) => s ?? "ingest");

      const result = await watchAnalysisJob({
        jobId,
        locale: localeRef.current,
        signal: controller.signal,
        onStage: (p) => {
          if (watchAbortRef.current !== controller) return;
          setLiveStage(p.stage);
          setLiveDetail(p.detail ?? null);
        },
      });

      if (watchAbortRef.current !== controller) {
        return;
      }

      if (!result.ok && result.code === "stream_disconnected") {
        return;
      }

      finishFromResult(result);
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
      }
      activeJobIdRef.current = active.jobId;
    } else if (draft?.idea.trim()) {
      setLoadedHint(tRef.current.form.draftRestored);
    }

    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;

    const active = loadActiveJob();
    if (!active?.jobId) return;

    let cancelled = false;

    setLoading(true);
    setLiveStage((s) => s ?? "ingest");
    activeJobIdRef.current = active.jobId;

    void (async () => {
      if (cancelled) return;
      await attachWatch(active.jobId);
    })();

    return () => {
      cancelled = true;
      watchAbortRef.current?.abort();
    };
  }, [draftHydrated, attachWatch]);

  useEffect(() => {
    if (!draftHydrated) return;
    const id = window.setTimeout(() => {
      saveFormDraft({ idea, category, deepAnalysis, activeChip });
    }, 350);
    return () => window.clearTimeout(id);
  }, [idea, category, deepAnalysis, activeChip, draftHydrated]);

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

  /**
   * K8 mitigation — advisory only. Recomputed on edit (pure regex scan over at
   * most 8000 chars), shown below the textarea, and it never gates submit.
   */
  const damage = useMemo(() => detectInputDamage(idea), [idea]);
  const showReview =
    !reviewDismissed && !loading && !tooShort && damage.suspect;

  const helper = useMemo(() => {
    if (tooShort) {
      return t.form.tooShort(MIN_IDEA_LENGTH - charCount);
    }
    return t.form.helper;
  }, [charCount, tooShort, t]);

  function handleClearDraft() {
    setIdea("");
    setCategory("Startup");
    setDeepAnalysis(false);
    setActiveChip(null);
    setLoadedHint(null);
    setError(null);
    setReviewDismissed(false);
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

    const input = validateAnalyzeInput({ idea, category }, { verbose: true });
    if (!input.ok) {
      setError(input.message);
      return;
    }

    if (!providerReady) {
      onNeedProvider();
      setError(t.form.needProvider);
      return;
    }

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

      activeJobIdRef.current = started.jobId;
      saveActiveJob({
        jobId: started.jobId,
        startedAt: new Date().toISOString(),
        idea: input.idea,
        category: input.category,
        deepAnalysis,
      });

      await attachWatch(started.jobId);
    } finally {
      startingRef.current = false;
    }
  }

  const showClear = charCount > 0 || category !== "Startup" || deepAnalysis;

  return (
    <form onSubmit={handleSubmit} style={{ position: "relative" }}>
      <div className="console">
        <div className="console-head">
          <span className="label">{t.form.ideaLabel}</span>
          {loadedHint ? (
            <span className="sample-note">{loadedHint}</span>
          ) : null}
        </div>

        <label htmlFor="idea" className="visually-hidden">
          {t.form.ideaLabel}
        </label>
        <textarea
          id="idea"
          ref={ideaRef}
          spellCheck={false}
          value={idea}
          onChange={(e) => {
            setIdea(e.target.value);
            setActiveChip(null);
            setLoadedHint(null);
            setError(null);
          }}
          placeholder={t.form.ideaPlaceholder}
          disabled={loading}
        />

        {error ? (
          <div className="console-note">
            <span className="msg err">
              {error}
              {shouldShowProviderTip(error) ? ` — ${t.form.tipProvider}` : ""}
            </span>
          </div>
        ) : (
          <div className="console-note">
            <span
              className={
                "msg" +
                (tooShort ? " warn" : loadedHint ? " ok" : "")
              }
            >
              {loadedHint ?? helper}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              {showClear ? (
                <button
                  type="button"
                  className="link-btn"
                  disabled={loading}
                  onClick={handleClearDraft}
                >
                  {t.form.clearDraft}
                </button>
              ) : null}
              <span className="count">
                {charCount} {t.form.chars}
              </span>
            </span>
          </div>
        )}

        {showReview ? (
          <div className="input-review" role="status">
            <div className="input-review-head">
              <strong>{t.form.review.title}</strong>
              <button
                type="button"
                className="link-btn"
                onClick={() => setReviewDismissed(true)}
              >
                {t.form.review.dismiss}
              </button>
            </div>
            <p className="input-review-lead">{t.form.review.lead}</p>
            <ul className="input-review-list">
              {damage.findings.map((f) => (
                <li key={f.kind} className={f.severity}>
                  <span className="what">{t.form.review.kinds[f.kind]}</span>{" "}
                  <span className="where">
                    ({t.form.review.times(f.count)}
                    {f.samples[0]
                      ? `, ${t.form.review.at(f.samples[0].line)}`
                      : ""}
                    )
                  </span>
                  {f.samples.length ? (
                    <code>{f.samples[0].excerpt}</code>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="input-review-limit">{t.form.review.limit}</p>
          </div>
        ) : null}

        <div className="console-foot">
          <div className="field">
            <span className="label" id="catLabel">
              {t.form.categoryLabel}
            </span>
            <div className="select-wrap">
              <select
                aria-labelledby="catLabel"
                value={category}
                disabled={loading}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3.5 5 6.5 8 3.5" />
              </svg>
            </div>
          </div>

          <div className="field deep-field">
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={deepAnalysis}
              aria-labelledby="deepLabel"
              disabled={loading}
              onClick={() => setDeepAnalysis((v) => !v)}
            />
            <span
              className="deep-label"
              id="deepLabel"
              onClick={() => !loading && setDeepAnalysis((v) => !v)}
            >
              {t.form.deepLabel}
              <small>{t.form.deepHint}</small>
            </span>
          </div>

          <div className="push" />

          <button
            type="submit"
            className={"analyze-btn" + (loading ? " running" : "")}
            disabled={loading}
          >
            <span className="spinner" aria-hidden="true" />
            <span className="btn-label">
              {loading ? t.form.analyzing : t.form.cta}
            </span>
            <svg className="arr" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" />
            </svg>
          </button>
        </div>
      </div>

      {onOpenHistoryReport ? (
        <ReportHistory refreshKey={historyRefreshKey} onOpen={onOpenHistoryReport} />
      ) : null}

      {loading ? (
        <AnalyzingOverlay
          open={loading}
          liveStage={liveStage}
          liveDetail={liveDetail}
          onCancel={handleCancel}
        />
      ) : null}
    </form>
  );
}
