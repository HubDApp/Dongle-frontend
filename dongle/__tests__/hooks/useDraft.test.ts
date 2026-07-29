/**
 * Tests for useDraft hook
 */

import { renderHook, act } from "@testing-library/react";
import { useDraft } from "@/hooks/useDraft";
import { draftService } from "@/services/draft/draft.service";

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

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useDraft hook", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllTimers();
  });

  describe("Acceptance Criteria: Autosave runs only after fields change", () => {
    it("should not save draft when data is empty", () => {
      const { result } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );

      act(() => {
        result.current.saveDraft({
          name: "",
          primaryCategory: "",
          tags: [],
          description: "",
          websiteUrl: "",
          githubUrl: "",
          logoUrl: "",
          docsUrl: "",
        });
      });

      expect(result.current.hasDraft).toBe(false);
    });

    it("should save draft when user types in fields", () => {
      const { result } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );

      act(() => {
        result.current.saveDraft({
          name: "My Project",
          primaryCategory: "defi",
          tags: ["stellar"],
          description: "A great project",
          websiteUrl: "https://example.com",
          githubUrl: "",
          logoUrl: "",
          docsUrl: "",
        });
      });

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.lastSaved).toBeTruthy();
    });

    it("should debounce autosave to prevent excessive saves", () => {
      jest.useFakeTimers();
      const saveSpy = jest.spyOn(draftService, "saveDraft");

      const { result } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );

      // Simulate rapid typing
      act(() => {
        result.current.saveDraft({
          name: "M",
          primaryCategory: "",
          tags: [],
          description: "",
          websiteUrl: "",
          githubUrl: "",
          logoUrl: "",
          docsUrl: "",
        });
      });

      act(() => {
        result.current.saveDraft({
          name: "My",
          primaryCategory: "",
          tags: [],
          description: "",
          websiteUrl: "",
          githubUrl: "",
          logoUrl: "",
          docsUrl: "",
        });
      });

      act(() => {
        result.current.saveDraft({
          name: "My Project",
          primaryCategory: "",
          tags: [],
          description: "",
          websiteUrl: "",
          githubUrl: "",
          logoUrl: "",
          docsUrl: "",
        });
      });

      // Should not save yet
      expect(saveSpy).not.toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should only save once after debounce
      expect(saveSpy).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
      saveSpy.mockRestore();
    });
  });

  describe("Acceptance Criteria: Restored drafts are clearly indicated", () => {
    it("should load existing draft on mount", () => {
      // Pre-populate a draft
      const draftData = {
        name: "Existing Project",
        primaryCategory: "defi",
        tags: ["soroban"],
        description: "Existing description",
        websiteUrl: "https://existing.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      draftService.saveDraft({
        id: "new-project-draft",
        data: draftData,
        mode: "create",
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.loadedDraft).toEqual(draftData);
      expect(result.current.lastSaved).toBeTruthy();
    });

    it("should provide lastSaved timestamp for UI display", () => {
      const draftData = {
        name: "Test Project",
        primaryCategory: "defi",
        tags: [],
        description: "Test",
        websiteUrl: "https://test.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      draftService.saveDraft({
        id: "new-project-draft",
        data: draftData,
        mode: "create",
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );

      expect(result.current.lastSaved).toBeTruthy();
      expect(typeof result.current.lastSaved).toBe("string");
      // Verify it's a valid ISO timestamp
      expect(new Date(result.current.lastSaved!).toString()).not.toBe(
        "Invalid Date"
      );
    });
  });

  describe("Acceptance Criteria: Users can clear saved drafts", () => {
    it("should delete draft when clearDraft is called", () => {
      const draftData = {
        name: "To Be Deleted",
        primaryCategory: "defi",
        tags: [],
        description: "This will be deleted",
        websiteUrl: "https://delete.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      draftService.saveDraft({
        id: "new-project-draft",
        data: draftData,
        mode: "create",
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );

      expect(result.current.hasDraft).toBe(true);

      act(() => {
        result.current.clearDraft();
      });

      expect(result.current.hasDraft).toBe(false);
      expect(result.current.loadedDraft).toBeNull();
      expect(result.current.lastSaved).toBeNull();
    });

    it("should delete draft when deleteDraft is called", () => {
      const draftData = {
        name: "To Be Deleted",
        primaryCategory: "defi",
        tags: [],
        description: "This will be deleted",
        websiteUrl: "https://delete.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      draftService.saveDraft({
        id: "new-project-draft",
        data: draftData,
        mode: "create",
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );

      act(() => {
        result.current.deleteDraft();
      });

      expect(result.current.hasDraft).toBe(false);
    });
  });

  describe("Edit mode", () => {
    it("should use different draft ID for edit mode", () => {
      const { result: createResult } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );
      const { result: editResult } = renderHook(() =>
        useDraft({ mode: "edit", projectId: "project-123", autoSave: true })
      );

      expect(createResult.current.draftId).toBe("new-project-draft");
      expect(editResult.current.draftId).toBe("edit-project-project-123");
    });

    it("should load project-specific draft for edit mode", () => {
      const draftData = {
        name: "Edit Mode Project",
        primaryCategory: "defi",
        tags: [],
        description: "Editing",
        websiteUrl: "https://edit.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      draftService.saveDraft({
        id: "edit-project-project-456",
        data: draftData,
        mode: "edit",
        projectId: "project-456",
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "edit", projectId: "project-456", autoSave: true })
      );

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.loadedDraft?.name).toBe("Edit Mode Project");
    });
  });
});
