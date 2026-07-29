import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "outline";
}

export const Badge = ({ className, variant = "primary", ...props }: BadgeProps) => {
  const variants = {
    primary: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    secondary: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
    outline: "bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
