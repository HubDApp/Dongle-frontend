import React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "error";
  size?: "sm" | "md" | "lg";
  /** Required accessible name for icon-only controls */
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const variants = {
      default: "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white",
      ghost: "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
      error: "hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-500 hover:text-red-500",
    };

    const sizes = {
      sm: "p-1.5 rounded-lg",
      md: "p-2 rounded-xl",
      lg: "p-3 rounded-2xl",
    };

    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    const content = React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<{ className?: string; strokeWidth?: number }>, {
          className: cn(
            (children as React.ReactElement<{ className?: string }>).props.className,
            iconSizes[size],
            "shrink-0"
          ),
          strokeWidth: (children as React.ReactElement<{ strokeWidth?: number }>).props.strokeWidth ?? 2,
        })
      : children;

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {content}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
