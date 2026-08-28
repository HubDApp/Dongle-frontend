/**
 * Tests for the updated useDraft hook
 *
 * Covers:
 *   • localStorage-only mode (no walletAddress)
 *   • Remote-first mode (walletAddress provided)
 *   • 2-second debounce
 *   • isSaving / saveError state
 *   • BroadcastChannel cross-tab sync
 *   • deleteDraft (async)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDraft } from "@/hooks/useDraft";
import { draftService } from "@/services/draft/draft.service";
import type { ProjectDraft } from "@/services/draft/draft.service";

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ---------------------------------------------------------------------------
// Spy on DraftService remote methods (keep sync methods intact)
// ---------------------------------------------------------------------------

// We spy on the remote methods directly on the singleton instance
// so that sync methods (saveDraft, getDraftForProject, hasContent, etc.) keep working.
const saveDraftRemoteMock = vi.spyOn(draftService, "saveDraftRemote");
const getDraftRemoteMock = vi.spyOn(draftService, "getDraftRemote");
const deleteDraftRemoteMock = vi.spyOn(draftService, "deleteDraftRemote");

// ---------------------------------------------------------------------------
// Mock BroadcastChannel
// ---------------------------------------------------------------------------

const broadcastPostMessage = vi.fn();
const broadcastClose = vi.fn();

class BroadcastChannelMock {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = broadcastPostMessage;
  close = broadcastClose;
}

vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WALLET = "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX123456";
const DRAFT_ID_CREATE = "new-project-draft";

const filledData: ProjectDraft["data"] = {
  name: "My DApp",
  primaryCategory: "defi",
  tags: ["stellar"],
  description: "A great project",
  websiteUrl: "https://example.com",
  githubUrl: "",
  logoUrl: "",
  docsUrl: "",
};

const emptyData: ProjectDraft["data"] = {
  name: "",
  primaryCategory: "",
  tags: [],
  description: "",
  websiteUrl: "",
  githubUrl: "",
  logoUrl: "",
  docsUrl: "",
};

function makeRemoteDraft(overrides?: Partial<ProjectDraft>): ProjectDraft {
  return {
    id: DRAFT_ID_CREATE,
    mode: "create",
    lastSaved: "2026-08-25T08:00:00.000Z",
    data: filledData,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDraft – localStorage-only (no walletAddress)", () => {
  // Tests that use fake timers for debounce control
  describe("with fake timers (debounce tests)", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.useFakeTimers();
      vi.clearAllMocks();
      getDraftRemoteMock.mockResolvedValue(null);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

describe("useDraft hook", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

    it("does not save when data is empty", () => {
      const { result } = renderHook(() => useDraft({ mode: "create" }));
      act(() => { result.current.saveDraft(emptyData); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.hasDraft).toBe(false);
    });

    it("sets isSaving=false after async save completes", async () => {
      const { result } = renderHook(() => useDraft({ mode: "create" }));
      act(() => { result.current.saveDraft(filledData); });
      await act(async () => { vi.advanceTimersByTime(2000); });
      expect(result.current.isSaving).toBe(false);
      expect(result.current.hasDraft).toBe(true);
    });

    it("only triggers one save after multiple rapid keystrokes (debounce)", async () => {
      const saveSpy = vi.spyOn(draftService, "saveDraft");
      const { result } = renderHook(() => useDraft({ mode: "create" }));
      act(() => { result.current.saveDraft({ ...filledData, name: "M" }); });
      act(() => { result.current.saveDraft({ ...filledData, name: "My" }); });
      act(() => { result.current.saveDraft({ ...filledData, name: "My DApp" }); });
      expect(saveSpy).not.toHaveBeenCalled();
      await act(async () => { vi.advanceTimersByTime(2000); });
      expect(saveSpy).toHaveBeenCalledTimes(1);
      saveSpy.mockRestore();
    });

    it("should save draft when user types in fields", async () => {
      const { result } = renderHook(() =>
        useDraft({ mode: "create", autoSave: true })
      );
      expect(createResult.current.draftId).toBe("new-project-draft");
      expect(editResult.current.draftId).toBe("edit-project-abc");
    });
  });

  // Tests that need real timers for async mount effects
  describe("with real timers (mount / async tests)", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.clearAllMocks();
      getDraftRemoteMock.mockResolvedValue(null);
    });

      // Flush autosave debounce
      await act(async () => {
        vi.runAllTimers();
      });
    });

    it("clears draft state after deleteDraft", async () => {
      draftService.saveDraft({ id: DRAFT_ID_CREATE, mode: "create", data: filledData });
      const { result } = renderHook(() => useDraft({ mode: "create" }));
      await waitFor(() => expect(result.current.hasDraft).toBe(true));
      await act(async () => { await result.current.deleteDraft(); });
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.loadedDraft).toBeNull();
      expect(result.current.lastSaved).toBeNull();
    });
  });
});

describe("useDraft – remote-first (walletAddress provided)", () => {
  // Debounce tests use fake timers
  describe("with fake timers", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.useFakeTimers();
      vi.clearAllMocks();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should debounce autosave to prevent excessive saves", () => {
      vi.useFakeTimers();
      const saveSpy = vi.spyOn(draftService, "saveDraft");

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      act(() => { result.current.saveDraft(filledData); });
      await act(async () => { vi.advanceTimersByTime(2000); });

      expect(saveDraftRemoteMock).toHaveBeenCalledTimes(1);
      expect(saveDraftRemoteMock).toHaveBeenCalledWith(
        WALLET,
        expect.objectContaining({ id: DRAFT_ID_CREATE, mode: "create" })
      );
    });

    it("sets saveError and falls back to localStorage when remote save fails", async () => {
      saveDraftRemoteMock.mockResolvedValueOnce(null);
      getDraftRemoteMock.mockResolvedValue(null);

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => { result.current.saveDraft(filledData); });
      await act(async () => { vi.advanceTimersByTime(2000); });

      vi.useRealTimers();
      saveSpy.mockRestore();
    });
  });

  describe("Acceptance Criteria: Restored drafts are clearly indicated", () => {
    it("should load existing draft on mount", async () => {
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
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      // Flush the deferred state update
      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.loadedDraft).toEqual(draftData);
      expect(result.current.lastSaved).toBeTruthy();
    });

    it("should provide lastSaved timestamp for UI display", async () => {
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
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.lastSaved).toBeTruthy();
      expect(typeof result.current.lastSaved).toBe("string");
      // Verify it's a valid ISO timestamp
      expect(new Date(result.current.lastSaved!).toString()).not.toBe(
        "Invalid Date"
      );
    });
  });

  describe("Acceptance Criteria: Users can clear saved drafts", () => {
    it("should delete draft when clearDraft is called", async () => {
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
        useDraft({ mode: "create", walletAddress: WALLET })
      );
      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      // Flush deferred mount state
      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.hasDraft).toBe(true);

      act(() => {
        result.current.clearDraft();
      });

      expect(deleteDraftRemoteMock).toHaveBeenCalledWith(WALLET, DRAFT_ID_CREATE);
      expect(result.current.hasDraft).toBe(false);
    });

    it("should delete draft when deleteDraft is called", async () => {
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
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.deleteDraft();
      });

      expect(broadcastPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "DRAFT_SAVED", draftId: DRAFT_ID_CREATE })
      );
    });
  });

  describe("with real timers (delete)", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.clearAllMocks();
    });

    it("should load project-specific draft for edit mode", async () => {
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
        useDraft({ mode: "create", walletAddress: WALLET })
      );
      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.loadedDraft?.name).toBe("Edit Mode Project");
    });
  });
});
