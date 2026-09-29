import React, { useState, useRef, useCallback } from "react";
import { FormField } from "./FormField";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Copy, Check } from "lucide-react";

interface CopyableFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  showCounter?: boolean;
  showCopyButton?: boolean;
}

export const CopyableFormField = React.forwardRef<HTMLInputElement, CopyableFormFieldProps>(
  ({
    label,
    error,
    helperText,
    showCounter = true,
    showCopyButton = true,
    className = "",
    id,
    value = "",
    onChange,
    ...props
  }, ref) => {
    const { isCopied, copy } = useCopyToClipboard(1500);
    const [isFocused, setIsFocused] = useState(false);
    const internalRef = useRef<HTMLInputElement | null>(null);
    const generatedId = React.useId();
    const buttonId = `${id || generatedId}-copy-btn`;

    const setRef = useCallback(
      (element: HTMLInputElement | null) => {
        internalRef.current = element;
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = element;
        }
      },
      [ref]
    );

    const handleCopy = async () => {
      const textToCopy = typeof value === "string" ? value : internalRef.current?.value || "";
      if (textToCopy) {
        await copy(textToCopy);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-end">
          <label htmlFor={id} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
          {showCopyButton && (isFocused || isCopied) && (
            <button
              id={buttonId}
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                isCopied
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
              }`}
              aria-label={isCopied ? "Copied to clipboard" : "Copy to clipboard"}
              aria-pressed={isCopied}
            >
              {isCopied ? (
                <>
                  <Check size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          )}
        </div>
        <FormField
          {...props}
          ref={setRef}
          label=""
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          error={error}
          helperText={helperText}
          showCounter={showCounter}
          className={className}
          aria-describedby={showCopyButton ? buttonId : undefined}
        />
      </div>
    );
  }
);

CopyableFormField.displayName = "CopyableFormField";
