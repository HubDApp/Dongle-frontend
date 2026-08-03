/**
 * project-status.service
 *
 * Persists lifecycle-status overrides for projects in localStorage so that an
 * owner or admin can update a project's lifecycle state (active, paused,
 * deprecated, archived, flagged, removed) without editing static seed data.
 *
 * Overrides are layered on top of the seed data by `projectService`, so the
 * rest of the app only ever reads the merged result via the service.
 */

import { Project, ProjectStatus, PROJECT_STATUSES } from "@/types/project";

const STORAGE_KEY_STATUS_OVERRIDES = "dongle_project_status_overrides";

function readOverrides(): Record<string, string> {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return {};

  const stored = localStorage.getItem(STORAGE_KEY_STATUS_OVERRIDES);
  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === "string" && Boolean(value),
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, string>): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY_STATUS_OVERRIDES, JSON.stringify(overrides));
}

function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

export const projectStatusService = {
  /**
   * Return the persisted lifecycle-status override for a project, or null
   * when the project has never had its status changed.
   */
  getProjectStatusOverride(projectId: string): ProjectStatus | null {
    const value = readOverrides()[projectId];
    return value && isProjectStatus(value) ? value : null;
  },

  /** Persist a lifecycle-status override for a project. */
  setProjectStatus(projectId: string, status: ProjectStatus): void {
    const overrides = readOverrides();
    overrides[projectId] = status;
    writeOverrides(overrides);
  },

  /** Clear any persisted lifecycle-status override for a project. */
  clearProjectStatus(projectId: string): void {
    const overrides = readOverrides();
    delete overrides[projectId];
    writeOverrides(overrides);
  },

  /**
   * Return the project with its persisted lifecycle-status override applied.
   * When no override exists the project is returned unchanged (so the seed
   * status, defaulting to "active", is preserved).
   */
  applyOverride(project: Project): Project {
    const override = this.getProjectStatusOverride(project.id);
    if (!override) return project;
    return { ...project, status: override };
  },
};
