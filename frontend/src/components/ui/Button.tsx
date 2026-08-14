"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/* ─── Button Variants ─── */
const buttonVariants = cva(
  "button-base",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-electric-600 to-cyan-500 text-white shadow-glow-sm hover:shadow-glow-purple hover:brightness-110 active:scale-[0.97]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost:
          "bg-transparent text-foreground hover:bg-white/5 hover:backdrop-blur-sm",
        glow:
          "bg-transparent border border-electric-500/50 text-electric-400 hover:bg-electric-500/10 hover:border-electric-400 hover:shadow-glow-sm animate-glow-purple",
        cyan:
          "bg-gradient-to-r from-cyan-600 to-cyan-400 text-white shadow-glow-cyan hover:brightness-110 active:scale-[0.97]",
        destructive:
          "bg-danger text-white hover:bg-danger-dark shadow-sm",
        outline:
          "border border-electric-500/30 bg-transparent hover:bg-electric-500/10 hover:border-electric-400 text-foreground",
        link: "text-electric-400 underline-offset-4 hover:underline hover:text-electric-300",
      },
      size: {
        default: "h-10 px-5 py-2 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

/* ─── Button Props ─── */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/* ─── Button Component ─── */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || isLoading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && (
          <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
