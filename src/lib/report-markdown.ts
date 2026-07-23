import { FAILURE_ARCHETYPES } from "@/lib/archetypes";
import type { FailureAnalysis } from "@/types/analysis";

const ARCHETYPE_NAME = Object.fromEntries(
  FAILURE_ARCHETYPES.map((a) => [a.id, a.name]),
) as Record<string, string>;

function esc(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

/**
 * Same grounding as report UI "Why this hinge":
 * linked critical assumptions, else first useful sentence of SPOF explanation.
 */
export function spofWhyHingeText(analysis: FailureAnalysis): string | null {
  const spof = analysis.single_point_of_failure;
  const idxs = spof.critical_assumption_indices ?? [];
  const linked = idxs
    .map((i) => analysis.assumptions[i])
    .filter((s): s is string => Boolean(s?.trim()));
  if (linked.length > 0) {
    return linked.slice(0, 2).join(" · ");
  }
  const sentence = spof.explanation
    ?.split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .find((s) => s.length > 24 && s.length < 220);
  return sentence?.trim() || null;
}

/**
 * Serialize a full FailureAnalysis into one Markdown document for download/share.
 * Keeps parity with major report UI sections (SPOF why-hinge, pathway likelihood, etc.).
 */
export function analysisToMarkdown(
  analysis: FailureAnalysis,
  opts?: { locale?: "en" | "id"; warnings?: string[] },
): string {
  const id = opts?.locale === "id";
  const a = analysis;
  const spof = a.single_point_of_failure;
  const lines: string[] = [];

  const h = (n: number, t: string) => `${"#".repeat(n)} ${t}`;
  const title = id ? "Laporan kegagalan" : "Failure report";
  const generated = id ? "Dibuat" : "Generated";

  lines.push(`# ${title}`);
  lines.push("");
  lines.push(
    `**${id ? "Kategori" : "Category"}:** ${a.meta.category}  `,
  );
  lines.push(`**${generated}:** ${a.meta.generated_at}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push(
    h(2, id ? "Ide yang dianalisis (basis pipeline)" : "Idea analyzed (pipeline base)"),
  );
  lines.push("");
  lines.push(
    id
      ? "_Input setelah validasi — teks sumber yang dipakai Pass 1–2._"
      : "_Validated input — source text used by Pass 1–2._",
  );
  lines.push("");
  lines.push("```");
  lines.push(esc(a.meta.idea_input));
  lines.push("```");
  lines.push("");

  lines.push(
    h(2, id ? "Pembacaan sistem (restatement)" : "System reading (restatement)"),
  );
  lines.push("");
  lines.push(esc(a.summary));
  lines.push("");

  lines.push(h(2, id ? "Single Point of Failure" : "Single Point of Failure"));
  lines.push("");
  lines.push(`**${esc(spof.component)}**`);
  lines.push("");
  lines.push(
    `- **${id ? "Keyakinan" : "Confidence"}:** ${spof.confidence}`,
  );
  lines.push(
    `- **${id ? "Alasan keyakinan" : "Confidence reason"}:** ${esc(spof.confidence_reason)}`,
  );
  lines.push("");

  const whyHinge = spofWhyHingeText(a);
  if (whyHinge) {
    lines.push(
      h(3, id ? "Kenapa hinge ini" : "Why this hinge"),
    );
    lines.push("");
    lines.push(
      id
        ? "_Asumsi struktural yang SPOF ini andalkan — bukan risiko generik yang sudah semua sebut._"
        : "_Structural assumptions this SPOF depends on — not the generic risk everyone already names._",
    );
    lines.push("");
    lines.push(esc(whyHinge));
    lines.push("");
  }

  lines.push(
    h(3, id ? "Penjelasan mekanisme" : "Mechanism explanation"),
  );
  lines.push("");
  lines.push(esc(spof.explanation));
  lines.push("");

  if (
    spof.critical_assumption_indices &&
    spof.critical_assumption_indices.length > 0
  ) {
    lines.push(
      h(3, id ? "Asumsi kritis untuk SPOF ini" : "Critical assumptions for this SPOF"),
    );
    lines.push("");
    for (const idx of spof.critical_assumption_indices) {
      const text = a.assumptions[idx];
      if (text) lines.push(`- **#${idx + 1}** — ${esc(text)}`);
    }
    lines.push("");
  }

  if (a.self_consistency) {
    const sc = a.self_consistency;
    lines.push(h(3, id ? "Kalibrasi SPOF (Deep)" : "SPOF calibration (Deep)"));
    lines.push("");
    lines.push(
      `- **${id ? "Kesepakatan" : "Agreement"}:** ${sc.spof_agreement}`,
    );
    lines.push(`- **${id ? "Run Pass 1" : "Pass 1 runs"}:** ${sc.runs}`);
    lines.push(`- **${id ? "Alasan" : "Reason"}:** ${esc(sc.reason)}`);
    if (sc.candidate_spofs?.length) {
      lines.push(
        `- **${id ? "Kandidat" : "Candidates"}:** ${sc.candidate_spofs.map(esc).join("; ")}`,
      );
    }
    lines.push("");
  }

  lines.push(
    h(2, id ? "Kemungkinan jalur gagal" : "Pathway likelihood"),
  );
  lines.push("");
  lines.push(
    id
      ? "_Peluang jalur kegagalan ini terjadi — bukan peluang keseluruhan perusahaan gagal._"
      : "_Chance this failure path materializes — not overall odds the company fails._",
  );
  lines.push("");
  lines.push(`- **Band:** ${a.likelihood.band}`);
  lines.push(`- **${id ? "Alasan" : "Reason"}:** ${esc(a.likelihood.reason)}`);
  lines.push("");

  lines.push(h(2, id ? "Kecepatan kegagalan" : "Failure velocity"));
  lines.push("");
  lines.push(
    id
      ? "_Seberapa cepat jalur gagal ini cenderung terjadi._"
      : "_How quickly this failure path tends to unfold._",
  );
  lines.push("");
  lines.push(`- **Band:** ${a.failure_velocity.band}`);
  lines.push(
    `- **${id ? "Alasan" : "Reason"}:** ${esc(a.failure_velocity.reason)}`,
  );
  lines.push("");

  lines.push(h(2, id ? "Asumsi tersembunyi" : "Hidden assumptions"));
  lines.push("");
  a.assumptions.forEach((item, i) => {
    const crit = spof.critical_assumption_indices?.includes(i);
    lines.push(
      `${i + 1}. ${esc(item)}${crit ? (id ? " *(terkait SPOF)*" : " *(linked to SPOF)*") : ""}`,
    );
  });
  lines.push("");

  lines.push(h(2, id ? "Skor ketahanan" : "Resilience score"));
  lines.push("");
  lines.push(
    id
      ? "_0–100 kemampuan menahan jalur gagal ini — semakin rendah semakin rapuh._"
      : "_0–100 ability to absorb this failure path — lower is more fragile._",
  );
  lines.push("");
  lines.push("| Dimension | Score |");
  lines.push("|-----------|------:|");
  for (const [k, v] of Object.entries(a.resilience_score)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");

  lines.push(h(2, id ? "Rantai kegagalan" : "Failure cascade"));
  lines.push("");
  lines.push(
    id
      ? "_Rantai kausal dari titik rapuh sampai end state — tiap langkah ada sinyal yang bisa diamati._"
      : "_Causal chain from fragile point to end state — each step includes an observable signal._",
  );
  lines.push("");
  if (
    a.cascade.point_of_no_return_index !== undefined &&
    a.cascade.point_of_no_return_index >= 0
  ) {
    lines.push(
      `- **${id ? "Titik tanpa kembali (indeks langkah)" : "Point of no return (step index)"}:** ${a.cascade.point_of_no_return_index + 1}`,
    );
    lines.push("");
  }
  a.cascade.nodes.forEach((node, i) => {
    const ponr =
      a.cascade.point_of_no_return_index === i
        ? id
          ? " **[Titik tanpa kembali]**"
          : " **[Point of no return]**"
        : "";
    lines.push(`### ${i + 1}. ${esc(node.step)}${ponr}`);
    lines.push("");
    lines.push(
      `*${id ? "Sinyal" : "Signal"}:* ${esc(node.observable_signal)}`,
    );
    lines.push("");
  });

  lines.push(h(2, id ? "Stress test arketipe" : "Archetype stress test"));
  lines.push("");
  lines.push(
    id
      ? "_Paparan pola untuk ide ini — bukan satu skor bahaya keseluruhan._"
      : "_Pattern exposure for this idea — not one overall danger score._",
  );
  lines.push("");
  for (const item of a.stress_test.items) {
    const name =
      ARCHETYPE_NAME[item.archetype_id] ??
      item.archetype_id.replace(/_/g, " ");
    lines.push(`### ${name}`);
    lines.push("");
    lines.push(`- **${id ? "ID arketipe" : "Archetype id"}:** \`${item.archetype_id}\``);
    lines.push(`- **Verdict:** ${item.verdict}`);
    lines.push(`- **${id ? "Alasan" : "Reason"}:** ${esc(item.reason)}`);
    lines.push("");
  }

  lines.push(h(2, id ? "Mode kegagalan" : "Failure modes"));
  lines.push("");
  if (a.failure_modes.compounding_note?.trim()) {
    lines.push(
      `> **${id ? "Domain yang saling memperparah" : "Compounding domains"}:** ${esc(a.failure_modes.compounding_note)}`,
    );
    lines.push("");
  }
  for (const key of [
    "technical",
    "business",
    "security",
    "legal",
    "operations",
  ] as const) {
    const bucket = a.failure_modes[key];
    lines.push(h(3, key));
    lines.push("");
    if (!bucket.length) {
      lines.push(id ? "_Tidak ada item._" : "_None listed._");
    } else {
      for (const b of bucket) lines.push(`- ${esc(b)}`);
    }
    lines.push("");
  }

  if (opts?.warnings?.length) {
    lines.push(h(2, id ? "Catatan pipeline" : "Pipeline notes"));
    lines.push("");
    for (const w of opts.warnings) lines.push(`- ${esc(w)}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    `*${id ? "Diekspor dari" : "Exported from"} BreakItFirst · What Would Break This?*`,
  );
  lines.push("");

  return lines.join("\n");
}

export function downloadAnalysisMarkdown(
  analysis: FailureAnalysis,
  opts?: { locale?: "en" | "id"; warnings?: string[] },
): void {
  const md = analysisToMarkdown(analysis, opts);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const cat = analysis.meta.category.replace(/\s+/g, "-").toLowerCase();
  const filename = `breakitfirst-report-${cat}-${stamp}.md`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Copy full report Markdown to the clipboard (same body as download).
 * Falls back to execCommand if clipboard API is unavailable.
 */
export async function copyAnalysisMarkdown(
  analysis: FailureAnalysis,
  opts?: { locale?: "en" | "id"; warnings?: string[] },
): Promise<boolean> {
  const md = analysisToMarkdown(analysis, opts);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(md);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = md;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
