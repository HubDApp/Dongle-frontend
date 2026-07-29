import { describe, it, expect, beforeEach, vi } from "vitest";
import { recentViewsService } from "@/services/recent-views/recent-views.service";
import { mockProjects } from "@/data/mockProjects";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Assign to global
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("recentViewsService", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("addView", () => {
    it("adds a new project view", () => {
      const projectId = mockProjects[0].id;
      recentViewsService.addView(projectId);

      const views = recentViewsService.getAllViews();
      expect(views).toHaveLength(1);
      expect(views[0].projectId).toBe(projectId);
      expect(views[0].walletAddress).toBeUndefined();
    });

    it("adds a view with wallet address", () => {
      const projectId = mockProjects[0].id;
      const walletAddress = "GABC123";
      recentViewsService.addView(projectId, walletAddress);

      const views = recentViewsService.getAllViews();
      expect(views).toHaveLength(1);
      expect(views[0].projectId).toBe(projectId);
      expect(views[0].walletAddress).toBe(walletAddress);
    });

    it("moves existing view to top without duplicating", () => {
      const project1 = mockProjects[0].id;
      const project2 = mockProjects[1].id;

      recentViewsService.addView(project1);
      recentViewsService.addView(project2);
      recentViewsService.addView(project1); // View project1 again

      const views = recentViewsService.getAllViews();
      expect(views).toHaveLength(2);
      expect(views[0].projectId).toBe(project1); // Should be at top
      expect(views[1].projectId).toBe(project2);
    });

    it("limits to 10 most recent views", () => {
      // Add 12 views
      for (let i = 0; i < 12; i++) {
        recentViewsService.addView(`project-${i}`);
      }

      const views = recentViewsService.getAllViews();
      expect(views).toHaveLength(10);
      expect(views[0].projectId).toBe("project-11"); // Most recent
      expect(views[9].projectId).toBe("project-2"); // Oldest kept
    });

    it("handles wallet-scoped deduplication", () => {
      const projectId = mockProjects[0].id;
      const wallet1 = "WALLET1";
      const wallet2 = "WALLET2";

      recentViewsService.addView(projectId, wallet1);
      recentViewsService.addView(projectId, wallet2);
      recentViewsService.addView(projectId); // No wallet

      const views = recentViewsService.getAllViews();
      expect(views).toHaveLength(3); // Three separate entries
    });
  });

  describe("getRecentViews", () => {
    it("returns all views when no wallet specified", () => {
      recentViewsService.addView(mockProjects[0].id);
      recentViewsService.addView(mockProjects[1].id, "WALLET1");

      const views = recentViewsService.getRecentViews();
      expect(views).toHaveLength(2);
    });

    it("filters views by wallet address", () => {
      const wallet1 = "WALLET1";
      const wallet2 = "WALLET2";

      recentViewsService.addView(mockProjects[0].id, wallet1);
      recentViewsService.addView(mockProjects[1].id, wallet2);
      recentViewsService.addView(mockProjects[2].id, wallet1);

      const views = recentViewsService.getRecentViews(wallet1);
      expect(views).toHaveLength(2);
      expect(views.every((v) => v.walletAddress === wallet1)).toBe(true);
    });
  });

  describe("getRecentProjects", () => {
    it("returns project data for recent views", () => {
      recentViewsService.addView(mockProjects[0].id);
      recentViewsService.addView(mockProjects[1].id);

      const projects = recentViewsService.getRecentProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe(mockProjects[0].id);
      expect(projects[1].id).toBe(mockProjects[1].id);
    });

    it("filters out projects that no longer exist", () => {
      recentViewsService.addView(mockProjects[0].id);
      recentViewsService.addView("non-existent-project");

      const projects = recentViewsService.getRecentProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(mockProjects[0].id);
    });
  });

  describe("clearViews", () => {
    it("clears all views when no wallet specified", () => {
      recentViewsService.addView(mockProjects[0].id);
      recentViewsService.addView(mockProjects[1].id, "WALLET1");

      recentViewsService.clearViews();

      const views = recentViewsService.getAllViews();
      expect(views).toHaveLength(0);
    });

    it("clears only views for specific wallet", () => {
      const wallet1 = "WALLET1";
      const wallet2 = "WALLET2";

      recentViewsService.addView(mockProjects[0].id, wallet1);
      recentViewsService.addView(mockProjects[1].id, wallet2);

      recentViewsService.clearViews(wallet1);

      const views = recentViewsService.getAllViews();
      expect(views).toHaveLength(1);
      expect(views[0].walletAddress).toBe(wallet2);
    });
  });

  describe("hasViewed", () => {
    it("returns true if project has been viewed", () => {
      const projectId = mockProjects[0].id;
      recentViewsService.addView(projectId);

      expect(recentViewsService.hasViewed(projectId)).toBe(true);
    });

    it("returns false if project has not been viewed", () => {
      expect(recentViewsService.hasViewed("not-viewed")).toBe(false);
    });

    it("checks wallet-scoped views", () => {
      const projectId = mockProjects[0].id;
      const wallet1 = "WALLET1";
      const wallet2 = "WALLET2";

      recentViewsService.addView(projectId, wallet1);

      expect(recentViewsService.hasViewed(projectId, wallet1)).toBe(true);
      expect(recentViewsService.hasViewed(projectId, wallet2)).toBe(false);
    });
  });

  describe("getLastViewedAt", () => {
    it("returns timestamp of last view", () => {
      const projectId = mockProjects[0].id;
      recentViewsService.addView(projectId);

      const timestamp = recentViewsService.getLastViewedAt(projectId);
      expect(timestamp).toBeTruthy();
      expect(new Date(timestamp!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("returns null if project not viewed", () => {
      const timestamp = recentViewsService.getLastViewedAt("not-viewed");
      expect(timestamp).toBeNull();
    });

    it("returns wallet-scoped timestamp", () => {
      const projectId = mockProjects[0].id;
      const wallet1 = "WALLET1";

      recentViewsService.addView(projectId, wallet1);

      const timestamp = recentViewsService.getLastViewedAt(projectId, wallet1);
      expect(timestamp).toBeTruthy();

      const noWalletTimestamp = recentViewsService.getLastViewedAt(projectId);
      expect(noWalletTimestamp).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles empty localStorage gracefully", () => {
      const views = recentViewsService.getAllViews();
      expect(views).toEqual([]);
    });

    it("handles corrupted localStorage data", () => {
      localStorageMock.setItem("dongle_recent_views", "invalid json");
      const views = recentViewsService.getAllViews();
      expect(views).toEqual([]);
    });

    it("preserves order (newest first)", () => {
      const ids = ["p1", "p2", "p3"];
      ids.forEach((id) => recentViewsService.addView(id));

      const views = recentViewsService.getAllViews();
      expect(views[0].projectId).toBe("p3");
      expect(views[1].projectId).toBe("p2");
      expect(views[2].projectId).toBe("p1");
    });
  });
});
