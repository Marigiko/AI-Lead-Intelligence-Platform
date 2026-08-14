"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/* ─── Card Variants ─── */
const cardVariants = cva(
  "relative overflow-hidden rounded-xl transition-smooth",
  {
    variants: {
      variant: {
        default: "glass-card",
        gradient:
          "glass-card bg-gradient-to-br from-electric-500/10 via-transparent to-cyan-500/10 border-electric-500/20",
        glow: "glass-card glow-purple",
        purple: "glass-card glass-purple",
        cyan: "glass-card glass-cyan",
        subtle: "glass-subtle rounded-xl",
        bordered: "border border-border bg-card/50 backdrop-blur-sm",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      hover: {
        true: "hover-lift cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      hover: false,
    },
  }
);

/* ─── Card Props ─── */
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
  animated?: boolean;
}

/* ─── Card Component ─── */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, padding, hover, asChild = false, animated = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, hover }),
          animated && "animate-scale-in",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

/* ─── CardHeader ─── */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

/* ─── CardTitle ─── */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-balance",
      className
    )}
    {...props}
  />
));

CardTitle.displayName = "CardTitle";

/* ─── CardDescription ─── */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

/* ─── CardContent ─── */
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "default" | "lg";
}

const paddingMap: Record<string, string> = {
  none: "",
  default: "p-6",
  sm: "p-4",
  lg: "p-8",
};

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(paddingMap[padding], className)}
      {...props}
    />
  )
);

CardContent.displayName = "CardContent";

/* ─── CardFooter ─── */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center pt-4 border-t border-border/50",
      className
    )}
    {...props}
  />
));

CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
