import type { Metadata } from "next";
import { Crimson_Pro, Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

/**
 * Four faces, one job each.
 *
 * Display / prose serif (`--serif`) is Crimson Pro: a screen rebuild of Crimson
 * Text with a taller x-height and open counters, so it holds at the 11-13px
 * italic captions as well as the 44px headline. Variable 200-900 with italic.
 */
const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

/**
 * Body / interface (`--sans`) is Hanken Grotesk: humanist grotesque that stays
 * legible at small sizes without the flatness of a system font. Variable
 * 100-900, so the 550/600/650 call sites are real cuts.
 */
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

/**
 * Figures (`--figure`) is Fraunces — chosen for the numerals specifically.
 * Every counter, step index, pass number and stat in the route routes here
 * instead of to `--serif`, so the digits keep Fraunces' character while the
 * running prose stays Crimson Pro. `opsz` is requested because these numerals
 * run from 12px step badges up to the 64px metric, and the optical-size axis is
 * what keeps the small ones from thinning out.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

/** Data voice (`--mono`): labels, timers, byte counts. Unchanged. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BreakItFirst — What Would Break This?",
  description:
    "Paste your startup, app, API, or product idea. We'll tell you how it fails before reality does.",
};

/**
 * Set the theme class before first paint to avoid a flash of the wrong mode.
 * Defaults to light; respects a stored choice, else system preference.
 */
const themeScript = `(function(){try{var k='breakitfirst.theme';var s=localStorage.getItem(k);var d=(s==='dark')||((s!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${crimsonPro.variable} ${hankenGrotesk.variable} ${fraunces.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      {/* suppressHydrationWarning: browser extensions often inject attrs on body */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
