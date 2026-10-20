import { ProjectVersion, FieldChange } from "@/types/history";
import { Project } from "@/types/project";

const STORAGE_KEY = "dongle_project_history";
const MAX_VERSIONS_PER_PROJECT = 50;

function readHistory(): ProjectVersion[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ProjectVersion[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(history: ProjectVersion[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // A confirmed on-chain edit must not be reported as failed if storage is unavailable.
  }
}

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

    const isDifferent = JSON.stringify(oldVal) !== JSON.stringify(newVal);

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
    return readHistory()
      .filter((h) => h.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  /**
   * Retrieves a specific version by its version ID.
   */
  getVersionById(versionId: string): ProjectVersion | undefined {
    return readHistory().find((h) => h.id === versionId);
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
    const lastVersion = existingHistory[0]?.snapshot ?? {};
    const lastTimestamp = existingHistory[0]
      ? new Date(existingHistory[0].timestamp).getTime()
      : 0;
    const timestamp = new Date(Math.max(Date.now(), lastTimestamp + 1)).toISOString();

    const changes = computeChanges(lastVersion, snapshot);

    const newVersion: ProjectVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      projectId,
      timestamp,
      updatedBy,
      action,
      changes,
      snapshot: { ...snapshot },
    };

    this.saveVersion(newVersion);
    return newVersion;
  },

  /** Records the before and after snapshots for a successfully committed edit. */
  recordEdit(
    projectId: string,
    beforeSnapshot: Partial<Project>,
    afterSnapshot: Partial<Project>,
    updatedBy: string,
    createdAt?: string,
  ): ProjectVersion {
    const history = this.getProjectHistory(projectId);
    if (history.length === 0) {
      this.saveVersion({
        id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        projectId,
        timestamp: createdAt || new Date().toISOString(),
        updatedBy,
        action: "create",
        changes: [],
        snapshot: { ...beforeSnapshot },
      });
    }
    return this.recordVersion(projectId, afterSnapshot, updatedBy, "update");
  },

  saveVersion(version: ProjectVersion): void {
    const allHistory = readHistory();
    const projectVersions = [
      ...allHistory.filter((item) => item.projectId === version.projectId),
      version,
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const retainedIds = new Set(
      projectVersions.slice(-MAX_VERSIONS_PER_PROJECT).map((item) => item.id),
    );
    const otherProjects = allHistory.filter((item) => item.projectId !== version.projectId);
    writeHistory([
      ...otherProjects,
      ...projectVersions.filter((item) => retainedIds.has(item.id)),
    ]);
  },

  /**
   * Clears the history for testing purposes.
   */
  _clearHistory() {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  },
};
