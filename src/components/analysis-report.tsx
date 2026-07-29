"use client";

import { useState, type CSSProperties, type ReactElement } from "react";
import { FAILURE_ARCHETYPES } from "@/lib/archetypes";
import { useLanguage } from "@/lib/i18n/context";
import {
  analysisToMarkdown,
  downloadAnalysisMarkdown,
} from "@/lib/report-markdown";
import { toUserFacingWarnings } from "@/lib/user-warnings";
import type {
  ConfidenceBand,
  FailureAnalysis,
  FailureModeKey,
  LikelihoodBand,
  StressVerdict,
  VelocityBand,
} from "@/types/analysis";

type AnalysisReportProps = {
  analysis: FailureAnalysis;
  warnings: string[];
  restoredFromStorage?: boolean;
  onReset: () => void;
};

/* ------------------------------------------------------------------ */
/* Cosmetic copy (concept-faithful English + Indonesian counterparts)  */
/* ------------------------------------------------------------------ */

const STR = {
  en: {
    asideSummary: "the argument in one paragraph",
    asideAssumptions: "what the idea takes for granted",
    asideSpof: "the load-bearing weakness",
    asideCascade: "how the dominoes fall — each with an observable signal",
    asideModes: "secondary exposure, beyond the dominant pathway",
    asideLikelihood: "for the dominant pathway, not the idea overall",
    asideResilience: "capacity to absorb shock, 0–100",
    asideStress: (n: number) =>
      `${n} archetypes, one question each: does it break?`,
    asideVelocity: "how fast this pathway plays out",
    asideCalibration: "agreement across independent reasoning runs",
    critical: "critical",
    collapse: "Collapse",
    deepOn: "On",
    deepOff: "Off",
    passes: (n: number) => `${n} passes`,
    dominantPathway: "Dominant pathway",
    weakestAxis: "Weakest resilience axis",
    cascadeLength: "Cascade length",
    steps: (n: number) => `${n} steps`,
    assumptionsSurfaced: "Hidden assumptions surfaced",
    scopeNote: "Scope note —",
    scale: ["Low", "Medium", "High"],
    fiveDomains: "— five domains assessed —",
    yesBreaks: "Yes — breaks",
    trust: "Trust",
    agreement: "SPOF agreement",
    reason: "Reason",
    axesNote:
      "Hairline at 50 marks the neutral resilience threshold. Axes below it are drawn in the signal colour.",
    axisDesc: {
      technical: "build & scale risk",
      business: "unit economics",
      legal: "liability exposure",
      operations: "cost of running it",
      trust: "marketplace confidence",
    },
  },
  id: {
    asideSummary: "argumen dalam satu paragraf",
    asideAssumptions: "yang dianggap pasti oleh ide ini",
    asideSpof: "kelemahan penopang beban",
    asideCascade: "bagaimana domino jatuh — tiap langkah ada sinyal teramati",
    asideModes: "paparan sekunder, di luar jalur dominan",
    asideLikelihood: "untuk jalur dominan, bukan keseluruhan ide",
    asideResilience: "kapasitas menyerap guncangan, 0–100",
    asideStress: (n: number) =>
      `${n} arketipe, satu pertanyaan tiap pola: apakah rusak?`,
    asideVelocity: "seberapa cepat jalur ini terjadi",
    asideCalibration: "kesepakatan antar run penalaran independen",
    critical: "kritis",
    collapse: "Kolaps",
    deepOn: "Aktif",
    deepOff: "Nonaktif",
    passes: (n: number) => `${n} pass`,
    dominantPathway: "Jalur dominan",
    weakestAxis: "Sumbu ketahanan terlemah",
    cascadeLength: "Panjang rantai",
    steps: (n: number) => `${n} langkah`,
    assumptionsSurfaced: "Asumsi tersembunyi terangkat",
    scopeNote: "Catatan cakupan —",
    scale: ["Rendah", "Sedang", "Tinggi"],
    fiveDomains: "— lima domain dinilai —",
    yesBreaks: "Ya — rusak",
    trust: "Kepercayaan",
    agreement: "Kesepakatan SPOF",
    reason: "Alasan",
    axesNote:
      "Garis di 50 menandai ambang ketahanan netral. Sumbu di bawahnya digambar dengan warna sinyal.",
    axisDesc: {
      technical: "risiko build & skala",
      business: "unit economics",
      legal: "paparan liabilitas",
      operations: "biaya menjalankan",
      trust: "kepercayaan pasar",
    },
  },
} as const;

