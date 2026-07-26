"use client";

import { useLanguage } from "@/lib/i18n/context";

/** Shared editorial footer (landing + app). Must render inside LanguageProvider. */
export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <svg
          className="brand-mark"
          width="22"
          height="22"
          viewBox="0 0 30 30"
          fill="none"
          aria-hidden="true"
        >
          <path
            className="mk-ink"
            d="M20.8 3.2 A13 13 0 1 0 26.8 15"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            className="mk-sig"
            d="M22 4 L16.5 11.5 L20 13.5 L13 22"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="brand-name">{t.brand}</span>
        <p>{t.tagline}</p>
        <div className="nav-spacer" />
        <span className="mono">{t.brand.toUpperCase()} · EDITORIAL ANALYST</span>
      </div>
    </footer>
  );
}
