"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import s from "./header-island.module.css";

type HeaderProps = {
  /** Omit both on marketing pages — hides provider status + settings. */
  onOpenSettings?: () => void;
  providerReady?: boolean;
};

export function Header({ onOpenSettings, providerReady }: HeaderProps) {
  const { locale, setLocale, t } = useLanguage();
  const { mode, toggle } = useTheme();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compact state ONLY hides sub-caption "What Would Break This?" & secondary text.
  // Logo mark and "BreakItFirst" title remain visible in BOTH scenarios.
  const isCompact = scrolled && !hovered;

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/app", label: t.nav.app },
  ];

  // Active link index (0 = Home, 1 = App)
  const activeIndex = links.findIndex((l) => l.href === pathname) < 0 ? 0 : links.findIndex((l) => l.href === pathname);

  return (
    <div className={s.islandWrapper}>
      <header
        className={s.island}
        data-compact={isCompact}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Brand Mark & Title (ALWAYS VISIBLE in both scenarios) */}
        <Link className={s.brand} href="/" aria-label="BreakItFirst home">
          {/* Logo Mark */}
          <svg
            className={s.brandMark}
            width="30"
            height="30"
            viewBox="0 0 30 30"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20.8 3.2 A13 13 0 1 0 26.8 15"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M22 4 L16.5 11.5 L20 13.5 L13 22"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Title ALWAYS shown */}
          <span className={s.brandName}>{t.brand}</span>

          {/* Sub-caption "What Would Break This?" (Smooth GPU-native CSS collapse) */}
          <span className={s.brandTag}>{t.tagline}</span>
        </Link>

        {/* Dynamic Nav Links with 100% Horizontal Sliding Active Indicator */}
        <nav className={s.navLinks} aria-label="Primary">
          <motion.span
            className={s.navActivePill}
            animate={{
              x: activeIndex === 1 ? "105%" : "0%",
            }}
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />

          {links.map((l) => {
            const isActive = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={s.navLink}
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
              >
                <span style={{ position: "relative", zIndex: 1 }}>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className={s.divider} />

        {/* Provider Status Pill (if on app page) */}
        {onOpenSettings && (
          <button
            type="button"
            className={s.statusPill}
            data-off={!providerReady}
            onClick={onOpenSettings}
            title="Analysis provider status"
          >
            <span className={s.statusDot} aria-hidden="true" />
            <span className={s.statusText}>
              {providerReady ? t.nav.providerReady : t.nav.providerNotSet}
            </span>
          </button>
        )}

        {/* Right Controls */}
        <div className={s.controls}>
          <LanguageToggle locale={locale} onChange={setLocale} />

          {/* Theme Toggle Button (3-way preset cycle: Navy -> Crimson -> Dark) */}
          <button
            className={s.iconBtn}
            onClick={toggle}
            aria-label="Cycle theme presets"
            title={
              mode === "navy"
                ? "Light Combo 1: Navy & Buttercream (Click to switch to Crimson)"
                : mode === "crimson"
                ? "Light Combo 2: Emerald & Linen (Click to switch to Dark Mode)"
                : "Dark Mode: Midnight Obsidian (Click to switch to Navy)"
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              {mode === "navy" ? (
                <motion.svg
                  key="navy-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.5, rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <circle cx="8" cy="8" r="3.2" />
                  <path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" />
                </motion.svg>
              ) : mode === "crimson" ? (
                <motion.svg
                  key="crimson-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ scale: 0.5, rotate: 90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.5, rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <circle cx="8" cy="8" r="4.5" />
                  <path d="M8 3.5v9M3.5 8h9" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="moon-icon"
                  width="17"
                  height="17"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ scale: 0.5, rotate: 90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.5, rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path d="M13.5 9.4A6 6 0 0 1 6.6 2.5a6 6 0 1 0 6.9 6.9Z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          {/* Provider Settings Gear Button */}
          {onOpenSettings && (
            <button
              className={s.iconBtn}
              onClick={onOpenSettings}
              aria-label={t.nav.provider}
              title={t.nav.provider}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="8" r="2.2" />
                <path d="M13.3 10.1a1.2 1.2 0 0 0 .24 1.32l.04.05a1.45 1.45 0 1 1-2.05 2.05l-.04-.04a1.2 1.2 0 0 0-1.33-.24 1.2 1.2 0 0 0-.72 1.1v.12a1.45 1.45 0 0 1-2.9 0v-.06a1.2 1.2 0 0 0-.78-1.1 1.2 1.2 0 0 0-1.32.24l-.05.04A1.45 1.45 0 1 1 2.34 11.5l.04-.04a1.2 1.2 0 0 0 .24-1.33 1.2 1.2 0 0 0-1.1-.72h-.12a1.45 1.45 0 0 1 0-2.9h.06a1.2 1.2 0 0 0 1.1-.78 1.2 1.2 0 0 0-.24-1.32l-.04-.05A1.45 1.45 0 1 1 4.5 2.34l.04.04a1.2 1.2 0 0 0 1.33.24h.06a1.2 1.2 0 0 0 .72-1.1v-.12a1.45 1.45 0 0 1 2.9 0v.06a1.2 1.2 0 0 0 .72 1.1 1.2 1.2 0 0 0 1.32-.24l.05-.04a1.45 1.45 0 1 1 2.05 2.05l-.04.04a1.2 1.2 0 0 0-.24 1.33v.06a1.2 1.2 0 0 0 1.1.72h.12a1.45 1.45 0 0 1 0 2.9h-.06a1.2 1.2 0 0 0-1.1.72Z" />
              </svg>
            </button>
          )}
        </div>
      </header>
    </div>
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
    <div className={s.langToggle} role="group" aria-label="Language">
      {(["en", "id"] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={s.langOpt}
          data-active={locale === code}
          onClick={() => onChange(code)}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