type Strings = (typeof STR)["en"] | (typeof STR)["id"];

/* ------------------------------------------------------------------ */
/* Data mapping helpers                                                */
/* ------------------------------------------------------------------ */

/** Stable short report code from generated_at + idea (BRK-XXXX). */
function reportCode(analysis: FailureAnalysis): string {
  const src = `${analysis.meta.generated_at}|${analysis.meta.idea_input}`;
  let h = 0;
  for (let i = 0; i < src.length; i++) {
    h = (h * 31 + src.charCodeAt(i)) >>> 0;
  }
  return String(1000 + (h % 9000));
}

/** [first sentence, rest] of a paragraph. */
function splitFirstSentence(text: string): [string, string] {
  const trimmed = text.trim();
  const m = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  if (!m) return [trimmed, ""];
  return [m[0], trimmed.slice(m[0].length)];
}

/**
 * The masthead headline is followed immediately by the verbatim idea, so a full
 * opening sentence reads as the same thing said twice. Keep only the leading
 * clause: cut at the first clause boundary past a usable length, and fall back
 * to a word boundary. Whatever is dropped still appears in full under 01.
 */
function condenseHeadline(sentence: string, max = 68): string {
  const s = sentence.trim().replace(/[.!?]+$/, "");
  if (s.length <= max) return s;

  const boundary = /[,;:—–]|\s\(/g;
  let cut = -1;
  for (let m = boundary.exec(s); m; m = boundary.exec(s)) {
    if (m.index > max) break;
    if (m.index >= max * 0.45) cut = m.index;
  }
  if (cut > 0) return s.slice(0, cut);

  const space = s.lastIndexOf(" ", max);
  return `${s.slice(0, space > max * 0.5 ? space : max).trimEnd()}…`;
}

/** Wrap the trailing phrase of the SPOF statement for the .u highlight. */
function splitStatement(component: string): [string, string] {
  const words = component.trim().split(/\s+/);
  if (words.length < 4) return [component.trim(), ""];
  const uCount = Math.min(3, Math.floor(words.length / 2));
  return [
    words.slice(0, words.length - uCount).join(" ") + " ",
    words.slice(words.length - uCount).join(" "),
  ];
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

const CONFIDENCE_LEVEL: Record<ConfidenceBand, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  "Very High": 4,
};

const LIKELIHOOD_POS: Record<LikelihoodBand, string> = {
  "Very Low": "8%",
  Low: "30%",
  Medium: "52%",
  High: "76%",
  "Very High": "92%",
};

const VELOCITY_ARC: Record<VelocityBand, number> = {
  Slow: 0.3,
  Medium: 0.55,
  Fast: 0.85,
};

function velocityLabel(band: VelocityBand, locale: string): string {
  if (locale === "id") {
    if (band === "Fast") return "Cepat";
    if (band === "Slow") return "Lambat";
    return "Sedang";
  }
  return band;
}

function verdictClass(v: StressVerdict): string {
  if (v === "Yes") return "yes";
  if (v === "Maybe") return "maybe";
  return "no";
}

/** Archetype library lookup — tolerant of the exact entry shape. */
type ArchetypeEntry = {
  id: string;
  name?: string;
  question?: string;
};
const ARCHETYPE_LIB = FAILURE_ARCHETYPES as unknown as ReadonlyArray<ArchetypeEntry>;
const ARCHETYPE_BY_ID = new Map(ARCHETYPE_LIB.map((a) => [a.id, a]));
const ARCHETYPE_ORDER = ARCHETYPE_LIB.map((a) => a.id);

const AXIS_ORDER = [
  "technical",
  "business",
  "legal",
  "operations",
  "trust",
] as const;
type AxisKey = (typeof AXIS_ORDER)[number];

const MODE_ORDER: FailureModeKey[] = [
  "technical",
  "business",
  "security",
  "legal",
  "operations",
];

/* ------------------------------------------------------------------ */
/* Concept inline SVG icons (presentational, verbatim from concept A)  */
/* ------------------------------------------------------------------ */

const MODE_ICONS: Record<FailureModeKey, ReactElement> = {
  technical: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="11" height="8" rx="1.5" />
      <path d="M4.5 12.5h5M5.5 5.5 4 7l1.5 1.5M8.5 5.5 10 7 8.5 8.5" />
    </svg>
  ),
  business: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12.5v-4l3-2v2l3-2v2l3-2v6z" />
      <path d="M10.5 4.5v-2h2v10" />
    </svg>
  ),
  security: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.5 12 3.2v3.6c0 3-2.2 4.9-5 5.7-2.8-.8-5-2.7-5-5.7V3.2L7 1.5Z" />
      <path d="M4.8 7l1.5 1.5L9.2 5.6" />
    </svg>
  ),
  legal: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.5v11M3.5 12.5h7M2 4l2-1.5L7 3.5 10 2.5l2 1.5M4 4l-2 4a2.1 2.1 0 0 0 4 0L4 4ZM10 4l-2 4a2.1 2.1 0 0 0 4 0l-2-4Z" />
    </svg>
  ),
  operations: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M7 4v3l2.2 1.3" />
    </svg>
  ),
};

