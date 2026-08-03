"use client";

import React from "react";
import Link from "next/link";
import { Project } from "@/types/project";
import ProjectImage from "@/components/projects/ProjectImage";
import { formatDate } from "@/lib/date";
import { Star, Plus, Check, Bookmark, BookmarkCheck } from "lucide-react";
import { VerificationBadge, VerificationStatus } from "@/components/projects/VerificationBadge";
import { ProjectLifecycleStatusBadge } from "@/components/projects/ProjectLifecycleStatusBadge";
import { IconButton } from "@/components/ui/IconButton";
import { useComparison } from "@/context/comparison.context";
import { useSavedProjects } from "@/hooks/useSavedProjects";
import { getPrefetchValue } from "@/lib/prefetch-config";

interface ProjectCardProps {
  project: Project;
  verificationStatus?: VerificationStatus;
  showCompareCheckbox?: boolean;
}

export const ProjectCard = ({
  project,
  verificationStatus,
  showCompareCheckbox = true,
}: ProjectCardProps) => {
  const { addProject, removeProject, isSelected, canAddMore } = useComparison();
  const { isProjectSaved, toggleSavedProject, canManageSavedProjects } = useSavedProjects();

  const selected = isSelected(project.id);
  const isSaved = isProjectSaved(project.id);

  const handleCompareToggle = (e: React.MouseEvent) => {
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
    toggleSavedProject(project.id);
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl transition-all h-full flex flex-col">
      {/* Save button */}
      <IconButton
        type="button"
        onClick={handleToggleSaved}
        disabled={!canManageSavedProjects}
        aria-pressed={isSaved}
        aria-label={
          isSaved
            ? `Remove ${project.name} from saved projects`
            : `Save ${project.name}`
        }
        size="md"
        className="absolute right-4 top-4 z-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 p-2 text-zinc-500 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSaved ? <BookmarkCheck /> : <Bookmark />}
      </IconButton>

      {/* Compare toggle — rendered below the save button on the left */}
      {showCompareCheckbox && (
        <IconButton
          type="button"
          onClick={handleCompareToggle}
          disabled={!selected && !canAddMore}
          aria-pressed={selected}
          aria-label={
            selected
              ? `Remove ${project.name} from comparison`
              : !canAddMore
              ? `Cannot add ${project.name}: maximum 4 projects`
              : `Add ${project.name} to comparison`
          }
          size="md"
          className={`absolute left-4 top-4 z-10 rounded-full ${
            selected
              ? "bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
              : !canAddMore
              ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-500"
          }`}
          title={
            selected
              ? "Remove from comparison"
              : !canAddMore
              ? "Maximum 4 projects"
              : "Add to comparison"
          }
        >
          {selected ? <Check /> : <Plus />}
        </IconButton>
      )}

      <Link href={`/projects/${project.id}`} prefetch={getPrefetchValue("project-detail")} className="flex h-full flex-col">
        <ProjectImage
          logoUrl={project.logoUrl}
          name={project.name}
          className="mb-6 shrink-0"
          fallbackTextSize="text-lg"
        />
        <div className="flex justify-between items-start mb-2 px-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              {project.primaryCategory}
            </span>
            {verificationStatus && (
              <VerificationBadge status={verificationStatus} showIcon={false} />
            )}
            <ProjectLifecycleStatusBadge status={project.status} />
          </div>
          <div className="flex items-center gap-1 text-sm font-bold shrink-0">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            {project.rating}
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
          {project.name}
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4 line-clamp-2 grow">
          {project.description}
        </p>
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 px-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-500 mt-auto">
          <span>{project.reviews} reviews</span>
          <span>Added {formatDate(project.createdAt, "short")}</span>
        </div>
      </Link>
    </div>
  );
};
