import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-sm text-text placeholder:text-text-muted outline-none transition-all focus:border-accent/40 focus:bg-white/[0.045] focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
