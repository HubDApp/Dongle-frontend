import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectHistoryService } from "@/services/project/project-history.service";

function createLocalStorageMock() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("projectHistoryService", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists a baseline and changed fields for the first edit", () => {
    const version = projectHistoryService.recordEdit(
      "project-1",
      { name: "Old name", description: "Before" },
      { name: "New name", description: "After" },
      "GEDITOR",
      "2025-01-01T00:00:00.000Z",
    );

    const history = projectHistoryService.getProjectHistory("project-1");
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual(version);
    expect(version.changes).toEqual([
      { field: "name", oldValue: "Old name", newValue: "New name" },
      { field: "description", oldValue: "Before", newValue: "After" },
    ]);
  });

  it("retains at most 50 versions per project", () => {
    for (let index = 0; index < 55; index += 1) {
      projectHistoryService.recordVersion(
        "project-1",
        { name: `Project ${index}` },
        "GEDITOR",
        "update",
      );
    }

    expect(projectHistoryService.getProjectHistory("project-1")).toHaveLength(50);
  });

  it("keeps histories isolated by project", () => {
    projectHistoryService.recordVersion("project-1", { name: "One" }, "GEDITOR", "update");
    projectHistoryService.recordVersion("project-2", { name: "Two" }, "GEDITOR", "update");

    expect(projectHistoryService.getProjectHistory("project-1")).toHaveLength(1);
    expect(projectHistoryService.getProjectHistory("project-2")).toHaveLength(1);
  });
});
