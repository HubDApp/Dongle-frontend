import { ProjectUpdate, UpdateType } from "@/types/update";
import { mockUpdates } from "@/data/mockUpdates";

/**
 * Update service for managing project updates
 * In production, this would integrate with a backend API
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
    update: Omit<ProjectUpdate, "id" | "publishedAt">,
    authorAddress: string
  ): ProjectUpdate {
    const newUpdate: ProjectUpdate = {
      ...update,
      id: `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
}

export const updateService = new UpdateService();
