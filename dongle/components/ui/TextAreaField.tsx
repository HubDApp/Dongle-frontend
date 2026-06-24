import React from "react";

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;

    return (
      <div className="flex flex-col gap-2 w-full">
        <label htmlFor={textareaId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          rows={4}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border ${
            error ? "border-red-500/50 focus:border-red-500" : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50"
          } rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none ${className}`}
          {...props}
        />
        {error && (
          <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

TextAreaField.displayName = "TextAreaField";
