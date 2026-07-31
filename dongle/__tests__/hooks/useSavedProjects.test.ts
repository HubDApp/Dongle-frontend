/**
 * Tests for useSavedProjects hook
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSavedProjects } from "@/hooks/useSavedProjects";
import { useWallet } from "@/context/wallet.context";

vi.mock("@/context/wallet.context", () => ({
  useWallet: vi.fn(),
}));

const mockUseWallet = vi.mocked(useWallet);

const WALLET_A = "GABC1234567890WALLETA";
const WALLET_B = "GXYZ0987654321WALLETB";

function mockWallet(publicKey: string | null, isConnected = Boolean(publicKey)) {
  mockUseWallet.mockReturnValue({
    publicKey,
    isConnected,
  } as unknown as ReturnType<typeof useWallet>);
}

describe("useSavedProjects hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Acceptance Criteria: Connected users can save and unsave projects", () => {
    it("reports canManageSavedProjects false when wallet is not connected", () => {
      mockWallet(null, false);
      const { result } = renderHook(() => useSavedProjects());

      expect(result.current.canManageSavedProjects).toBe(false);
    });

    it("does nothing when toggling while disconnected", () => {
      mockWallet(null, false);
      const { result } = renderHook(() => useSavedProjects());

      act(() => {
        result.current.toggleSavedProject("project-1");
      });

      expect(result.current.savedProjectIds).toEqual([]);
    });

    it("saves a project for a connected wallet", () => {
      mockWallet(WALLET_A);
      const { result } = renderHook(() => useSavedProjects());

      act(() => {
        result.current.toggleSavedProject("project-1");
      });

      expect(result.current.savedProjectIds).toEqual(["project-1"]);
      expect(result.current.isProjectSaved("project-1")).toBe(true);
    });

    it("unsaves a project when toggled again", () => {
      mockWallet(WALLET_A);
      const { result } = renderHook(() => useSavedProjects());

      act(() => {
        result.current.toggleSavedProject("project-1");
      });
      expect(result.current.isProjectSaved("project-1")).toBe(true);

      act(() => {
        result.current.toggleSavedProject("project-1");
      });

      expect(result.current.isProjectSaved("project-1")).toBe(false);
      expect(result.current.savedProjectIds).toEqual([]);
    });
  });

  describe("Acceptance Criteria: Bookmarks are wallet-scoped", () => {
    it("keeps saved projects separate per wallet address", () => {
      mockWallet(WALLET_A);
      const { result: resultA, rerender: rerenderA } = renderHook(() => useSavedProjects());

      act(() => {
        resultA.current.toggleSavedProject("project-1");
      });
      expect(resultA.current.savedProjectIds).toEqual(["project-1"]);

      mockWallet(WALLET_B);
      const { result: resultB } = renderHook(() => useSavedProjects());

      expect(resultB.current.savedProjectIds).toEqual([]);

      act(() => {
        resultB.current.toggleSavedProject("project-2");
      });

      expect(resultB.current.savedProjectIds).toEqual(["project-2"]);

      // Wallet A's saved list is untouched by wallet B's changes
      mockWallet(WALLET_A);
      rerenderA();
      expect(resultA.current.savedProjectIds).toEqual(["project-1"]);
    });
  });

  describe("Acceptance Criteria: Users can clear all saved projects", () => {
    it("clears saved projects for the connected wallet", () => {
      mockWallet(WALLET_A);
      const { result } = renderHook(() => useSavedProjects());

      act(() => {
        result.current.toggleSavedProject("project-1");
      });
      act(() => {
        result.current.toggleSavedProject("project-2");
      });
      expect(result.current.savedProjectIds).toHaveLength(2);

      act(() => {
        result.current.clearSavedProjects();
      });

      expect(result.current.savedProjectIds).toEqual([]);
    });
  });
});
