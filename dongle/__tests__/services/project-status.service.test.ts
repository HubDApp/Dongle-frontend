import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { projectStatusService } from "@/services/project/project-status.service";
import { mockProjects } from "@/data/mockProjects";
import {
  getProjectStatus,
  getProjectStatusLabel,
  isProjectActive,
  PROJECT_STATUSES,
} from "@/types/project";

// The current Node/jsdom combo does not expose `localStorage` on the global
// object, so provide a tiny in-memory implementation for hermetic tests.
function createLocalStorageMock() {
  let store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("projectStatusService", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no override exists", () => {
    expect(projectStatusService.getProjectStatusOverride("proj-0")).toBeNull();
  });

  it("persists and reads a status override", () => {
    projectStatusService.setProjectStatus("proj-0", "archived");
    expect(projectStatusService.getProjectStatusOverride("proj-0")).toBe("archived");
  });

  it("ignores invalid persisted status values", () => {
    projectStatusService.setProjectStatus("proj-0", "active");
    localStorage.setItem("dongle_project_status_overrides", JSON.stringify({ "proj-0": "bogus" }));
    expect(projectStatusService.getProjectStatusOverride("proj-0")).toBeNull();
  });

  it("clears a status override", () => {
    projectStatusService.setProjectStatus("proj-0", "archived");
    projectStatusService.clearProjectStatus("proj-0");
    expect(projectStatusService.getProjectStatusOverride("proj-0")).toBeNull();
  });

  it("applies override to a project copy without mutating the seed", () => {
    const project = mockProjects[0];
    projectStatusService.setProjectStatus(project.id, "removed");
    const applied = projectStatusService.applyOverride(project);
    expect(applied.status).toBe("removed");
    expect(applied).not.toBe(project);
    expect(project.status).toBe("active");
  });

  it("leaves the project unchanged when no override exists", () => {
    const project = mockProjects[0];
    expect(projectStatusService.applyOverride(project)).toBe(project);
  });
});

describe("project status helpers", () => {
  it("treats a missing status as active", () => {
    expect(getProjectStatus(undefined)).toBe("active");
    expect(getProjectStatusLabel(undefined)).toBe("Active");
    expect(isProjectActive(undefined)).toBe(true);
  });

  it("maps every known status to a label", () => {
    for (const status of PROJECT_STATUSES) {
      expect(getProjectStatusLabel(status)).toEqual(
        status.charAt(0).toUpperCase() + status.slice(1),
      );
    }
  });

  it("flags non-active lifecycle states as inactive", () => {
    expect(isProjectActive("paused")).toBe(false);
    expect(isProjectActive("deprecated")).toBe(false);
    expect(isProjectActive("archived")).toBe(false);
    expect(isProjectActive("flagged")).toBe(false);
    expect(isProjectActive("removed")).toBe(false);
    expect(isProjectActive("active")).toBe(true);
  });
});

describe("mock project seed statuses", () => {
  it("seeds a representative mix of lifecycle states", () => {
    const statuses = new Set(mockProjects.map((p) => p.status));
    for (const inactive of ["deprecated", "paused", "archived", "flagged"] as const) {
      expect(statuses.has(inactive)).toBe(true);
    }
  });
});
