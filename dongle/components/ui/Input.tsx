/**
 * Input — Issues #531 & #532 (disabled and read-only state visual handling)
 *
 * Disabled state: opacity dimming, cursor-not-allowed, muted background.
 * Read-only state: muted background, cursor-default, focusable/selectable,
 *                  ring removed, aria-readonly set.
 */

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Draws the invalid border. Pair with `aria-invalid` and `aria-describedby`. */
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, disabled, readOnly, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        readOnly={readOnly}
        aria-disabled={disabled ? true : undefined}
        aria-readonly={readOnly ? true : undefined}
        className={cn(
          "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all outline-none",
          "focus:ring-2 focus:ring-blue-500/20",
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
          // Disabled: dimmed, pointer blocked, no interaction
          disabled &&
            "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500 pointer-events-none",
          // Read-only: still focusable and selectable, but visually muted
          readOnly &&
            !disabled &&
            "cursor-default bg-zinc-100/60 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 focus:ring-0 select-text",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
