"use client";

/**
 * FormErrorSummary — Issue #530
 *
 * Displays a summary of all form validation errors at the top of a form.
 * Each error item is a focusable link that jumps to the corresponding field.
 * Updates in real-time as errors appear or clear.
 * Dark-mode compatible.
 * Keyboard accessible — the summary heading receives focus when errors appear.
 */

import React, {
  useEffect,
  useRef,
} from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormErrorItem {
  /**
   * The HTML `id` of the field that has an error.
   * The summary will render an anchor `href="#<fieldId>"` that focuses it.
   */
  fieldId: string;
  /** Human-readable label for the field, e.g. "Project Name". */
  label: string;
  /** The error message to display. */
  message: string;
}

export interface FormErrorSummaryProps {
  /**
   * Array of current field errors.  Pass an empty array (or omit) when there
   * are no errors — the summary will be hidden.
   */
  errors: FormErrorItem[];
  /**
   * Heading text shown inside the summary box.
   * Defaults to "Please fix the following errors:".
   */
  heading?: string;
  /** Additional CSS classes for the outer container. */
  className?: string;
  /**
   * When `true` the summary container receives focus whenever a new set of
   * errors appears.  Useful for accessibility — screen readers and keyboard
   * users are taken to the summary after an invalid submit attempt.
   * Defaults to `true`.
   */
  focusOnError?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @example
 * ```tsx
 * const { formState: { errors } } = useForm<MyData>();
 *
 * const errorItems = [
 *   errors.name    && { fieldId: "name-field",    label: "Name",    message: errors.name.message! },
 *   errors.website && { fieldId: "website-field", label: "Website", message: errors.website.message! },
 * ].filter(Boolean) as FormErrorItem[];
 *
 * return (
 *   <form>
 *     <FormErrorSummary errors={errorItems} />
 *     <FormField id="name-field" label="Name" error={errors.name?.message} {...register("name")} />
 *     <FormField id="website-field" label="Website" error={errors.website?.message} {...register("website")} />
 *   </form>
 * );
 * ```
 */
export function FormErrorSummary({
  errors,
  heading = "Please fix the following errors:",
  className,
  focusOnError = true,
}: FormErrorSummaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevErrorCount = useRef(0);

  // Focus the summary container whenever new errors arrive so keyboard /
  // screen-reader users are brought to the top of the issue list.
  useEffect(() => {
    if (
      focusOnError &&
      errors.length > 0 &&
      errors.length !== prevErrorCount.current
    ) {
      containerRef.current?.focus();
    }
    prevErrorCount.current = errors.length;
  }, [errors, focusOnError]);

  if (errors.length === 0) return null;

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    fieldId: string,
  ) => {
    e.preventDefault();
    const target = document.getElementById(fieldId);
    if (target) {
      target.focus();
      target.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div
      ref={containerRef}
      role="alert"
      aria-live="assertive"
      aria-atomic="false"
      aria-label={`Form has ${errors.length} error${errors.length !== 1 ? "s" : ""}`}
      tabIndex={-1}
      className={cn(
        // Base
        "rounded-2xl border p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
        // Light
        "bg-red-50 border-red-200",
        // Dark
        "dark:bg-red-950/20 dark:border-red-900/50",
        className,
      )}
    >
      {/* Heading */}
      <div className="flex items-start gap-3">
        <AlertCircle
          className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <h2
          id="form-error-summary-heading"
          className="text-sm font-semibold text-red-800 dark:text-red-300"
        >
          {heading}
        </h2>
      </div>

      {/* Error list */}
      <ul
        className="mt-3 space-y-1.5 pl-8"
        aria-labelledby="form-error-summary-heading"
      >
        {errors.map(({ fieldId, label, message }) => (
          <li key={fieldId} className="text-sm">
            <a
              href={`#${fieldId}`}
              onClick={(e) => handleLinkClick(e, fieldId)}
              className={cn(
                "underline underline-offset-2 transition-colors",
                "text-red-700 hover:text-red-900",
                "dark:text-red-400 dark:hover:text-red-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded",
              )}
            >
              <span className="font-medium">{label}</span>
              {": "}
              <span>{message}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Utility to convert a react-hook-form `FieldErrors` object (flat or nested)
 * into the `FormErrorItem[]` format expected by `<FormErrorSummary>`.
 *
 * @param errors   The `formState.errors` object from `useForm`.
 * @param fieldMap A mapping of field path → `{ id, label }` so the summary
 *                 can link to the correct element and show a friendly label.
 *
 * @example
 * ```ts
 * const errorItems = buildErrorItems(errors, {
 *   name:        { id: "name-field",        label: "Project Name" },
 *   description: { id: "description-field", label: "Description" },
 * });
 * ```
 */
export function buildErrorItems<
  TErrors extends Record<string, { message?: string } | undefined>,
>(
  errors: TErrors,
  fieldMap: Record<string, { id: string; label: string }>,
): FormErrorItem[] {
  const items: FormErrorItem[] = [];
  for (const [key, info] of Object.entries(fieldMap)) {
    const err = errors[key];
    if (err?.message) {
      items.push({
        fieldId: info.id,
        label: info.label,
        message: err.message,
      });
    }
  }
  return items;
}
