/**
 * IProjectRepository
 *
 * Repository abstraction for project data access.
 * Concrete implementations (mock, API, on-chain indexer) swap in behind
 * this interface without touching UI components or service logic.
 */

import { Project } from "@/types/project";

export interface IProjectRepository {
  /** Return every project in the store. */
  getAll(): Promise<Project[]>;

  /** Return a single project by ID, or null when not found. */
  getById(id: string): Promise<Project | null>;

  /** Return all projects belonging to a given category. */
  getByCategory(category: string): Promise<Project[]>;

  /** Return all projects that carry at least one of the given tags. */
  getByTags(tags: string[]): Promise<Project[]>;

  /** Full-text search across name, description, and tags. */
  search(query: string): Promise<Project[]>;
}
