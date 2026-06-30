import React from "react";
import Link from "next/link";
import { Project } from "@/types/project";
import ProjectImage from "@/components/projects/ProjectImage";
import { formatDate } from "@/lib/date";
import { Star } from "lucide-react";
import { VerificationBadge, VerificationStatus } from "@/components/projects/VerificationBadge";

interface ProjectCardProps {
  project: Project;
  verificationStatus?: VerificationStatus;
}

export const ProjectCard = ({ project, verificationStatus }: ProjectCardProps) => {
  return (
    <Link href={`/projects/${project.id}`} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl transition-all h-full flex flex-col cursor-pointer">
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
  );
};
