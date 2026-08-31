import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useWallet } from "@/context/wallet.context";
import { MAX_WATCHLIST_SIZE } from "@/constants/limits";

vi.mock("@/context/wallet.context", () => ({
  useWallet: vi.fn(),
}));

const mockUseWallet = vi.mocked(useWallet);
const WALLET = "GABC1234567890WALLET";

describe("useWatchlist", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockUseWallet.mockReturnValue({
      publicKey: WALLET,
      isConnected: true,
    } as unknown as ReturnType<typeof useWallet>);
  });

  it("adds projects up to the max limit", () => {
    const { result } = renderHook(() => useWatchlist());

    for (let i = 0; i < MAX_WATCHLIST_SIZE; i += 1) {
      act(() => {
        result.current.addToWatchlist(`project-${i}`);
      });
    }

    expect(result.current.watchlistCount).toBe(MAX_WATCHLIST_SIZE);

    act(() => {
      const blocked = result.current.addToWatchlist("project-overflow");
      expect(blocked.success).toBe(false);
    });
  });

  it("filters watchlist by category", () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => {
      result.current.addToWatchlist("proj-0");
    });

    const all = result.current.filterByCategory("All");
    expect(all.length).toBeGreaterThan(0);
  });
});
