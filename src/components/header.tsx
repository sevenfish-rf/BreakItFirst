"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeCircles } from "@/components/ui/theme-circles";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

type HeaderProps = {
  onOpenSettings: () => void;
  providerReady: boolean;
};

export function Header({ onOpenSettings, providerReady }: HeaderProps) {
  const { locale, setLocale, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "nav-bar transition-[background,box-shadow] duration-300",
          scrolled &&
            "bg-[rgba(7,7,8,0.85)] shadow-[0_8px_32px_-16px_rgba(0,0,0,0.8)]",
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[3.75rem] sm:px-6">
          {/* Brand */}
          <a href="/" className="group flex min-w-0 items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 ring-1 ring-accent/30 transition-transform duration-300 group-hover:scale-105">
              <Zap
                className="h-4 w-4 text-accent"
                strokeWidth={2.5}
                fill="currentColor"
                fillOpacity={0.15}
              />
              <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/10" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-semibold tracking-tight text-text">
                  {t.brand}
                </span>
                <span className="hidden rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-text-muted sm:inline">
                  beta
                </span>
              </div>
              <p className="hidden truncate text-[11px] text-text-muted sm:block">
                {t.tagline}
              </p>
            </div>
          </a>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeCircles />
            <LanguageToggle locale={locale} onChange={setLocale} />

            <div
              className={cn(
                "hidden h-8 items-center gap-2 rounded-full border px-3 text-[11px] font-medium md:inline-flex",
                providerReady
                  ? "border-healthy/20 bg-healthy/10 text-healthy"
                  : "border-white/[0.08] bg-white/[0.03] text-text-muted",
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    providerReady
                      ? "animate-ping bg-healthy"
                      : "bg-text-muted/40",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-1.5 w-1.5 rounded-full",
                    providerReady ? "bg-healthy" : "bg-text-muted",
                  )}
                />
              </span>
              {providerReady ? t.nav.providerReady : t.nav.providerNotSet}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onOpenSettings}
              aria-label={t.nav.provider}
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.nav.provider}</span>
            </Button>
          </div>
        </div>
      </motion.div>
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
    <div
      className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5"
      role="group"
      aria-label="Language"
    >
      {(["en", "id"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className={cn(
              "relative rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
              active ? "text-text" : "text-text-muted hover:text-text-secondary",
            )}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 rounded-full bg-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative z-10">{code}</span>
          </button>
        );
      })}
    </div>
  );
}
