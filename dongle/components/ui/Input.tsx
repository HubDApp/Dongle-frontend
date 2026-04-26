import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all outline-none",
          "focus:ring-2 focus:ring-blue-500/20",
          error 
            ? "border-red-500/50 focus:border-red-500" 
            : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
