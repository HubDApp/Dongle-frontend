"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, ShieldCheck, Rocket, Award } from "lucide-react";
import type { ReviewerBadge as ReviewerBadgeType, BadgeType } from "@/types/reviewer-badge";

const BADGE_ICONS: Record<BadgeType, React.ElementType> = {
  "top-reviewer": Star,
  "verified-user": ShieldCheck,
  "early-adopter": Rocket,
  "domain-expert": Award,
};

const BADGE_COLORS: Record<BadgeType, string> = {
  "top-reviewer": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900",
  "verified-user": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
  "early-adopter": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-900",
  "domain-expert": "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900",
};

interface ReviewerBadgeProps {
  badge: ReviewerBadgeType;
  className?: string;
}

/**
 * Displays a single reviewer badge next to the reviewer's name.
 * SVG icon is accessible via title, and hover tooltip explains the criteria.
 */
export function ReviewerBadge({ badge, className }: ReviewerBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = BADGE_ICONS[badge.type];

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        BADGE_COLORS[badge.type],
        className,
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="img"
      aria-label={`${badge.label}: ${badge.description}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <svg width="0" height="0" className="absolute">
        <title>{badge.description}</title>
      </svg>
      {badge.label}

      {showTooltip && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal normal-case tracking-normal text-white shadow-lg"
        >
          {badge.description}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

/**
 * Displays a row of badges next to a reviewer's name.
 */
export function ReviewerBadgeList({
  badges,
  className,
}: {
  badges: ReviewerBadgeType[];
  className?: string;
}) {
  if (badges.length === 0) return null;

  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {badges.map((badge) => (
        <ReviewerBadge key={badge.type} badge={badge} />
      ))}
    </span>
  );
}
