/**
 * IUpdateRepository
 *
 * Repository abstraction for project-update data access.
 * Allows the update feed to be backed by an in-memory mock, a REST API,
 * or an on-chain indexer without modifying UI components.
 */

import { ProjectUpdate } from "@/types/update";

export interface IUpdateRepository {
  /** Return every update across all projects. */
  getAll(): Promise<ProjectUpdate[]>;

  /** Return a single update by ID, or null when not found. */
  getById(id: string): Promise<ProjectUpdate | null>;

  /**
   * Return all updates for a project.
   * Results are ordered newest-first by default.
   */
  getByProject(projectId: string): Promise<ProjectUpdate[]>;

  /** Persist a new update and return the saved record. */
  create(
    update: Omit<ProjectUpdate, "id" | "publishedAt">,
  ): Promise<ProjectUpdate>;

  /** Update mutable fields of an existing update by ID. */
  update(
    id: string,
    changes: Partial<Pick<ProjectUpdate, "title" | "content" | "type" | "version">>,
  ): Promise<ProjectUpdate | null>;

  /** Remove an update by ID. Returns true when deleted, false when not found. */
  delete(id: string): Promise<boolean>;
}
