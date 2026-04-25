import React from "react";

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, options, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            className={`w-full px-4 py-3 bg-white dark:bg-zinc-900 border ${
              error ? "border-red-500" : "border-zinc-200 dark:border-zinc-800"
            } rounded-2xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900 dark:text-zinc-100 ${className}`}
            {...props}
          >
            <option value="" disabled>Select a category</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <span className="text-xs font-medium text-red-500 ml-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

SelectField.displayName = "SelectField";
