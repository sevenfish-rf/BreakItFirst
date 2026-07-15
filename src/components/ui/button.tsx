import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "relative overflow-hidden bg-accent text-white shadow-[0_0_0_1px_rgba(255,107,107,0.35),0_8px_24px_-8px_rgba(255,107,107,0.55)] hover:bg-accent-hover hover:shadow-[0_0_0_1px_rgba(255,107,107,0.45),0_12px_32px_-8px_rgba(255,107,107,0.65)]",
        secondary:
          "bg-white/[0.04] text-text border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.12] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]",
        ghost:
          "text-text-secondary hover:bg-white/[0.05] hover:text-text",
        outline:
          "border border-white/[0.1] bg-transparent text-text hover:bg-white/[0.04]",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {variant === "primary" && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 btn-shimmer opacity-60"
          />
        )}
        <span className="relative z-10 inline-flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";
