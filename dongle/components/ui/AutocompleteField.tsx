import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "./Input";
import { ChevronDown } from "lucide-react";

interface AutocompleteFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  suggestions: string[];
  onChange?: (value: string) => void;
  error?: string;
  helperText?: string;
  filterSuggestions?: (input: string, suggestions: string[]) => string[];
}

export const AutocompleteField = React.forwardRef<HTMLInputElement, AutocompleteFieldProps>(
  ({
    label,
    suggestions = [],
    onChange,
    error,
    helperText,
    className = "",
    id,
    value = "",
    defaultValue = "",
    filterSuggestions: customFilter,
    ...props
  }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const listboxId = `${inputId}-listbox`;
    const helperId = `${inputId}-helper`;

    const internalRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [inputValue, setInputValue] = useState<string>(typeof value === "string" ? value : typeof defaultValue === "string" ? defaultValue : "");
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const defaultFilter = (input: string, sugg: string[]): string[] => {
      if (!input.trim()) return [];
      const lowerInput = input.toLowerCase();
      return sugg.filter(s => s.toLowerCase().includes(lowerInput)).slice(0, 10);
    };

    const filterFunc = customFilter || defaultFilter;

    const updateSuggestions = useCallback((input: string) => {
      const filtered = filterFunc(input, suggestions);
      setFilteredSuggestions(filtered);
      setHighlightedIndex(-1);
      setIsOpen(filtered.length > 0);
    }, [suggestions, filterFunc]);

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      updateSuggestions(newValue);
      onChange?.(newValue);
    };

    const handleSelectSuggestion = (suggestion: string) => {
      setInputValue(suggestion);
      setIsOpen(false);
      setFilteredSuggestions([]);
      setHighlightedIndex(-1);
      onChange?.(suggestion);
      internalRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          updateSuggestions(inputValue);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0) {
            handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="flex flex-col gap-2 w-full" ref={containerRef}>
        <label htmlFor={inputId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <div className="relative">
          <Input
            {...props}
            ref={setRef}
            id={inputId}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue && updateSuggestions(inputValue)}
            error={!!error}
            aria-invalid={error ? true : undefined}
            aria-describedby={[error ? errorId : "", helperText ? helperId : ""].filter(Boolean).join(" ") || undefined}
            aria-autocomplete="list"
            aria-controls={isOpen ? listboxId : undefined}
            aria-expanded={isOpen}
            className={className}
          />
          {isOpen && filteredSuggestions.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg max-h-60 overflow-y-auto z-50"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion}-${index}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`px-5 py-3 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? "bg-blue-500/10 dark:bg-blue-500/20 text-zinc-900 dark:text-zinc-100 font-medium"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
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

AutocompleteField.displayName = "AutocompleteField";