const BOLT_ICON = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 1 4 6h2.5L4.5 11 9.5 5H7L7.5 1Z" />
  </svg>
);

const CLOCK_ICON = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <circle cx="6.5" cy="6.5" r="5.2" />
    <path d="M6.5 3.8v3.2l2 1.2" />
  </svg>
);

const WARN_ICON = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 1.5 12 11.5H1L6.5 1.5Z" />
    <path d="M6.5 5.5v2.6M6.5 9.8v.01" />
  </svg>
);

/**
 * The async clipboard API needs a focused document and granted permission, and
 * refuses in enough real situations (background tab, denied permission, older
 * browser) that a silent "Copy failed" would be a common outcome. Falls back to
 * the legacy selection copy, which has none of those preconditions.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="1.5" width="7.5" height="7.5" rx="1.5" />
    <path d="M9 11.2v.8a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 12V7.5A1.5 1.5 0 0 1 3 6h.8" />
  </svg>
);

const CHEVRON_ICON = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4.5l3 3 3-3" />
  </svg>
);

const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 7.5l3 3 6-7" />
  </svg>
);

const EXPORT_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1.5v7.5M4 6.5l3 3 3-3" />
    <path d="M2 10.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
  </svg>
);

const RESET_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.2 5.5a5 5 0 1 1 .3 4" />
    <path d="M2 2.5v3h3" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Section head (shared scaffold)                                      */
/* ------------------------------------------------------------------ */

