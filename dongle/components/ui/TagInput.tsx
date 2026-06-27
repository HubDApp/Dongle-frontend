import React, { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  error?: string;
  id?: string;
}

export function TagInput({ label, tags, onChange, placeholder = "Type and press enter...", error, id }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label htmlFor={inputId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all",
          error
            ? "border-red-500/50 focus-within:border-red-500"
            : "border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20"
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 focus:outline-none"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 min-w-[120px]"
        />
      </div>
      {error && (
        <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
