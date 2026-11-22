import { describe, it, expect } from "vitest";
import { useLoadingState } from "@/hooks/useLoadingState";

// useLoadingState is a pure function — no DOM or hooks needed.

describe("useLoadingState", () => {
  // ── loading phase ─────────────────────────────────────────────────────────

  it("returns 'loading' when isLoading is true and there is no data", () => {
    expect(
      useLoadingState({ isLoading: true, error: null, hasData: false }),
    ).toBe("loading");
  });

  it("returns 'loading' when neither loading nor error nor data (key is null)", () => {
    expect(
      useLoadingState({ isLoading: false, error: null, hasData: false }),
    ).toBe("loading");
  });

  // ── error phase ───────────────────────────────────────────────────────────

  it("returns 'error' when there is an error and no data", () => {
    expect(
      useLoadingState({
        isLoading: false,
        error: new Error("failed"),
        hasData: false,
      }),
    ).toBe("error");
  });

  it("returns 'error' even when isLoading is still true if there is no data", () => {
    // Some SWR versions keep isLoading true during retry; error takes precedence
    // only when hasData is false.
    expect(
      useLoadingState({
        isLoading: true,
        error: new Error("failed"),
        hasData: false,
      }),
    ).toBe("error");
  });

  // ── ready phase ───────────────────────────────────────────────────────────

  it("returns 'ready' when data is present, regardless of isLoading", () => {
    expect(
      useLoadingState({ isLoading: false, error: null, hasData: true }),
    ).toBe("ready");
  });

  it("returns 'ready' when data is present even if isLoading is still true", () => {
    // This happens during background revalidation — the hook already has stale data.
    expect(
      useLoadingState({ isLoading: true, error: null, hasData: true }),
    ).toBe("ready");
  });

  it("returns 'ready' when data is present even if there is a background error", () => {
    // SWR keeps stale data visible while retrying — we should not flash an error
    // over valid cached content.
    expect(
      useLoadingState({
        isLoading: false,
        error: new Error("background retry"),
        hasData: true,
      }),
    ).toBe("ready");
  });

  // ── edge cases ────────────────────────────────────────────────────────────

  it("treats undefined error the same as null (not an error state)", () => {
    expect(
      useLoadingState({ isLoading: true, error: undefined, hasData: false }),
    ).toBe("loading");
  });

  it("treats non-Error truthy error values as an error state", () => {
    expect(
      useLoadingState({ isLoading: false, error: "string error", hasData: false }),
    ).toBe("error");
  });
});
