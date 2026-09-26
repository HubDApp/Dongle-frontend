"use client";

import React from "react";
import type { Recommendation } from "@/services/form-recommendations";

interface FieldSuggestionsProps {
  /** Field these suggestions belong to. */
  fieldName: string;
  /** Ranked suggestions, strongest first. */
  suggestions: Recommendation[];
  /** Called when the user takes a suggestion. */
  onAccept: (fieldName: string, value: string) => void;
  /** Called when the user dismisses a suggestion. */
  onReject: (fieldName: string, value: string) => void;
  /** Accessible label for the group. */
  label?: string;
  className?: string;
}

const REASON_LABELS: Record<Recommendation["reason"], string> = {
  accepted: "You usually pick this",
  frequent: "You use this often",
  recent: "You used this recently",
};

/**
 * Offers previously entered values for a field, each with an accept and a
 * dismiss control.
 *
 * Renders nothing when there is nothing to suggest, so it is safe to place
 * unconditionally beneath any input.
 */
export function FieldSuggestions({
  fieldName,
  suggestions,
  onAccept,
  onReject,
  label = "Suggestions from your past entries",
  className = "",
}: FieldSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={`mt-2 flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label={label}
    >
      <span className="text-xs text-gray-500 dark:text-gray-400">Suggested:</span>

      {suggestions.map((suggestion) => (
        <span
          key={suggestion.value}
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 pl-3 pr-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800"
        >
          <button
            type="button"
            onClick={() => onAccept(fieldName, suggestion.value)}
            className="max-w-[16rem] truncate text-gray-800 hover:underline dark:text-gray-100"
            title={REASON_LABELS[suggestion.reason]}
            aria-label={`Use suggested value ${suggestion.value} for ${fieldName}`}
          >
            {suggestion.value}
          </button>

          <button
            type="button"
            onClick={() => onReject(fieldName, suggestion.value)}
            className="rounded-full px-1.5 leading-none text-gray-500 hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            aria-label={`Dismiss suggested value ${suggestion.value} for ${fieldName}`}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </span>
      ))}
    </div>
  );
}

export default FieldSuggestions;
