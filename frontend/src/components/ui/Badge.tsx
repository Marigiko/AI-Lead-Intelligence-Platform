"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/* ─── Badge Variants ─── */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 border",
  {
    variants: {
      variant: {
        default:
          "bg-muted/50 text-muted-foreground border-border",
        success:
          "badge-success",
        warning:
          "badge-warning",
        info:
          "badge-info",
        danger:
          "badge-danger",
        electric:
          "badge-electric animate-pulse-glow",
        cyan:
          "badge-cyan",
        outline:
          "border border-electric-500/30 text-electric-400 bg-transparent",
        gradient:
          "bg-gradient-to-r from-electric-500/20 to-cyan-500/20 text-electric-300 border-electric-500/30",
        purple:
          "badge-electric",
      },
      size: {
        default: "text-xs px-2.5 py-0.5",
        sm: "text-[10px] px-2 py-0.5",
        lg: "text-sm px-3 py-1",
      },
      animated: {
        true: "animate-fade-in",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animated: false,
    },
  }
);

/* ─── Badge Props ─── */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

/* ─── Badge Component ─── */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, animated, dot = false, dotColor, children, ...props }, ref) => {
    const variantName = variant ?? "default";
    const dotColorClass = dotColor ?? {
      default: "bg-muted-foreground",
      success: "bg-success",
      warning: "bg-warning",
      info: "bg-info",
      danger: "bg-danger",
      electric: "bg-electric-400",
      cyan: "bg-cyan-400",
      outline: "bg-electric-400",
      gradient: "bg-electric-400",
      purple: "bg-electric-400",
    }[variantName] ?? "bg-muted-foreground";

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, animated }), className)}
        role="status"
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full animate-pulse-glow",
              dotColorClass
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
