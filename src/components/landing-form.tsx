"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AnalyzingOverlay } from "@/components/analyzing-overlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CATEGORIES,
  EXAMPLE_CHIPS,
  MIN_IDEA_LENGTH,
  type Category,
} from "@/lib/categories";
import type { ProviderSettings } from "@/lib/provider-settings";
import { requestAnalysis } from "@/lib/analyze-client";
import { useLanguage } from "@/lib/i18n/context";
import type { FailureAnalysis } from "@/types/analysis";
import { cn } from "@/lib/utils";

type LandingFormProps = {
  providerReady: boolean;
  provider: ProviderSettings;
  onNeedProvider: () => void;
  onSuccess: (analysis: FailureAnalysis) => void;
};

export function LandingForm({
  providerReady,
  provider,
  onNeedProvider,
  onSuccess,
}: LandingFormProps) {
  const { locale, t } = useLanguage();
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState<Category>("Startup");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const charCount = idea.trim().length;
  const tooShort = charCount > 0 && charCount < MIN_IDEA_LENGTH;

  const helper = useMemo(() => {
    if (tooShort) {
      return t.form.tooShort(MIN_IDEA_LENGTH - charCount);
    }
    return t.form.helper;
  }, [charCount, tooShort, t]);

  function applyChip(label: string, cat: Category) {
    setIdea(
      locale === "id"
        ? `Ide produk: ${label}. Jelaskan cara kerjanya, siapa penggunanya, dan bagaimana model monetisasinya.`
        : `A product idea: ${label}. Expand on how it works, who uses it, and how it makes money.`,
    );
    setCategory(cat);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = idea.trim();
    if (trimmed.length < MIN_IDEA_LENGTH) {
      setError(t.errors.detail);
      return;
    }

    const words = trimmed.split(/\s+/).filter((w) => w.length >= 2);
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    if (uniqueWords.size < 5) {
      setError(t.errors.detail);
      return;
    }

    if (!providerReady) {
      onNeedProvider();
      setError(t.form.needProvider);
      return;
    }

    setLoading(true);

    try {
      const result = await requestAnalysis({
        idea: trimmed,
        category,
        provider,
        locale,
      });

      if (!result.ok) {
        if (result.code === "rate_limited" && result.retryAfterSec) {
          setError(t.errors.rateLimited(result.retryAfterSec));
        } else {
          setError(result.message || t.errors.failed);
        }
        return;
      }

      onSuccess(result.analysis);
    } catch {
      setError(t.errors.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Negative margin pulls overlay over GlowCard padding so no “inner box” shows */
    <div className="relative -m-6 min-h-[28rem] sm:-m-8">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full space-y-6 p-6 sm:p-8",
          loading && "pointer-events-none select-none opacity-0",
        )}
      >
        <div>
          <Label htmlFor="idea">{t.form.ideaLabel}</Label>
          <Textarea
            id="idea"
            value={idea}
            onChange={(e) => {
              setIdea(e.target.value);
              setError(null);
            }}
            placeholder={t.form.ideaPlaceholder}
            className="mt-1.5 min-h-[180px]"
            disabled={loading}
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
            <p className={cn(tooShort ? "text-warning" : "text-text-muted")}>
              {helper}
            </p>
            <p className="shrink-0 tabular-nums text-text-muted">
              {charCount} {t.form.chars}
            </p>
          </div>
        </div>

        <div>
          <Label>{t.form.categoryLabel}</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <motion.button
                  key={cat}
                  type="button"
                  disabled={loading}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    selected
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-border bg-background/50 text-text-secondary hover:border-border-strong hover:text-text",
                  )}
                >
                  {cat}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-text-muted">{t.form.examplesLabel}</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CHIPS.map((chip) => (
              <motion.button
                key={chip.label}
                type="button"
                disabled={loading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => applyChip(chip.label, chip.category)}
                className="rounded-full border border-dashed border-border bg-background/40 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-text"
              >
                {chip.label}
              </motion.button>
            ))}
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-3 text-sm text-accent"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="break-words leading-relaxed">{error}</p>
              <p className="text-[11px] text-accent/80">{t.form.tipProvider}</p>
            </div>
          </motion.div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto sm:min-w-[220px]"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.form.analyzing}
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              {t.form.cta}
            </>
          )}
        </Button>
      </form>

      <AnimatePresence>
        {loading && (
          <div
            className="absolute inset-0 z-20 overflow-hidden"
            style={{ borderRadius: 28 }}
          >
            <AnalyzingOverlay open={loading} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
