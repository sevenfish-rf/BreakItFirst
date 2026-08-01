"use client";

/**
 * S6/N6 — one question under the hinge, three answers, one click.
 *
 * This is the only place in the product where the user's judgement comes back
 * to us. Dogfood N6 named the three answers and what each one means, and they
 * are not symmetric — that asymmetry IS the measurement:
 *
 *   Ya (confirmed)         → the hinge was load-bearing and not already known
 *   Bukan yang ini         → K1 evidence: the engine picked the wrong hinge
 *   Sudah saya tahu        → E2 failure: true, but the user was already there,
 *                            which is the failure mode a premortem tool most
 *                            easily hides behind ("technically correct")
 *
 * Why it can exist without an account: no idea text leaves the browser. The two
 * hashes are computed here, client-side (`hashFeedbackText`), and the POST body
 * is `{verdict, spof_hash, idea_hash, locale, mode, category}` plus — only if
 * the user typed one — a short correction. See `src/lib/feedback-event.ts` for
 * what those hashes do and do not protect.
 *
 * The correction field appears only after "bukan yang ini", because that is the
 * only verdict where "then what?" is a real question. Sending it re-POSTs the
 * same verdict with the text attached; the log is append-only, so the reader
 * (`eval/read-feedback.ts`) dedupes per (idea_hash, spof_hash, verdict) and
 * keeps the richer record.
 *
 * Layout: the asymmetry above is the reason each answer carries a one-line hint
 * and its own hover/focus colour (calm / signal / amber) — three identical chips
 * made the three answers look interchangeable, which they are not. The panel is
 * the report's only interactive ask, so it is framed like `.cand-row`, and the
 * privacy line sits below a hairline as a footnote rather than as a second
 * sentence competing with the question.
 */

import { useState } from "react";

import {
  ALT_HINGE_MAX_CHARS,
  hashFeedbackText,
  type FeedbackSubmission,
  type FeedbackVerdict,
} from "@/lib/feedback-event";
import { useLanguage } from "@/lib/i18n/context";
import type { FailureAnalysis } from "@/types/analysis";

type Props = { analysis: FailureAnalysis };

type Phase = "idle" | "sending" | "sent" | "failed";

const VERDICT_ORDER: FeedbackVerdict[] = ["confirmed", "wrong_hinge", "already_knew"];

export function SpofFeedback({ analysis }: Props) {
  const { t, locale: uiLocale } = useLanguage();
  const copy = t.report.feedback;

  const [phase, setPhase] = useState<Phase>("idle");
  const [chosen, setChosen] = useState<FeedbackVerdict | null>(null);
  const [altHinge, setAltHinge] = useState("");
  const [altSent, setAltSent] = useState(false);

  /**
   * The locale/mode of the RUN, not of the UI right now — these are the two
   * knobs the locale-flip work (Q16) showed can move bands, so a verdict is
   * only comparable when it says which run produced the hinge it judged.
   */
  const runLocale = analysis.meta.run?.locale ?? uiLocale;
  const runMode = analysis.meta.run?.mode ?? "standard";

  async function send(verdict: FeedbackVerdict, correction?: string) {
    const [ideaHash, spofHash] = await Promise.all([
      hashFeedbackText(analysis.meta.idea_input),
      hashFeedbackText(analysis.single_point_of_failure.component),
    ]);

    const payload: FeedbackSubmission = {
      verdict,
      idea_hash: ideaHash,
      spof_hash: spofHash,
      locale: runLocale,
      mode: runMode,
      category: analysis.meta.category || null,
      alt_hinge: null,
    };
    if (correction && correction.trim().length > 0) {
      payload.alt_hinge = correction.trim().slice(0, ALT_HINGE_MAX_CHARS);
    }

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`feedback ${res.status}`);
  }

  async function onVote(verdict: FeedbackVerdict) {
    if (phase === "sending" || phase === "sent") return;
    setPhase("sending");
    setChosen(verdict);
    try {
      await send(verdict);
      setPhase("sent");
    } catch {
      // A failed vote is worth nothing to the user, so say so rather than
      // pretending it landed — this loop only means anything if it is honest.
      setPhase("failed");
    }
  }

  async function onSendCorrection() {
    if (!chosen || altSent) return;
    const text = altHinge.trim();
    if (text.length === 0) return;
    try {
      await send(chosen, text);
      setAltSent(true);
    } catch {
      setPhase("failed");
    }
  }

  const showCorrection = phase === "sent" && chosen === "wrong_hinge" && !altSent;

  return (
    <section className="spof-feedback" aria-label={copy.question}>
      <div className="fb-head">
        <span className="fb-tag">{copy.tag}</span>
        <p className="fb-q">{copy.question}</p>
      </div>

      {phase === "sent" ? (
        <p className={`fb-ack fb-ack--${chosen ?? "confirmed"}`} aria-live="polite">
          <span className="fb-ack-dot" aria-hidden="true" />
          {copy.thanks[chosen ?? "confirmed"]}
        </p>
      ) : phase === "failed" ? (
        <p className="fb-ack fb-ack--warn" aria-live="polite">
          <span className="fb-ack-dot" aria-hidden="true" />
          {copy.failed}
        </p>
      ) : (
        <div className="fb-row" role="group" aria-label={copy.question}>
          {VERDICT_ORDER.map((v) => (
            <button
              key={v}
              type="button"
              className={`fb-btn fb-btn--${v}`}
              disabled={phase === "sending"}
              onClick={() => onVote(v)}
            >
              <span className="fb-btn-label">{copy.verdicts[v]}</span>
              <span className="fb-btn-hint">{copy.hints[v]}</span>
            </button>
          ))}
        </div>
      )}

      {showCorrection ? (
        <div className="fb-alt">
          <label className="fb-alt-label" htmlFor="fb-alt-hinge">
            {copy.altLabel}
          </label>
          <input
            id="fb-alt-hinge"
            className="fb-alt-input"
            type="text"
            maxLength={ALT_HINGE_MAX_CHARS}
            value={altHinge}
            placeholder={copy.altPlaceholder}
            onChange={(e) => setAltHinge(e.target.value)}
          />
          <div className="fb-alt-foot">
            <button
              type="button"
              className="fb-send"
              disabled={altHinge.trim().length === 0}
              onClick={onSendCorrection}
            >
              {copy.altSend}
            </button>
            <span className="fb-alt-count">
              {altHinge.length}/{ALT_HINGE_MAX_CHARS}
            </span>
          </div>
        </div>
      ) : null}

      {altSent ? (
        <p className="fb-ack" aria-live="polite">
          <span className="fb-ack-dot" aria-hidden="true" />
          {copy.altThanks}
        </p>
      ) : null}

      <div className="fb-foot">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2.2" y="5.2" width="7.6" height="5.4" rx="1.2" />
          <path d="M4.1 5.2V3.9a1.9 1.9 0 0 1 3.8 0v1.3" />
        </svg>
        <p className="fb-note">{copy.privacy}</p>
      </div>
    </section>
  );
}
