"use client";

import React, { useState } from "react";
import { FileText, X, Plus } from "lucide-react";
import {
  REVIEW_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from "@/types/review-template";

interface ReviewTemplateSelectorProps {
  onSelectTemplate: (text: string) => void;
  onSkip: () => void;
  className?: string;
}

/**
 * Template selector for the review form (#680).
 * Shows category-specific templates with pre-filled prompts.
 */
export function ReviewTemplateSelector({
  onSelectTemplate,
  onSkip,
  className,
}: ReviewTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleSelect = (category: TemplateCategory) => {
    const template = REVIEW_TEMPLATES[category];
    const text = template.prompts.map((p) => `• ${p}`).join("\n");
    onSelectTemplate(text);
    setDismissed(true);
  };

  return (
    <div
      className={`rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 ${className ?? ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Review Templates
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDismissed(true);
              onSkip();
            }}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Skip template
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
            aria-label="Dismiss templates"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {REVIEW_TEMPLATES[cat].label}
          </button>
        ))}
      </div>

      {selectedCategory && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Prompts for {REVIEW_TEMPLATES[selectedCategory].label} reviews:
          </div>
          <ul className="space-y-1">
            {REVIEW_TEMPLATES[selectedCategory].prompts.map((prompt) => (
              <li key={prompt} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Plus className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                {prompt}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSelect(selectedCategory)}
            className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Use this template
          </button>
        </div>
      )}
    </div>
  );
}
