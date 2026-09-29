/**
 * SelectField — Issue #531 (disabled state handling)
 *
 * Changes from baseline:
 *  - Disabled fields suppress error display (validation is skipped visually)
 *  - Disabled fields receive visual dimming + cursor-not-allowed
 *  - aria-disabled is set to complement the native disabled attribute
 *  - Label is dimmed when the field is disabled
 *  - Chevron icon is also dimmed for disabled state
 */

import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
}

export const SelectField = React.forwardRef<
  HTMLSelectElement,
  SelectFieldProps
>(({ label, options, error, className = "", id, disabled, ...props }, ref) => {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;

  // Disabled fields skip validation display.
  const displayError = !disabled && error;

  return (
    <div className="flex flex-col gap-2 w-full">
      <label
        htmlFor={selectId}
        className={cn(
          "text-sm font-semibold transition-colors",
          disabled
            ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
            : "text-zinc-700 dark:text-zinc-300",
        )}
      >
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-disabled={disabled ? true : undefined}
          aria-invalid={displayError ? true : undefined}
          aria-describedby={displayError ? errorId : undefined}
          className={cn(
            "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl",
            "appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
            "text-zinc-900 dark:text-zinc-100",
            displayError
              ? "border-red-500/50 focus:border-red-500"
              : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
            disabled &&
              "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500",
            className,
          )}
        >
          <option value="" disabled>
            Select a category
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
            disabled ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-400",
          )}
          aria-hidden="true"
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {/* Errors are suppressed for disabled fields */}
      {displayError && (
        <span
          id={errorId}
          className="text-xs font-medium text-red-500 ml-1"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
});

SelectField.displayName = "SelectField";
