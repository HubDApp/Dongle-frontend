import type { Project } from "@/types/project";

export const MAX_FEATURED_PROJECTS = 5;
const STORAGE_KEY = "dongle:featured-projects";
export const FEATURED_CHANGED_EVENT = "dongle:featured-projects-changed";

type FeaturedOverrides = Record<string, { featured: boolean; featuredAt?: string }>;

function readOverrides(): FeaturedOverrides {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as FeaturedOverrides) : {};
  } catch {
    return {};
  }
}

/** Merge admin overrides into the catalog's `isFeatured` / `featuredAt` fields. */
export function applyFeatured(projects: Project[]): Project[] {
  const overrides = readOverrides();
  return projects.map((project) => {
    const override = overrides[project.id];
    return override
      ? { ...project, isFeatured: override.featured, featuredAt: override.featuredAt ?? project.featuredAt }
      : project;
  });
}

/** Newest-featured first, capped at MAX_FEATURED_PROJECTS. */
export function getFeaturedProjects(projects: Project[]): Project[] {
  return applyFeatured(projects)
    .filter((project) => project.isFeatured)
    .sort((a, b) => (b.featuredAt ?? "").localeCompare(a.featuredAt ?? ""))
    .slice(0, MAX_FEATURED_PROJECTS);
}

/** Admin action: mark/unmark a project as featured. Returns false if the cap is reached. */
export function setProjectFeatured(projects: Project[], id: string, featured: boolean): boolean {
  if (featured && getFeaturedProjects(projects).length >= MAX_FEATURED_PROJECTS) return false;
  const overrides = readOverrides();
  overrides[id] = { featured, featuredAt: featured ? new Date().toISOString() : undefined };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new Event(FEATURED_CHANGED_EVENT));
  } catch {
    return false;
  }
  return true;
}
