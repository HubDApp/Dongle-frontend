"use client";

import React from "react";
import Link from "next/link";
import { Project } from "@/types/project";
import ProjectImage from "@/components/projects/ProjectImage";
import { formatDate } from "@/lib/date";
import { Star, Plus, Check } from "lucide-react";
import { VerificationBadge, VerificationStatus } from "@/components/projects/VerificationBadge";
import { useComparison } from "@/context/comparison.context";
import { Bookmark, BookmarkCheck, Star } from "lucide-react";
import { useSavedProjects } from "@/hooks/useSavedProjects";

interface ProjectCardProps {
  project: Project;
  verificationStatus?: VerificationStatus;
  showCompareCheckbox?: boolean;
}

export const ProjectCard = ({ project, verificationStatus, showCompareCheckbox = true }: ProjectCardProps) => {
  const { addProject, removeProject, isSelected, canAddMore } = useComparison();
  const selected = isSelected(project.id);

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selected) {
      removeProject(project.id);
    } else if (canAddMore) {
      addProject(project);
    }
  };

  return (
    <Link href={`/projects/${project.id}`} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl transition-all h-full flex flex-col cursor-pointer relative">
      {showCompareCheckbox && (
        <button
          onClick={handleCompareToggle}
          disabled={!selected && !canAddMore}
          className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            selected
              ? "bg-blue-500 text-white"
              : !canAddMore
              ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-500"
          }`}
          title={selected ? "Remove from comparison" : !canAddMore ? "Maximum 4 projects" : "Add to comparison"}
        >
          {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      )}
      <ProjectImage
        logoUrl={project.logoUrl}
        name={project.name}
        className="mb-6 shrink-0"
        fallbackTextSize="text-lg"
      />
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
            {project.category}
          </span>
          {verificationStatus && (
            <VerificationBadge status={verificationStatus} showIcon={false} />
          )}
        </div>
        <div className="flex items-center gap-1 text-sm font-bold shrink-0">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          {project.rating}
export const ProjectCard = ({ project }: ProjectCardProps) => {
  const { isProjectSaved, toggleSavedProject, canManageSavedProjects } = useSavedProjects();
  const isSaved = isProjectSaved(project.id);

  const handleToggleSaved = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSavedProject(project.id);
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl transition-all h-full flex flex-col cursor-pointer">
      <button
        type="button"
        onClick={handleToggleSaved}
        disabled={!canManageSavedProjects}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Remove ${project.name} from saved projects` : `Save ${project.name}`}
        className="absolute right-4 top-4 z-10 inline-flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 p-2 text-zinc-500 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      </button>

      <Link href={`/projects/${project.id}`} className="flex h-full flex-col">
        <ProjectImage
          logoUrl={project.logoUrl}
          name={project.name}
          className="mb-6 shrink-0"
          fallbackTextSize="text-lg"
        />
        <div className="flex justify-between items-start mb-2 pr-10">
          <span className="text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
            {project.category}
          </span>
          <div className="flex items-center gap-1 text-sm font-bold">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            {project.rating}
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
          {project.name}
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 line-clamp-2 grow">
          {project.description}
        </p>
        <div className="flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-500 mt-auto">
          <span>{project.reviews} reviews</span>
          <span>Added {formatDate(project.createdAt, "short")}</span>
        </div>
      </Link>
    </div>
  );
};
