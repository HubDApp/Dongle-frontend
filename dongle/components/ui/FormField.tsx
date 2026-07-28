import React, { useId, forwardRef } from 'react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id: customId, className = '', ...props }, ref) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-zinc-300 dark:border-zinc-700'
          } ${className}`}
          {...props}
        />
        {error && (
          <span id={errorId} className="text-xs text-red-500 font-medium">
            {error}
          </span>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
