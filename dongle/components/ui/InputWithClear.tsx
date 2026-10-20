"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ClearButton } from "./ClearButton";

export interface InputWithClearProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Draws the invalid border. Pair with `aria-invalid` and `aria-describedby`. */
  error?: boolean;
  /** Label for accessibility */
  label?: string;
  /** Show clear button */
  showClear?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
}

/**
 * Input component with integrated clear button
 * 
 * Features:
 * - Clear button appears on focus when field has value
 * - Fully accessible
 * - Maintains all Input component functionality
 * - Works with disabled and readOnly states
 * 
 * @example
 * ```tsx
 * <InputWithClear
 *   value={searchQuery}
 *   onChange={(e) => setSearchQuery(e.target.value)}
 *   onClear={() => setSearchQuery('')}
 *   placeholder="Search..."
 *   showClear
 * />
 * ```
 */
export const InputWithClear = React.forwardRef<
  HTMLInputElement,
  InputWithClearProps
>(
  (
    {
      className,
      error,
      disabled,
      readOnly,
      label,
      showClear = true,
      onClear,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    const hasValue =
      value !== undefined && value !== null && String(value).length > 0;

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
      // Refocus input after clearing
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const showClearButton =
      showClear && !disabled && !readOnly && hasValue && isFocused;

    return (
      <div className="relative w-full">
        <input
          ref={inputRef}
          id={id}
          disabled={disabled}
          readOnly={readOnly}
          aria-disabled={disabled ? true : undefined}
          aria-readonly={readOnly ? true : undefined}
          value={value}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all outline-none",
            "focus:ring-2 focus:ring-blue-500/20",
            // Add padding for clear button when it's visible
            showClearButton && "pr-12",
            error
              ? "border-red-500/50 focus:border-red-500"
              : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
            // Disabled: dimmed, pointer blocked, no interaction
            disabled &&
              "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500 pointer-events-none",
            // Read-only: still focusable and selectable, but visually muted
            readOnly &&
              !disabled &&
              "cursor-default bg-zinc-100/60 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 focus:ring-0 select-text",
            className
          )}
          {...props}
        />
        {showClearButton && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <ClearButton
              onClear={handleClear}
              hasValue={hasValue}
              fieldId={id || "input"}
              fieldLabel={label}
              visible={true}
            />
          </div>
        )}
      </div>
    );
  }
);

InputWithClear.displayName = "InputWithClear";
