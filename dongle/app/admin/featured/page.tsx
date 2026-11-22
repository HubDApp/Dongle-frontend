"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/Button";
import { projectService } from "@/services/project/project.service";
import type { Project } from "@/types/project";
import { applyFeatured, getFeaturedProjects, MAX_FEATURED_PROJECTS, setProjectFeatured } from "@/lib/featured-projects";
import { toast } from "sonner";

export default function FeaturedProjectsAdminPage() {
  const { isAdmin } = useAdminAccess();
  const [projects, setProjects] = useState<Project[]>([]);
  const catalog = projectService.getAllProjects();

  useEffect(() => setProjects(applyFeatured(catalog)), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) {
    return <div className="container mx-auto px-4 py-16 text-center">Connect an authorized admin wallet to manage featured projects.</div>;
  }

  const featuredCount = getFeaturedProjects(catalog).length;
  const toggle = (project: Project) => {
    if (!setProjectFeatured(catalog, project.id, !project.isFeatured)) {
      toast.error(`Maximum ${MAX_FEATURED_PROJECTS} featured projects`);
      return;
    }
    setProjects(applyFeatured(catalog));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Featured Projects</h1>
      <p className="mb-6 text-zinc-500">{featuredCount}/{MAX_FEATURED_PROJECTS} featured slots used.</p>
      <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {projects.map((project) => (
          <li key={project.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{project.name}</p>
              {project.isFeatured && project.featuredAt && (
                <p className="text-xs text-zinc-500">Featured since {new Date(project.featuredAt).toLocaleDateString()}</p>
              )}
            </div>
            <Button size="sm" variant={project.isFeatured ? "outline" : "primary"} onClick={() => toggle(project)}>
              {project.isFeatured ? "Unfeature" : "Feature"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
