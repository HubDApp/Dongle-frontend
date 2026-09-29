/**
 * MockUpdateRepository
 *
 * In-memory implementation of IUpdateRepository seeded from mockUpdates.
 * Writes accumulate in memory for the lifetime of the page (same as the
 * existing UpdateService).  Swap in an API-backed implementation when a
 * real backend is available.
 */

import { IUpdateRepository } from "./IUpdateRepository.service";
import { ProjectUpdate } from "@/types/update";
import { mockUpdates } from "@/data/mockUpdates";
import { generateId } from "@/lib/id-generator";

export class MockUpdateRepository implements IUpdateRepository {
  private updates: ProjectUpdate[];

  constructor(seed: ProjectUpdate[] = mockUpdates) {
    this.updates = [...seed];
  }

  async getAll(): Promise<ProjectUpdate[]> {
    return [...this.updates];
  }

  async getById(id: string): Promise<ProjectUpdate | null> {
    return this.updates.find((u) => u.id === id) ?? null;
  }

  async getByProject(projectId: string): Promise<ProjectUpdate[]> {
    return this.updates
      .filter((u) => u.projectId === projectId)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
  }

  async create(
    update: Omit<ProjectUpdate, "id" | "publishedAt">,
  ): Promise<ProjectUpdate> {
    const newUpdate: ProjectUpdate = {
      ...update,
      id: generateId(),
      publishedAt: new Date().toISOString(),
    };
    this.updates.push(newUpdate);
    return newUpdate;
  }

  async update(
    id: string,
    changes: Partial<Pick<ProjectUpdate, "title" | "content" | "type" | "version">>,
  ): Promise<ProjectUpdate | null> {
    const idx = this.updates.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.updates[idx] = { ...this.updates[idx], ...changes };
    return this.updates[idx];
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.updates.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.updates.splice(idx, 1);
    return true;
  }
}
