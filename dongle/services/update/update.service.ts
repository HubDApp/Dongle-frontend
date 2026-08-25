import { ProjectUpdate } from "@/types/update";
import { mockUpdates } from "@/data/mockUpdates";
import { generateId } from "@/lib/id-generator";
import { registry } from "@/services/data-access/registry";

/**
 * Update service for managing project updates.
 *
 * Synchronous methods keep the existing call-sites in the UI intact;
 * async repository-backed methods are also exposed so components can
 * migrate gradually and a real backend can be wired in via the
 * DataAccessRegistry without changing this file or any UI component.
 */
class UpdateService {
  private updates: ProjectUpdate[] = [...mockUpdates];

  /**
   * Get all updates for a project, sorted by date (newest first)
   */
  getUpdatesByProject(projectId: string): ProjectUpdate[] {
    return this.updates
      .filter((u) => u.projectId === projectId)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  /**
   * Add a new update
   */
  addUpdate(
    update: Omit<ProjectUpdate, "id" | "publishedAt" | "authorAddress">,
    authorAddress: string
  ): ProjectUpdate {
    const newUpdate: ProjectUpdate = {
      ...update,
      id: generateId(),
      publishedAt: new Date().toISOString(),
      authorAddress,
    };

    this.updates.push(newUpdate);
    return newUpdate;
  }

  /**
   * Update an existing update (only by author)
   */
  updateUpdate(
    id: string,
    data: Partial<Pick<ProjectUpdate, "title" | "content" | "type" | "version">>,
    authorAddress: string
  ): ProjectUpdate | null {
    const index = this.updates.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const update = this.updates[index];
    if (update.authorAddress !== authorAddress) {
      throw new Error("Unauthorized: Only the author can update this");
    }

    this.updates[index] = { ...update, ...data };
    return this.updates[index];
  }

  /**
   * Delete an update (only by author)
   */
  deleteUpdate(id: string, authorAddress: string): boolean {
    const index = this.updates.findIndex((u) => u.id === id);
    if (index === -1) return false;

    const update = this.updates[index];
    if (update.authorAddress !== authorAddress) {
      throw new Error("Unauthorized: Only the author can delete this");
    }

    this.updates.splice(index, 1);
    return true;
  }

  /**
   * Get a single update by ID
   */
  getUpdateById(id: string): ProjectUpdate | null {
    return this.updates.find((u) => u.id === id) || null;
  }

  /**
   * Check if user can manage updates for a project
   */
  canManageUpdates(projectOwnerAddress: string, userAddress: string): boolean {
    return projectOwnerAddress === userAddress;
  }

  // ── Repository-backed async API ──────────────────────────────────────────
  // These delegate to the active IUpdateRepository in the DataAccessRegistry.
  // A real backend implementation can be registered at app boot time via
  // registry.setUpdateRepository(...) without modifying UI components.

  /** Async: fetch all updates for a project via the active repository. */
  async fetchByProject(projectId: string): Promise<ProjectUpdate[]> {
    return registry.updates.getByProject(projectId);
  }

  /** Async: fetch a single update by ID via the active repository. */
  async fetchById(id: string): Promise<ProjectUpdate | null> {
    return registry.updates.getById(id);
  }

  /** Async: create an update via the active repository. */
  async createUpdate(
    update: Omit<ProjectUpdate, "id" | "publishedAt">,
  ): Promise<ProjectUpdate> {
    return registry.updates.create(update);
  }

  /** Async: edit an update via the active repository. */
  async editUpdate(
    id: string,
    changes: Partial<Pick<ProjectUpdate, "title" | "content" | "type" | "version">>,
  ): Promise<ProjectUpdate | null> {
    return registry.updates.update(id, changes);
  }

  /** Async: remove an update via the active repository. */
  async removeUpdate(id: string): Promise<boolean> {
    return registry.updates.delete(id);
  }
}

export const updateService = new UpdateService();
