import React from "react";
import { Input } from "./Input";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <Input
          ref={ref}
          error={!!error}
          className={className}
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

FormField.displayName = "FormField";
