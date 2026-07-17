import { FAILURE_ARCHETYPES } from "@/lib/archetypes";
import type { FailureAnalysis } from "@/types/analysis";

const ARCHETYPE_NAME = Object.fromEntries(
  FAILURE_ARCHETYPES.map((a) => [a.id, a.name]),
) as Record<string, string>;

function esc(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

/**
 * Serialize a full FailureAnalysis into one Markdown document for download/share.
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

  lines.push(h(2, id ? "Kemungkinan gagal" : "Failure likelihood"));
  lines.push("");
  lines.push(`- **Band:** ${a.likelihood.band}`);
  lines.push(`- **${id ? "Alasan" : "Reason"}:** ${esc(a.likelihood.reason)}`);
  lines.push("");

  lines.push(h(2, id ? "Kecepatan kegagalan" : "Failure velocity"));
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
  lines.push("| Dimension | Score |");
  lines.push("|-----------|------:|");
  for (const [k, v] of Object.entries(a.resilience_score)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");

  lines.push(h(2, id ? "Rantai kegagalan" : "Failure cascade"));
  lines.push("");
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
  for (const item of a.stress_test.items) {
    const name =
      ARCHETYPE_NAME[item.archetype_id] ??
      item.archetype_id.replace(/_/g, " ");
    lines.push(`### ${name}`);
    lines.push("");
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
