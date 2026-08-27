import React from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "glass" | "outline";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface style. Default: `default`. */
  variant?: CardVariant;
  /** Inner padding. Default: `md`. */
  padding?: CardPadding;
}

export const Card = ({ 
  className, 
  variant = "default", 
  padding = "md", 
  children, 
  ...props 
}: CardProps) => {
  const variants = {
    default: "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800",
    glass: "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-blue-500/5",
    outline: "bg-transparent border border-zinc-200 dark:border-zinc-800",
  };

  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "rounded-[2rem] overflow-hidden",
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
