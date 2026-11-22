"use client";

import React, { useId, useMemo } from "react";
import Link from "next/link";
import { Project } from "@/types/project";
import ProjectImage from "@/components/projects/ProjectImage";
import { formatDate } from "@/lib/date";
import { Star, Plus, Check, Bookmark, BookmarkCheck } from "lucide-react";
import { VerificationBadge, VerificationStatus } from "@/components/projects/VerificationBadge";
import { ProjectLifecycleStatusBadge } from "@/components/projects/ProjectLifecycleStatusBadge";
import { HealthBadge } from "@/components/projects/HealthBadge";
import { getProjectHealth, type ProjectHealth } from "@/lib/project-health";
import { IconButton } from "@/components/ui/IconButton";
import { useComparison } from "@/context/comparison.context";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getPrefetchValue } from "@/lib/prefetch-config";
import { highlightText } from "@/lib/utils";
import useSWR from "swr";
import type { SocialProofBadge, SocialProofByProject } from "@/lib/social-proof";

async function fetchSocialProof(url: string): Promise<{ badges: SocialProofByProject }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load social proof badges");
  return response.json() as Promise<{ badges: SocialProofByProject }>;
}

interface ProjectCardProps {
  project: Project;
  verificationStatus?: VerificationStatus;
  showCompareCheckbox?: boolean;
  highlightTerm?: string;
  /** Precomputed health; computed from the project when omitted. */
  health?: ProjectHealth;
  /** Week-over-week health change shown on the badge. */
  healthTrend?: number | null;
  /** Skip lazy loading for above-the-fold images */
  priority?: boolean;
}

export const ProjectCard = ({
  project,
  verificationStatus,
  showCompareCheckbox = true,
  highlightTerm = "",
  health: healthProp,
  healthTrend,
  priority = false,
}: ProjectCardProps) => {
  const { addProject, removeProject, isSelected, canAddMore } = useComparison();
  const { isOnWatchlist, toggleWatchlist, canManageWatchlist } = useWatchlist();
  const { data: socialProof } = useSWR("/api/social-proof", fetchSocialProof);

  const health = useMemo(
    () => healthProp ?? getProjectHealth(project, { verificationStatus }),
    [healthProp, project, verificationStatus],
  );

  const titleId = useId();
  const saveTooltipId = useId();
  const compareTooltipId = useId();

  const selected = isSelected(project.id);
  const isSaved = isOnWatchlist(project.id);
  const badges: SocialProofBadge[] = (socialProof?.badges[project.id] ?? []).slice(0, 2);

  const saveTooltip = isSaved ? "Remove from watchlist" : "Add to watchlist";
  const compareTooltip = selected
    ? "Remove from comparison"
    : !canAddMore
    ? "Maximum 4 projects"
    : "Add to comparison";

  const handleCompareToggle = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selected) {
      removeProject(project.id);
    } else if (canAddMore) {
      addProject(project);
    }
  };

  const handleToggleSaved = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleWatchlist(project.id);
  };

  return (
    <article
      aria-labelledby={titleId}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl transition-all h-full flex flex-col"
    >
      {/* Primary detail link — first tab stop. The card container itself is not
          interactive; keyboard users open the project through this link. */}
      <Link
        href={`/projects/${project.id}`}
        prefetch={getPrefetchValue("project-detail")}
        className="flex h-full flex-col rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
      >
        <ProjectImage
          logoUrl={project.logoUrl}
          name={project.name}
          className="mb-6 shrink-0"
          fallbackTextSize="text-lg"
          priority={priority}
        />
        <div className="mb-2 flex min-h-6 flex-wrap gap-2" aria-label="Project social proof">
          {badges.map((badge) => (
            <span
              key={badge.type}
              title={badge.tooltip}
              aria-label={`${badge.label}: ${badge.tooltip}`}
              className="inline-flex items-center rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {badge.label}
            </span>
          ))}
        </div>
        <div className="flex justify-between items-start mb-2 px-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              {project.primaryCategory}
            </span>
            {verificationStatus && (
              <VerificationBadge status={verificationStatus} tier={project.verificationTier} showIcon={false} />
            )}
            {project.isFeatured && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded">
                Featured
              </span>
            )}
            <ProjectLifecycleStatusBadge status={project.status} />
            <HealthBadge health={health} trend={healthTrend} />
          </div>
          <div className="flex items-center gap-1 text-sm font-bold shrink-0">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            {project.rating}
          </div>
        </div>
        <h3 id={titleId} className="text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
          {highlightTerm
            ? highlightText(project.name, highlightTerm)
            : project.name}
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4 line-clamp-2 grow">
          {highlightTerm
            ? highlightText(project.description, highlightTerm)
            : project.description}
        </p>
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 px-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full"
              >
                {highlightTerm
                  ? highlightText(tag, highlightTerm)
                  : tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-500 mt-auto">
          <span>{project.reviews} reviews</span>
          <span>Added {formatDate(project.createdAt, "short")}</span>
        </div>
      </Link>

      {/* Save button — second tab stop. Tooltip appears on hover and focus. */}
      <span className="group/save absolute right-4 top-4 z-10">
        <IconButton
          type="button"
          onClick={handleToggleSaved}
          disabled={!canManageWatchlist}
          aria-pressed={isSaved}
          aria-describedby={saveTooltipId}
          aria-label={
            isSaved
              ? `Remove ${project.name} from watchlist`
              : `Add ${project.name} to watchlist`
          }
          size="md"
          className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 p-2 text-zinc-500 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {isSaved ? <BookmarkCheck /> : <Bookmark />}
        </IconButton>
        <span
          id={saveTooltipId}
          role="tooltip"
          className="pointer-events-none invisible absolute right-0 top-full z-20 mt-2 w-max max-w-[12rem] rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 opacity-0 shadow-lg transition-opacity dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 group-hover/save:visible group-hover/save:opacity-100 group-focus-within/save:visible group-focus-within/save:opacity-100"
        >
          {saveTooltip}
        </span>
      </span>

      {/* Compare toggle — third tab stop. Tooltip appears on hover and focus. */}
      {showCompareCheckbox && (
        <span className="group/compare absolute left-4 top-4 z-10">
          <IconButton
            type="button"
            onClick={handleCompareToggle}
            disabled={!selected && !canAddMore}
            aria-pressed={selected}
            aria-describedby={compareTooltipId}
            aria-label={
              selected
                ? `Remove ${project.name} from comparison`
                : !canAddMore
                ? `Cannot add ${project.name}: maximum 4 projects`
                : `Add ${project.name} to comparison`
            }
            size="md"
            className={`rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              selected
                ? "bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
                : !canAddMore
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-500"
            }`}
          >
            {selected ? <Check /> : <Plus />}
          </IconButton>
          <span
            id={compareTooltipId}
            role="tooltip"
            className="pointer-events-none invisible absolute left-0 top-full z-20 mt-2 w-max max-w-[12rem] rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 opacity-0 shadow-lg transition-opacity dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 group-hover/compare:visible group-hover/compare:opacity-100 group-focus-within/compare:visible group-focus-within/compare:opacity-100"
          >
            {compareTooltip}
          </span>
        </span>
      )}
    </article>
  );
};
