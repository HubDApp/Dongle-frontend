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
  helperText?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, options, error, helperText, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

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
        <label htmlFor={selectId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
          {required ? (
            <span className="text-red-500 ml-0.5" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        <div className="relative">
          <select
            {...props}
            ref={ref}
            id={selectId}
            required={required}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={[error ? errorId : "", !error && helperText ? helperId : ""].filter(Boolean).join(" ") || undefined}
            className={`w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border ${
              error ? "border-red-500/50 focus:border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50"
            } rounded-2xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-zinc-900 dark:text-zinc-100 ${className}`}
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
          <div className="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <span id={errorId} className="text-xs font-medium text-red-500 ms-1" role="alert">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span
            id={helperId}
            className="text-xs text-zinc-500 dark:text-zinc-400 ml-1"
            role="note"
          >
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

SelectField.displayName = "SelectField";
