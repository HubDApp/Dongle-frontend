/**
 * MockProjectRepository
 *
 * In-memory implementation of IProjectRepository backed by the static
 * mockProjects array.  Safe for local development and tests; swap in a
 * real backend implementation via the DataAccessRegistry without
 * changing any UI code.
 */

import { IProjectRepository } from "./IProjectRepository.service";
import { Project } from "@/types/project";
import { mockProjects } from "@/data/mockProjects";

export class MockProjectRepository implements IProjectRepository {
  private readonly projects: Project[];

  constructor(seed: Project[] = mockProjects) {
    // Shallow-copy so tests can supply their own data without side-effects
    this.projects = [...seed];
  }

  async getAll(): Promise<Project[]> {
    return [...this.projects];
  }

  async getById(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) ?? null;
  }

  async getByCategory(category: string): Promise<Project[]> {
    if (category === "All") return this.getAll();
    return this.projects.filter((p) => p.primaryCategory === category);
  }

  async getByTags(tags: string[]): Promise<Project[]> {
    if (!tags.length) return this.getAll();
    return this.projects.filter((p) =>
      p.tags?.some((t) => tags.includes(t)),
    );
  }

  async search(query: string): Promise<Project[]> {
    const q = query.toLowerCase();
    return this.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }
}
