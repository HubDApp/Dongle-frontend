import React from "react";
import { ChevronDown } from "lucide-react";

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

    return (
      <div className="flex flex-col gap-2 w-full">
        <label htmlFor={selectId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <div className="relative">
          <select
            {...props}
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={[error ? errorId : "", !error && helperText ? helperId : ""].filter(Boolean).join(" ") || undefined}
            className={`w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border ${
              error ? "border-red-500/50 focus:border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50"
            } rounded-2xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-zinc-900 dark:text-zinc-100 ${className}`}
          >
            <option value="" disabled>Select a category</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
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
  }
);

SelectField.displayName = "SelectField";
