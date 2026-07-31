import React from "react";
import { Input } from "./Input";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const counterId = `${inputId}-counter`;
    const helperId = `${inputId}-helper`;

    const [charCount, setCharCount] = React.useState(0);

    React.useEffect(() => {
      if (typeof props.value === "string") {
        setCharCount(props.value.length);
      } else if (typeof props.defaultValue === "string") {
        setCharCount(props.defaultValue.length);
      }
    }, [props.value, props.defaultValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharCount(e.target.value.length);
      props.onChange?.(e);
    };

    const isNearLimit = props.maxLength && charCount >= props.maxLength * 0.9;
    const isAtLimit = props.maxLength && charCount >= props.maxLength;

    const counterClass = isAtLimit
      ? "text-red-500"
      : isNearLimit
      ? "text-amber-500"
      : "text-zinc-500";

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-end">
          <label htmlFor={inputId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
          {props.maxLength && (
            <span
              id={counterId}
              className={`text-xs font-medium ${counterClass} transition-colors`}
              aria-live="polite"
            >
              {charCount} / {props.maxLength}
            </span>
          )}
        </div>
        <Input
          {...props}
          ref={ref}
          id={inputId}
          error={!!error}
          onChange={handleChange}
          aria-invalid={error || isAtLimit ? true : undefined}
          aria-describedby={[error ? errorId : "", props.maxLength ? counterId : "", helperText ? helperId : ""].filter(Boolean).join(" ") || undefined}
          className={className}
        />
        {error && (
          <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";