function SecHead({
  no,
  title,
  aside,
}: {
  no: string;
  title: string;
  aside: string;
}) {
  return (
    <div className="sec-head">
      <span className="sec-no">{no}</span>
      <h3 className="sec-title">{title}</h3>
      <span className="sec-aside">{aside}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AnalysisReport({
  analysis,
  warnings,
  restoredFromStorage,
  onReset,
}: AnalysisReportProps) {
  const { t, locale } = useLanguage();
  const S: Strings = locale === "id" ? STR.id : STR.en;
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");

  const spof = analysis.single_point_of_failure;
  const velocity = analysis.failure_velocity;
  const likelihood = analysis.likelihood;
  const calibration = analysis.self_consistency;
  const isDeep = Boolean(calibration);

  /** Never surface claim-guard / soft-check jargon to end users */
  const softWarnings = toUserFacingWarnings(warnings, locale === "id" ? "id" : "en");

  const handleExport = () =>
    downloadAnalysisMarkdown(analysis, { locale, warnings: softWarnings });

  /** Copy the same Markdown the export produces, so both stay in step. */
  async function handleCopy() {
    const md = analysisToMarkdown(analysis, { locale, warnings: softWarnings });
    setCopyState((await copyToClipboard(md)) ? "done" : "failed");
    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  /* --- derived masthead / summary values --- */
  const [firstSentence, restSummary] = splitFirstSentence(analysis.summary);
  /** One-line form of the raw input, for the folded preview. */
  const ideaOneLine = analysis.meta.idea_input.replace(/\s+/g, " ").trim();
  const [statementLead, statementU] = splitStatement(spof.component);
  const critSet = new Set(spof.critical_assumption_indices ?? []);
  const nodes = analysis.cascade.nodes;
  const ponrIndex = analysis.cascade.point_of_no_return_index;
  const confidenceLevel = CONFIDENCE_LEVEL[spof.confidence] ?? 2;
  const likelihoodPos = LIKELIHOOD_POS[likelihood.band] ?? "52%";
  const likelihoodHigh =
    likelihood.band === "High" || likelihood.band === "Very High";
  const arcFrac = VELOCITY_ARC[velocity.band] ?? 0.55;
  const veloText = velocityLabel(velocity.band, locale);

  const scores = analysis.resilience_score;
  const axisValue = (k: AxisKey): number => scores[k] ?? 0;
  const weakestAxis = AXIS_ORDER.reduce((min, k) =>
    axisValue(k) < axisValue(min) ? k : min,
  );
  const axisName = (k: AxisKey): string =>
    k === "trust" ? S.trust : t.modes[k];

  /* stress items in library order, unknown ids appended */
  const stressItems = [...analysis.stress_test.items].sort((a, b) => {
    const ia = ARCHETYPE_ORDER.indexOf(a.archetype_id);
    const ib = ARCHETYPE_ORDER.indexOf(b.archetype_id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const verdictText = (v: StressVerdict): string => {
    if (v === "Yes") return S.yesBreaks;
    if (v === "Maybe") return t.report.stressVerdict.maybe;
    return t.report.stressVerdict.no;
  };

  return (
    <section className="report" id="report">
      <div className="wrap">
        {/* masthead */}
        <div className="report-masthead reveal">
          <div className="report-tools">
            <button
              type="button"
              className={`btn-tool${copyState === "done" ? " ok" : ""}${copyState === "failed" ? " err" : ""}`}
              onClick={handleCopy}
            >
              {copyState === "done" ? CHECK_ICON : COPY_ICON}
              {copyState === "done"
                ? t.report.copyMarkdownDone
                : copyState === "failed"
                  ? t.report.copyMarkdownFailed
                  : t.report.copyMarkdown}
            </button>
            <button type="button" className="btn-tool" onClick={handleExport}>
              {EXPORT_ICON}
              {t.report.exportMarkdown}
            </button>
            <div className="report-tools-push" />
            <button
              type="button"
              className="btn-tool btn-tool--primary"
              onClick={onReset}
            >
              {RESET_ICON}
              {t.report.newAnalysis}
            </button>
          </div>

          <div className="report-kicker">
            <span className="tick" aria-hidden="true" />
            <span className="label label--signal">
              {t.report.kicker} · BRK-{reportCode(analysis)}
            </span>
          </div>
          <h2 className="report-title">{condenseHeadline(firstSentence)}</h2>
          {/* Raw input is reference material, not the argument — keep it folded
              so the masthead stays short on long drafts. */}
          <details className="report-idea">
            <summary>
              <span className="report-idea-label">
                {t.report.analysisBase}
              </span>
              <span className="report-idea-peek">{ideaOneLine}</span>
              <span className="report-idea-caret" aria-hidden="true">
                {CHEVRON_ICON}
              </span>
            </summary>
            <div className="report-idea-body">
              <blockquote className="report-idea-full">
                {analysis.meta.idea_input}
              </blockquote>
              <p className="report-idea-hint">{t.report.analysisBaseHint}</p>
            </div>
          </details>
          <div className="report-meta">
            <span className="chip">
              {t.form.categoryLabel}&nbsp;<b>{analysis.meta.category}</b>
            </span>
            <span className="chip">
              {t.report.deepBadge}&nbsp;<b>{isDeep ? S.deepOn : S.deepOff}</b>
            </span>
            <span className="chip">
              <b>{S.passes(isDeep ? 5 : 3)}</b>
            </span>
            <span className="chip chip--signal">
              {S.dominantPathway}&nbsp;<b>{truncate(spof.component, 48)}</b>
            </span>
          </div>
          {restoredFromStorage ? (
            <p className="axes-note">{t.report.restoredFromBrowser}</p>
          ) : null}

          {softWarnings.length > 0 ? (
            <div className="callout" role="status">
              {WARN_ICON}
              <div>
                <p className="c-title">{t.report.warnings}</p>
                <ul>
                  {softWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        {/* 01 summary */}
        <div className="sec reveal">
          <SecHead no="01" title={t.report.summary} aside={S.asideSummary} />
          <div className="summary-grid">
            <p className="summary-lede">
              <span className="drop">{firstSentence}</span>
              {restSummary}
            </p>
            <div className="summary-facts">
              <div className="fact">
                <span className="k">{t.report.spof}</span>
                <span className="v sig">{truncate(spof.component, 60)}</span>
              </div>
              <div className="fact">
                <span className="k">{t.report.likelihood}</span>
                <span className={likelihoodHigh ? "v sig" : "v"}>
                  {likelihood.band}
                </span>
              </div>
              <div className="fact">
                <span className="k">{t.report.velocity}</span>
                <span className="v amb">{veloText}</span>
              </div>
              <div className="fact">
                <span className="k">{S.weakestAxis}</span>
                <span className="v">
                  {axisName(weakestAxis)} · {axisValue(weakestAxis)}
                </span>
              </div>
              <div className="fact">
                <span className="k">{S.cascadeLength}</span>
                <span className="v">{S.steps(nodes.length)}</span>
              </div>
              <div className="fact">
                <span className="k">{S.assumptionsSurfaced}</span>
                <span className="v">{analysis.assumptions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 02 hidden assumptions */}
        <div className="sec reveal">
          <SecHead
            no="02"
            title={t.report.assumptions}
            aside={S.asideAssumptions}
          />
          <ol className="assump-list">
            {analysis.assumptions.map((item, i) => (
              <li key={`${i}-${item.slice(0, 24)}`} className={critSet.has(i) ? "crit" : undefined}>
                <span>
                  {item}
                  {critSet.has(i) ? (
                    <span className="crit-tag">{S.critical}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* 03 SPOF */}
        <div className="sec reveal">
          <SecHead no="03" title={t.report.spof} aside={S.asideSpof} />
          <article className="spof">
            <div className="spof-inner">
              <div className="spof-top">
                <span className="badge badge--spof">
                  {BOLT_ICON}
                  SPOF
                </span>
                <span className="badge badge--conf">
                  {t.report.confidence} · {spof.confidence}{" "}
                  <i aria-hidden="true">
                    {[1, 2, 3, 4].map((k) => (
                      <s key={k} className={k <= confidenceLevel ? "on" : undefined} />
                    ))}
                  </i>
                </span>
              </div>
              <h4 className="spof-statement">
                {statementLead}
                {statementU ? <span className="u">{statementU}</span> : null}
              </h4>
              <p className="spof-expl">{spof.explanation}</p>
              <div className="spof-foot">
                {CLOCK_ICON}
                {calibration
                  ? `${calibration.runs}× Pass 1 · ${S.agreement}: ${calibration.spof_agreement}`
                  : spof.confidence_reason}
              </div>
            </div>
          </article>
        </div>

        {/* 04 cascade */}
        <div className="sec reveal">
          <SecHead no="04" title={t.report.cascade} aside={S.asideCascade} />
          <div className="cascade">
            <div className="cascade-rail" aria-hidden="true" />
            {nodes.map((node, i) => {
              const isTerminal = i === nodes.length - 1;
              const isPonr = !isTerminal && ponrIndex === i;
              const cls = isTerminal
                ? "cstep cstep--terminal"
                : isPonr
                  ? "cstep cstep--ponr"
                  : "cstep";
              return (
                <div className={cls} key={`${i}-${node.step.slice(0, 24)}`}>
                  <span className="cstep-node">{i + 1}</span>
                  <div className="cstep-body">
                    <p className="cstep-title">
                      {node.step}
                      {isTerminal ? (
                        <span className="cstep-tag">{S.collapse}</span>
                      ) : isPonr ? (
                        <span className="cstep-tag">
                          {t.report.pointOfNoReturn}
                        </span>
                      ) : null}
                    </p>
                    <span className="cstep-signal">
                      <span className="sk">{t.report.signal.toUpperCase()}</span>{" "}
                      {node.observable_signal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 05 failure modes */}
        <div className="sec reveal">
          <SecHead no="05" title={t.report.failureModes} aside={S.asideModes} />
          <div className="modes">
            {MODE_ORDER.map((key) => {
              const items = analysis.failure_modes[key] ?? [];
              return (
                <div className="mode" key={key}>
                  <div className="mode-head">
                    {MODE_ICONS[key]}
                    <span className="label">{t.modes[key]}</span>
                  </div>
                  <ul>
                    {items.length > 0 ? (
                      items.map((m) => <li key={m}>{m}</li>)
                    ) : (
                      <li className="empty">—</li>
                    )}
                  </ul>
                </div>
              );
            })}
            {analysis.failure_modes.compounding_note ? (
              <div className="mode">
                <div className="mode-head">
                  <span className="label">{t.report.compoundingNote}</span>
                </div>
                <ul>
                  <li>{analysis.failure_modes.compounding_note}</li>
                </ul>
              </div>
            ) : (
              <div
                className="mode"
                aria-hidden="true"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="num" style={{ fontSize: 12 }}>
                  {S.fiveDomains}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 06 likelihood */}
        <div className="sec reveal">
          <SecHead
            no="06"
            title={t.report.likelihood}
            aside={S.asideLikelihood}
          />
          <div className="likelihood">
            <div
              className="band"
              style={{ "--pos": likelihoodPos } as CSSProperties}
              role="img"
              aria-label={`${t.report.likelihood}: ${likelihood.band}`}
            >
              <span className="band-flag">{likelihood.band}</span>
              <span className="band-marker" />
            </div>
            <div className="band-scale" aria-hidden="true">
              {S.scale.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <p className="band-caveat">
              <b>{S.scopeNote}&nbsp;</b>
              {likelihood.reason}
            </p>
          </div>
        </div>

        {/* 07 resilience */}
        <div className="sec reveal">
          <SecHead
            no="07"
            title={t.report.resilience}
            aside={S.asideResilience}
          />
          <div className="axes">
            {AXIS_ORDER.map((key) => {
              const v = axisValue(key);
              return (
                <div
                  className={v < 50 ? "axis low" : "axis"}
                  data-value={v}
                  key={key}
                >
                  <span className="k">
                    {axisName(key)}
                    <small>{S.axisDesc[key]}</small>
                  </span>
                  <div className="bar">
                    <span className="bar-fill" />
                  </div>
                  <span className="v">{v}</span>
                </div>
              );
            })}
          </div>
          <p className="axes-note">{S.axesNote}</p>
        </div>

        {/* 08 stress test */}
        <div className="sec reveal">
          <SecHead
            no="08"
            title={t.report.stressTest}
            aside={S.asideStress(stressItems.length)}
          />
          <div className="stress">
            {stressItems.map((item, i) => {
              const arch = ARCHETYPE_BY_ID.get(item.archetype_id);
              const name =
                arch?.name ?? item.archetype_id.replace(/_/g, " ");
              const question = arch?.question;
              return (
                <div className="arch" key={`${item.archetype_id}-${i}`}>
                  <span className="label">{name}</span>
                  <p className="q">&ldquo;{question ?? item.reason}&rdquo;</p>
                  <span className={`verdict ${verdictClass(item.verdict)}`}>
                    <span className="dot" aria-hidden="true" />
                    {verdictText(item.verdict)}
                    {question ? <>&nbsp;<small>{item.reason}</small></> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 09 velocity */}
        <div className="sec reveal">
          <SecHead no="09" title={t.report.velocity} aside={S.asideVelocity} />
          <div className="velocity">
            <div
              className="velo-dial"
              role="img"
              aria-label={`${t.report.velocity}: ${veloText}`}
            >
              <svg width="150" height="84" viewBox="0 0 150 84" fill="none">
                <path
                  className="velo-track"
                  d="M15 78 A60 60 0 0 1 135 78"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  className="velo-arc"
                  data-arc={arcFrac}
                  d="M15 78 A60 60 0 0 1 135 78"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </svg>
              <span className="velo-value">{veloText}</span>
            </div>
            <p className="velo-copy">{velocity.reason}</p>
          </div>
        </div>

        {/* 10 SPOF calibration (deep analysis only) */}
        {calibration ? (
          <div className="sec reveal">
            <SecHead
              no="10"
              title={t.report.calibration}
              aside={S.asideCalibration}
            />
            <div className="consistency">
              <div className="consistency-row">
                <span className="k">{t.report.calibrationRuns}</span>
                <span className="v">{calibration.runs}</span>
              </div>
              <div className="consistency-row">
                <span className="k">{S.agreement}</span>
                <span className="v">{calibration.spof_agreement}</span>
              </div>
              <div className="consistency-row">
                <span className="k">{S.reason}</span>
                <span className="v">{calibration.reason}</span>
              </div>
              {calibration.candidate_spofs.length > 0 ? (
                <div>
                  <span className="label">{t.report.candidates}</span>
                  <div>
                    {calibration.candidate_spofs.map((c) => (
                      <span className="cand" key={c}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
