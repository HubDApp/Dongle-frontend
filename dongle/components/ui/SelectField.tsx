import React, { useId, forwardRef } from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  id?: string;
  options: SelectOption[];
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, id: customId, options, className = '', ...props }, ref) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <select
          id={id}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-zinc-300 dark:border-zinc-700'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="dark:bg-zinc-800">
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span id={errorId} className="text-xs text-red-500 font-medium">
            {error}
          </span>
        )}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
