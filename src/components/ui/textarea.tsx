import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[160px] w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-text placeholder:text-text-muted outline-none transition-all focus:border-accent/40 focus:bg-white/[0.045] focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
