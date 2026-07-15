import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BreakItFirst — What Would Break This?",
  description:
    "Paste your startup, app, API, or product idea. We'll tell you how it fails before reality does.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: browser extensions often inject attrs on body (e.g. bis_register) */}
      <body
        className="flex min-h-full flex-col bg-background text-text"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
