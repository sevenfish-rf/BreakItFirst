"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";

type HeaderProps = {
  /** Omit both on marketing pages — hides provider status + settings. */
  onOpenSettings?: () => void;
  providerReady?: boolean;
};

export function Header({ onOpenSettings, providerReady }: HeaderProps) {
  const { locale, setLocale, t } = useLanguage();
  const { toggle } = useTheme();
  const pathname = usePathname();

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/app", label: t.nav.app },
  ];

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link className="brand" href="/" aria-label="BreakItFirst home">
          {/* logo mark: a circle fractured by a fault line */}
          <svg
            className="brand-mark"
            width="30"
            height="30"
            viewBox="0 0 30 30"
            fill="none"
            aria-hidden="true"
          >
            <path
              className="mk-ink"
              d="M20.8 3.2 A13 13 0 1 0 26.8 15"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              className="mk-sig"
              d="M22 4 L16.5 11.5 L20 13.5 L13 22"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="brand-name">{t.brand}</span>
          <span className="brand-tag">{t.tagline}</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${pathname === l.href ? " on" : ""}`}
              aria-current={pathname === l.href ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-spacer" />

        {onOpenSettings ? (
          <span
            className={`status-pill${providerReady ? "" : " off"}`}
            title="Analysis provider status"
          >
            <span className="status-dot" aria-hidden="true" />
            <span className="txt">
              {providerReady ? t.nav.providerReady : t.nav.providerNotSet}
            </span>
          </span>
        ) : null}

        <LanguageToggle locale={locale} onChange={setLocale} />

        <button
          className="icon-btn theme-toggle"
          onClick={toggle}
          aria-label="Toggle light and dark theme"
        >
          <svg
            className="sun"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <circle cx="8" cy="8" r="3.2" />
            <path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" />
          </svg>
          <svg
            className="moon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13.5 9.4A6 6 0 0 1 6.6 2.5a6 6 0 1 0 6.9 6.9Z" />
          </svg>
        </button>

        {onOpenSettings ? (
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          aria-label={t.nav.provider}
          title={t.nav.provider}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="8" r="2.2" />
            <path d="M13.3 10.1a1.2 1.2 0 0 0 .24 1.32l.04.05a1.45 1.45 0 1 1-2.05 2.05l-.04-.04a1.2 1.2 0 0 0-1.33-.24 1.2 1.2 0 0 0-.72 1.1v.12a1.45 1.45 0 0 1-2.9 0v-.06a1.2 1.2 0 0 0-.78-1.1 1.2 1.2 0 0 0-1.32.24l-.05.04A1.45 1.45 0 1 1 2.34 11.5l.04-.04a1.2 1.2 0 0 0 .24-1.33 1.2 1.2 0 0 0-1.1-.72h-.12a1.45 1.45 0 0 1 0-2.9h.06a1.2 1.2 0 0 0 1.1-.78 1.2 1.2 0 0 0-.24-1.32l-.04-.05A1.45 1.45 0 1 1 4.5 2.34l.04.04a1.2 1.2 0 0 0 1.33.24h.06a1.2 1.2 0 0 0 .72-1.1v-.12a1.45 1.45 0 0 1 2.9 0v.06a1.2 1.2 0 0 0 .72 1.1 1.2 1.2 0 0 0 1.32-.24l.05-.04a1.45 1.45 0 1 1 2.05 2.05l-.04.04a1.2 1.2 0 0 0-.24 1.33v.06a1.2 1.2 0 0 0 1.1.72h.12a1.45 1.45 0 0 1 0 2.9h-.06a1.2 1.2 0 0 0-1.1.72Z" />
          </svg>
        </button>
        ) : null}
      </div>
    </header>
  );
}

function LanguageToggle({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
}) {
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      {(["en", "id"] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-opt${locale === code ? " on" : ""}`}
          onClick={() => onChange(code)}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
