import type { CSSProperties } from "react";
import {
  Cormorant_Garamond,
  Crimson_Pro,
  DM_Sans,
  Epilogue,
  Fraunces,
  Geist,
  Hanken_Grotesk,
  Inter_Tight,
  Jost,
  Playfair_Display,
  Spectral,
} from "next/font/google";

/**
 * Temporary specimen route. Three blind font swaps in a row got rejected, so
 * this stops the guessing: every candidate pairing is rendered at the exact
 * sizes the landing page actually uses — 44px display, 14px card title, 12.5px
 * serif italic, 17px body, 10.5px mono label — so the small end (where display
 * faces usually fall apart) is visible next to the big end.
 *
 * Delete this whole directory once a pairing is picked.
 */

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });
const dmSans = DM_Sans({ subsets: ["latin"] });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"] });
const epilogue = Epilogue({ subsets: ["latin"] });
const crimson = Crimson_Pro({ subsets: ["latin"], style: ["normal", "italic"] });
const hanken = Hanken_Grotesk({ subsets: ["latin"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], style: ["normal", "italic"] });
const jost = Jost({ subsets: ["latin"] });
const spectral = Spectral({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"] });
const interTight = Inter_Tight({ subsets: ["latin"] });
const geist = Geist({ subsets: ["latin"] });

type Spec = {
  n: number;
  name: string;
  note: string;
  serif: string;
  sans: string;
};

const SPECS: Spec[] = [
  {
    n: 1,
    name: "Playfair Display + DM Sans",
    note: "Currently live. High vertical contrast, movie-poster elegance; DM Sans keeps the UI quiet.",
    serif: playfair.style.fontFamily,
    sans: dmSans.style.fontFamily,
  },
  {
    n: 2,
    name: "Fraunces + Epilogue",
    note: "Fraunces has an optical-size axis, so it stays sturdy at 12px and gets sharp at 44px. Warmest option.",
    serif: fraunces.style.fontFamily,
    sans: epilogue.style.fontFamily,
  },
  {
    n: 3,
    name: "Crimson Pro + Hanken Grotesk",
    note: "Quietest, most bookish. Tall x-height, refined light italic. Elegant rather than cinematic.",
    serif: crimson.style.fontFamily,
    sans: hanken.style.fontFamily,
  },
  {
    n: 4,
    name: "Cormorant Garamond + Jost",
    note: "The luxury/fashion register — engraved hairlines. Warning: goes fragile below 16px, and this route uses serif down to 11px.",
    serif: cormorant.style.fontFamily,
    sans: jost.style.fontFamily,
  },
  {
    n: 5,
    name: "Spectral + Inter Tight",
    note: "Cinematic-editorial. Spectral was cut for screens, Inter Tight is neutral and dense.",
    serif: spectral.style.fontFamily,
    sans: interTight.style.fontFamily,
  },
  {
    n: 6,
    name: "Geist only — no serif",
    note: "The pure-minimal route: one grotesque for everything, hierarchy from size and spacing alone. Loses the editorial voice entirely.",
    serif: geist.style.fontFamily,
    sans: geist.style.fontFamily,
  },
];

export default function TypeLabPage() {
  return (
    <main style={{ padding: "56px clamp(20px, 5vw, 64px) 120px", maxWidth: 1080, margin: "0 auto" }}>
      <p className="label" style={{ marginBottom: 10 }}>Specimen — pick a number</p>
      <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 48 }}>
        Every block below uses the real landing-page sizes. Judge the small text as
        hard as the headline — that is where the last three attempts broke.
      </p>

      {SPECS.map((s) => (
        <section
          key={s.n}
          style={
            {
              borderTop: "1px solid var(--hair)",
              paddingTop: 28,
              marginBottom: 56,
              "--spec-serif": s.serif,
              "--spec-sans": s.sans,
            } as CSSProperties
          }
        >
          <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 6 }}>
            <span className="mono" style={{ color: "var(--signal)" }}>{String(s.n).padStart(2, "0")}</span>
            <h2 style={{ fontFamily: "var(--spec-sans)", fontSize: 15, fontWeight: 600 }}>{s.name}</h2>
          </div>
          <p style={{ fontFamily: "var(--spec-sans)", fontSize: 13, color: "var(--ink-3)", maxWidth: "70ch", marginBottom: 24 }}>
            {s.note}
          </p>

          <h3
            style={{
              fontFamily: "var(--spec-serif)",
              fontSize: 44,
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: "-.02em",
              maxWidth: "22ch",
              marginBottom: 18,
            }}
          >
            Every idea has one thing that breaks it first.
          </h3>

          <p style={{ fontFamily: "var(--spec-sans)", fontSize: 17, lineHeight: 1.65, color: "var(--ink-2)", maxWidth: "58ch", marginBottom: 26 }}>
            Paste an idea that is still on paper. BreakItFirst returns one dominant
            failure argument — a structural hinge and the cascade that follows from
            it — instead of five equal risks arranged in a checklist.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            <div style={{ border: "1px solid var(--hair)", borderRadius: 10, padding: "14px 16px", background: "var(--bg-raised)", minWidth: 240 }}>
              <p className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>PASS 1 / 14PX TITLE</p>
              <p style={{ fontFamily: "var(--spec-serif)", fontSize: 14, fontWeight: 550, marginBottom: 4 }}>
                Single point of failure
              </p>
              <p style={{ fontFamily: "var(--spec-serif)", fontSize: 12.5, fontStyle: "italic", color: "var(--ink-3)" }}>
                supply concentration, one vendor
              </p>
            </div>
            <div style={{ border: "1px solid var(--hair)", borderRadius: 10, padding: "14px 16px", background: "var(--bg-raised)", minWidth: 240 }}>
              <p className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>FIGURES / 11PX ITALIC</p>
              <p style={{ fontFamily: "var(--spec-serif)", fontSize: 28, fontWeight: 500, fontFeatureSettings: '"tnum"' }}>
                72% · 1.5 · 04
              </p>
              <p style={{ fontFamily: "var(--spec-serif)", fontSize: 11, fontStyle: "italic", color: "var(--ink-3)" }}>
                confidence band, stated not implied
              </p>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
