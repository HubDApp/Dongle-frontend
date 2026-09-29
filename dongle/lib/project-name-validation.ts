import type { Project } from "@/types/project";

export interface ProjectNameValidationResult {
  available: boolean;
  normalizedName: string;
  conflicts: Array<Pick<Project, "id" | "name">>;
  error?: string;
}

export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateProjectNameAvailability(
  name: string | null | undefined,
  projects: Project[],
  currentProjectId?: string | null,
): ProjectNameValidationResult {
  const normalizedName = normalizeProjectName(name ?? "");

  if (!normalizedName) {
    return {
      available: false,
      normalizedName,
      conflicts: [],
      error: "Project name is required.",
    };
  }

  const conflicts = projects
    .filter((project) => project.id !== currentProjectId)
    .filter((project) => normalizeProjectName(project.name) === normalizedName)
    .map((project) => ({ id: project.id, name: project.name }));

  return {
    available: conflicts.length === 0,
    normalizedName,
    conflicts,
  };
}
