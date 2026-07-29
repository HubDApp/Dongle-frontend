import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * Button component with flexible loading state handling.
 * 
 * Loading behavior examples:
 * - Default: Shows spinner after text, text remains visible
 *   `<Button isLoading={loading}>Submit</Button>` → shows "Submit" + spinner
 * 
 * - With loadingText: Replaces text during loading
 *   `<Button isLoading={loading} loadingText="Saving...">Save</Button>`
 *   → shows "Saving..." + spinner while loading
 * 
 * - With icon replacement: Spinner replaces left icon, text visible
 *   `<Button isLoading={loading} leftIcon={<Icon />} hideIconWhileLoading>Save</Button>`
 *   → shows spinner + "Save" while loading
 * 
 * - Icon-only buttons: Show spinner with screen reader text
 *   `<Button isLoading={loading} leftIcon={<Icon />} />`
 *   → shows spinner, screen reader announces "Loading..."
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "error";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  /** Optional text to show instead of children while loading */
  loadingText?: string;
  /** When true, spinner replaces the left icon. Default false keeps spinner as separate element. */
  hideIconWhileLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = "primary", 
    size = "md", 
    isLoading, 
    loadingText, 
    hideIconWhileLoading = false,
    leftIcon, 
    rightIcon, 
    children, 
    disabled, 
    ...props 
  }, ref) => {
    const variants = {
      primary: "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90",
      secondary: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700",
      outline: "bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900",
      ghost: "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white",
      error: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm rounded-xl",
      md: "px-6 py-3 text-base rounded-2xl",
      lg: "px-8 py-4 text-lg rounded-[1.5rem] font-bold",
    };

    // Determine what text to display
    const displayText = isLoading && loadingText ? loadingText : children;
    
    // Determine left icon: spinner when loading (if hideIconWhileLoading), otherwise leftIcon
    const displayLeftIcon = isLoading && hideIconWhileLoading ? 
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 
      (!isLoading && leftIcon);
    
    // Show spinner after text only when loading and not replacing the left icon
    const showSpinner = isLoading && !hideIconWhileLoading;

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        aria-busy={isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-medium",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {/* Left icon or spinner replacement */}
        {displayLeftIcon}
        
        {/* Main label text - preserved during loading for context */}
        {displayText}
        
        {/* Right icon - hidden while loading to prevent layout shift */}
        {!isLoading && rightIcon}
        
        {/* Spinner shown after text when loading and hideIconWhileLoading is false */}
        {showSpinner && (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        )}
        
        {/* Screen reader only text for icon-only buttons without children during loading */}
        {isLoading && !loadingText && !children && (
          <span className="sr-only">Loading...</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
