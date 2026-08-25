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

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

    it("initialises with no draft", () => {
      const { result } = renderHook(() => useDraft({ mode: "create" }));
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.lastSaved).toBeNull();
      expect(result.current.isSaving).toBe(false);
      expect(result.current.saveError).toBeNull();
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

    it("draftId differs between create and edit modes", () => {
      const { result: createResult } = renderHook(() => useDraft({ mode: "create" }));
      const { result: editResult } = renderHook(() =>
        useDraft({ mode: "edit", projectId: "abc" })
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

    it("loads an existing localStorage draft on mount", async () => {
      draftService.saveDraft({ id: DRAFT_ID_CREATE, mode: "create", data: filledData });
      const { result } = renderHook(() => useDraft({ mode: "create" }));
      await waitFor(() => {
        expect(result.current.hasDraft).toBe(true);
        expect(result.current.loadedDraft?.name).toBe("My DApp");
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

    it("saves to the API when walletAddress is present", async () => {
      saveDraftRemoteMock.mockResolvedValueOnce(makeRemoteDraft());
      getDraftRemoteMock.mockResolvedValue(null);

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

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      act(() => { result.current.saveDraft(filledData); });
      await act(async () => { vi.advanceTimersByTime(2000); });

      expect(result.current.saveError).not.toBeNull();
      expect(result.current.hasDraft).toBe(true);
    });
  });

  // Mount and delete tests use real timers
  describe("with real timers", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.clearAllMocks();
    });

    it("loads the remote draft on mount when wallet is present", async () => {
      getDraftRemoteMock.mockResolvedValueOnce(makeRemoteDraft());

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      await waitFor(() => {
        expect(result.current.hasDraft).toBe(true);
        expect(result.current.loadedDraft?.name).toBe("My DApp");
        expect(result.current.lastSaved).toBe("2026-08-25T08:00:00.000Z");
      });
    });

    it("falls back to localStorage if remote returns null", async () => {
      getDraftRemoteMock.mockResolvedValueOnce(null);
      draftService.saveDraft({ id: DRAFT_ID_CREATE, mode: "create", data: filledData });

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      await waitFor(() => {
        expect(result.current.hasDraft).toBe(true);
      });
    });

    it("deletes from both localStorage and remote on deleteDraft", async () => {
      getDraftRemoteMock.mockResolvedValueOnce(makeRemoteDraft());
      deleteDraftRemoteMock.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );
      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      await act(async () => { await result.current.deleteDraft(); });

      expect(deleteDraftRemoteMock).toHaveBeenCalledWith(WALLET, DRAFT_ID_CREATE);
      expect(result.current.hasDraft).toBe(false);
    });
  });
});

describe("useDraft – BroadcastChannel sync", () => {
  describe("with fake timers (save)", () => {
    beforeEach(() => {
      localStorageMock.clear();
      vi.useFakeTimers();
      vi.clearAllMocks();
      getDraftRemoteMock.mockResolvedValue(null);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("posts a DRAFT_SAVED message after a successful save", async () => {
      saveDraftRemoteMock.mockResolvedValueOnce(makeRemoteDraft());

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );

      act(() => { result.current.saveDraft(filledData); });
      await act(async () => { vi.advanceTimersByTime(2000); });

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

    it("posts a DRAFT_DELETED message after deleteDraft", async () => {
      getDraftRemoteMock.mockResolvedValueOnce(makeRemoteDraft());
      deleteDraftRemoteMock.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useDraft({ mode: "create", walletAddress: WALLET })
      );
      await waitFor(() => expect(result.current.hasDraft).toBe(true));

      await act(async () => { await result.current.deleteDraft(); });

      expect(broadcastPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "DRAFT_DELETED", draftId: DRAFT_ID_CREATE })
      );
    });
  });
});
