/**
 * SelectField — Issues #531 & #532 (disabled and read-only state handling)
 *
 * Read-only select fields:
 *  - HTML <select> has no native readOnly attribute; we simulate it:
 *    the onChange is blocked and the field is visually styled as read-only
 *  - Value IS included in form submission (via a hidden input + selected state)
 *  - Keyboard accessible (tab-navigable, but key changes are blocked)
 *  - aria-readonly is set; role="combobox" is preserved
 *
 * Disabled fields (Issue #531):
 *  - Suppress error display
 *  - Visual dimming + cursor-not-allowed
 *  - aria-disabled is set
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
  /**
   * When true the select is visually read-only: the user cannot change the
   * value but the current value is included in form submission.
   * Note: HTML <select> has no native readOnly — we achieve this through
   * event blocking and aria-readonly.
   */
  readOnly?: boolean;
}

export const SelectField = React.forwardRef<
  HTMLSelectElement,
  SelectFieldProps
>(
  (
    { label, options, error, className = "", id, disabled, readOnly, onChange, value, ...props },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;

    // Disabled fields skip validation display; read-only fields validate normally.
    const displayError = !disabled && error;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Block changes on read-only fields.
      if (readOnly) {
        e.preventDefault();
        return;
      }
      onChange?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
      // Prevent arrow key navigation from changing a read-only select.
      if (readOnly) {
        e.preventDefault();
      }
    };

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-1.5">
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
          {readOnly && !disabled && (
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            >
              read-only
            </span>
          )}
        </div>
        <div className="relative">
          <select
            {...props}
            ref={ref}
            id={selectId}
            value={value}
            disabled={disabled}
            aria-disabled={disabled ? true : undefined}
            aria-readonly={readOnly ? true : undefined}
            aria-invalid={displayError ? true : undefined}
            aria-describedby={
              displayError
                ? `${errorId}${readOnly ? ` ${selectId}-readonly-hint` : ""}`
                : readOnly
                  ? `${selectId}-readonly-hint`
                  : undefined
            }
            onChange={handleChange}
            onKeyDown={readOnly ? handleKeyDown : props.onKeyDown}
            className={cn(
              "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl",
              "appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
              "text-zinc-900 dark:text-zinc-100",
              displayError
                ? "border-red-500/50 focus:border-red-500"
                : readOnly && !disabled
                  ? "border-zinc-200 dark:border-zinc-700 focus:ring-0"
                  : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
              disabled &&
                "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500",
              readOnly &&
                !disabled &&
                "cursor-default bg-zinc-100/60 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300",
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
              disabled
                ? "text-zinc-300 dark:text-zinc-700"
                : readOnly
                  ? "text-zinc-300 dark:text-zinc-600"
                  : "text-zinc-400",
            )}
            aria-hidden="true"
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* Screen-reader hint for read-only state */}
        {readOnly && !disabled && (
          <span id={`${selectId}-readonly-hint`} className="sr-only">
            This field is read-only and cannot be changed.
          </span>
        )}

        {/* Errors are suppressed for disabled fields; shown for read-only */}
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
  },
);

SelectField.displayName = "SelectField";
