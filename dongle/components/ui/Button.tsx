import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * Button component with flexible loading state handling.
 *
 * Loading behavior examples:
 * - Default: Keeps label visible and appends a spinner
 *   `<Button isLoading={loading}>Submit</Button>` → "Submit" + spinner
 *
 * - With loadingText: Accessible replacement label while loading
 *   `<Button isLoading={loading} loadingText="Saving...">Save</Button>`
 *
 * - With left icon: Spinner replaces the left icon (same slot, no layout shift)
 *   `<Button isLoading={loading} leftIcon={<Icon />}>Save</Button>`
 *
 * - Icon-only: Spinner + screen-reader "Loading..." label
 *   `<Button isLoading={loading} leftIcon={<Icon />} />`
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "error";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  /** Optional text to show instead of children while loading */
  loadingText?: string;
  /**
   * When true, spinner is rendered in the left-icon slot.
   * When a leftIcon is present, the spinner replaces it automatically.
   */
  hideIconWhileLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      hideIconWhileLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90",
      secondary:
        "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700",
      outline:
        "bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900",
      ghost:
        "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white",
      error: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm rounded-xl",
      md: "px-6 py-3 text-base rounded-2xl",
      lg: "px-8 py-4 text-lg rounded-[1.5rem] font-bold",
    };

    const displayText = isLoading && loadingText ? loadingText : children;
    const replaceLeftIconWithSpinner =
      isLoading && (hideIconWhileLoading || Boolean(leftIcon));
    const showTrailingSpinner = isLoading && !replaceLeftIconWithSpinner;

    const spinner = (
      <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
    );

    return (
      <button
        ref={ref}
        {...props}
        disabled={isLoading || disabled}
        aria-busy={isLoading || undefined}
        aria-live={isLoading ? "polite" : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-medium",
          variants[variant],
          sizes[size],
          className,
        )}
      >
        {replaceLeftIconWithSpinner ? spinner : leftIcon}

        {displayText}

        {!isLoading && rightIcon}

        {showTrailingSpinner && spinner}

        {isLoading && !loadingText && !children && (
          <span className="sr-only">Loading...</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
