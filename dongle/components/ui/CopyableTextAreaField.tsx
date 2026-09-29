import React, { useState, useRef, useCallback } from "react";
import { TextAreaField } from "./TextAreaField";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Copy, Check } from "lucide-react";

interface CopyableTextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  showCounter?: boolean;
  showWordCount?: boolean;
  targetWordCount?: number;
  showCopyButton?: boolean;
}

export const CopyableTextAreaField = React.forwardRef<HTMLTextAreaElement, CopyableTextAreaFieldProps>(
  ({
    label,
    error,
    showCounter = true,
    showWordCount = false,
    targetWordCount,
    showCopyButton = true,
    className = "",
    id,
    value = "",
    onChange,
    ...props
  }, ref) => {
    const { isCopied, copy } = useCopyToClipboard(1500);
    const [isFocused, setIsFocused] = useState(false);
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const generatedId = React.useId();
    const buttonId = `${id || generatedId}-copy-btn`;

    const setRef = useCallback(
      (element: HTMLTextAreaElement | null) => {
        internalRef.current = element;
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
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

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
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
        <TextAreaField
          {...props}
          ref={setRef}
          label=""
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          error={error}
          showCounter={showCounter}
          showWordCount={showWordCount}
          targetWordCount={targetWordCount}
          className={className}
          aria-describedby={showCopyButton ? buttonId : undefined}
        />
      </div>
    );
  }
);

CopyableTextAreaField.displayName = "CopyableTextAreaField";
