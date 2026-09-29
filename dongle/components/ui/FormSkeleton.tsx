"use client";

import React from "react";
import { Skeleton } from "./skeleton";

export interface FormSkeletonProps {
  /**
   * Additional CSS classes for the container.
   */
  className?: string;
  /**
   * Whether to display the form header skeleton (icon, title, subtitle).
   * @default true
   */
  showHeader?: boolean;
  /**
   * Number of standard field rows to generate if not using custom fields.
   * @default 4
   */
  fieldCount?: number;
  /**
   * Whether to display the bottom submit button skeleton.
   * @default true
   */
  showActions?: boolean;
  /**
   * Accessible announcement for screen readers.
   * @default "Loading form data..."
   */
  ariaLabel?: string;
  /**
   * Whether to wrap in a glass/card container matching standard form layouts.
   * @default true
   */
  asCard?: boolean;
}

/**
 * FormSkeleton displays an accessible, smooth animated loading placeholder
 * that mirrors the structure of form fields while form data is being fetched.
 */
export function FormSkeleton({
  className = "",
  showHeader = true,
  fieldCount = 4,
  showActions = true,
  ariaLabel = "Loading form data...",
  asCard = true,
}: FormSkeletonProps) {
  const content = (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`space-y-6 ${className}`}
    >
      <span className="sr-only">{ariaLabel}</span>

      {/* Header Skeleton */}
      {showHeader && (
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
        </div>
      )}

      {/* Structured Field Groups */}
      <div className="space-y-6">
        {/* Row 1: Dual Inputs (e.g. Name, Category) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>

        {/* Row 2: Tag Input */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        {/* Row 3: Description / Textarea */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>

        {/* Row 4: URL Input */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        {/* Row 5: Multi-column URLs */}
        {fieldCount > 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        )}
      </div>

      {/* Action Button Skeleton */}
      {showActions && (
        <div className="pt-4 space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-3 w-3/4 mx-auto rounded" />
        </div>
      )}
    </div>
  );

  if (asCard) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 p-6 md:p-8 backdrop-blur-md shadow-sm">
        {content}
      </div>
    );
  }

  return content;
}

export default FormSkeleton;
