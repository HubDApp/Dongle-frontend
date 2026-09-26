import { ProjectVersion, FieldChange } from "@/types/history";
import { Project } from "@/types/project";

// In-memory store for project history.
// In a real application, this would be persisted in a database or indexer.
let projectHistory: ProjectVersion[] = [];

/**
 * Compares two project snapshots and returns the fields that changed.
 */
function computeChanges(oldSnapshot: Partial<Project>, newSnapshot: Partial<Project>): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(oldSnapshot), ...Object.keys(newSnapshot)]);

  allKeys.forEach((key) => {
    const k = key as keyof Project;
    const oldVal = oldSnapshot[k];
    const newVal = newSnapshot[k];

    // Simple equality check (this works for primitives and strings)
    // For arrays (like tags or contractAddresses), we need a deeper comparison.
    let isDifferent = false;
    
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal);
    } else {
      isDifferent = oldVal !== newVal;
    }

    if (isDifferent) {
      changes.push({
        field: k,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  });

  return changes;
}

export const projectHistoryService = {
  /**
   * Retrieves the full history for a given project ID, sorted newest first.
   */
  getProjectHistory(projectId: string): ProjectVersion[] {
    return projectHistory
      .filter((h) => h.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  /**
   * Retrieves a specific version by its version ID.
   */
  getVersionById(versionId: string): ProjectVersion | undefined {
    return projectHistory.find((h) => h.id === versionId);
  },

  /**
   * Records a new version in the history.
   * Compares with the most recent version to compute changes.
   */
  recordVersion(
    projectId: string,
    snapshot: Partial<Project>,
    updatedBy: string,
    action: "create" | "update" | "restore"
  ): ProjectVersion {
    const existingHistory = this.getProjectHistory(projectId);
    const lastVersion = existingHistory.length > 0 ? existingHistory[0].snapshot : {};

    const changes = computeChanges(lastVersion, snapshot);

    const newVersion: ProjectVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      projectId,
      timestamp: new Date().toISOString(),
      updatedBy,
      action,
      changes,
      snapshot: { ...snapshot },
    };

    projectHistory.push(newVersion);
    return newVersion;
  },

  /**
   * Clears the history for testing purposes.
   */
  _clearHistory() {
    projectHistory = [];
  }
};
