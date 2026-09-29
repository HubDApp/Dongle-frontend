/**
 * Input — Issue #531 (disabled state visual handling)
 *
 * Disabled state: opacity dimming, cursor-not-allowed, muted background.
 */

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Draws the invalid border. Pair with `aria-invalid` and `aria-describedby`. */
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled ? true : undefined}
        className={cn(
          "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all outline-none",
          "focus:ring-2 focus:ring-blue-500/20",
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
          disabled &&
            "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500 pointer-events-none",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
