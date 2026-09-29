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
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDraft } from "@/hooks/useDraft";
import { draftService } from "@/services/draft/draft.service";
import { draftApiService } from "@/services/draft/draft-api.service";
import type { ProjectDraft } from "@/services/draft/draft.service";

// ---------------------------------------------------------------------------
// Mock DraftApiService (jsdom cannot fetch relative URLs)
// ---------------------------------------------------------------------------

vi.mock("@/services/draft/draft-api.service", () => ({
  draftApiService: {
    getDraft: vi.fn(),
    saveDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));

const getDraftRemoteMock = vi.mocked(draftApiService.getDraft);
const saveDraftRemoteMock = vi.mocked(draftApiService.saveDraft);
const deleteDraftRemoteMock = vi.mocked(draftApiService.deleteDraft);

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
// Fixtures
// ---------------------------------------------------------------------------

const WALLET = "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const DRAFT_ID_CREATE = "new-project-draft";

const filledData: ProjectDraft["data"] = {
  name: "My DApp",
  primaryCategory: "defi",
  tags: ["soroban"],
  description: "A test project description",
  websiteUrl: "https://mydapp.com",
  githubUrl: "https://github.com/mydapp",
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

/** Build a stored draft fixture with a lastSaved timestamp. */
function makeDraft(
  data: ProjectDraft["data"],
  overrides: Partial<ProjectDraft> = {}
): ProjectDraft {
  return {
    id: DRAFT_ID_CREATE,
    data,
    mode: "create",
    lastSaved: new Date().toISOString(),
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
  });

  // Tests that need real timers for async mount effects
  describe("with real timers (mount / async tests)", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.clearAllMocks();
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
      // Default: no remote draft (404) so the hook falls back to localStorage
      getDraftRemoteMock.mockResolvedValue({
        ok: false,
        status: 404,
        error: "not found",
      });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should debounce autosave to prevent excessive saves", async () => {
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
      saveDraftRemoteMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        error: "server error",
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      act(() => { result.current.saveDraft(filledData); });
      await act(async () => { vi.advanceTimersByTime(2000); });

      expect(result.current.saveError).toBe("Could not sync to server; saved locally.");
      expect(result.current.hasDraft).toBe(true);
    });
  });

  describe("Acceptance Criteria: Restored drafts are clearly indicated", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.clearAllMocks();
    });

    it("should load existing draft on mount", async () => {
      const draftData: ProjectDraft["data"] = {
        name: "Existing Project",
        primaryCategory: "defi",
        tags: ["soroban"],
        description: "Existing description",
        websiteUrl: "https://existing.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      // Draft exists remotely
      getDraftRemoteMock.mockResolvedValue({
        ok: true,
        data: makeDraft(draftData),
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      expect(result.current.loadedDraft).toEqual(draftData);
      expect(result.current.lastSaved).toBeTruthy();
    });

    it("should provide lastSaved timestamp for UI display", async () => {
      const draftData: ProjectDraft["data"] = {
        name: "Test Project",
        primaryCategory: "defi",
        tags: [],
        description: "Test",
        websiteUrl: "https://test.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      getDraftRemoteMock.mockResolvedValue({
        ok: true,
        data: makeDraft(draftData),
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      expect(result.current.lastSaved).toBeTruthy();
      expect(typeof result.current.lastSaved).toBe("string");
      // Verify it's a valid ISO timestamp
      expect(new Date(result.current.lastSaved!).toString()).not.toBe(
        "Invalid Date"
      );
    });
  });

  describe("Acceptance Criteria: Users can clear saved drafts", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.clearAllMocks();
      deleteDraftRemoteMock.mockResolvedValue({ ok: true, data: { success: true } });
    });

    it("should delete draft when clearDraft is called", async () => {
      const draftData: ProjectDraft["data"] = {
        name: "To Be Deleted",
        primaryCategory: "defi",
        tags: [],
        description: "This will be deleted",
        websiteUrl: "https://delete.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      getDraftRemoteMock.mockResolvedValue({
        ok: true,
        data: makeDraft(draftData),
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );
      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      await act(async () => {
        result.current.clearDraft();
      });

      expect(deleteDraftRemoteMock).toHaveBeenCalledWith(WALLET, DRAFT_ID_CREATE);
      expect(result.current.hasDraft).toBe(false);
    });

    it("should delete draft when deleteDraft is called", async () => {
      const draftData: ProjectDraft["data"] = {
        name: "To Be Deleted",
        primaryCategory: "defi",
        tags: [],
        description: "This will be deleted",
        websiteUrl: "https://delete.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      getDraftRemoteMock.mockResolvedValue({
        ok: true,
        data: makeDraft(draftData),
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      await act(async () => {
        result.current.deleteDraft();
      });

      expect(broadcastPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "DRAFT_DELETED", draftId: DRAFT_ID_CREATE })
      );
    });
  });

  describe("with real timers (delete)", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.clearAllMocks();
    });

    it("should load project-specific draft for edit mode", async () => {
      const draftData: ProjectDraft["data"] = {
        name: "Edit Mode Project",
        primaryCategory: "defi",
        tags: [],
        description: "Editing",
        websiteUrl: "https://edit.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };

      getDraftRemoteMock.mockResolvedValue({
        ok: true,
        data: makeDraft(draftData, {
          id: "edit-project-project-456",
          mode: "edit",
          projectId: "project-456",
        }),
      });

      const { result } = renderHook(() =>
        useDraft({ mode: "edit", projectId: "project-456", walletAddress: WALLET })
      );
      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.loadedDraft?.name).toBe("Edit Mode Project");
    });
  });
});
