import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

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
      className={`${inter.variable} ${fraunces.variable} ${plexMono.variable}`}
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
