import React from "react";

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <textarea
          ref={ref}
          rows={4}
          className={`px-4 py-3 bg-white dark:bg-zinc-900 border ${
            error ? "border-red-500" : "border-zinc-200 dark:border-zinc-800"
          } rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs font-medium text-red-500 ml-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

TextAreaField.displayName = "TextAreaField";
