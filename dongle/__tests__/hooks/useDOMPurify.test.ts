/**
 * Tests for useDOMPurify — Issue #924
 *
 * Covers:
 *   • Returns isReady=false before the dynamic import resolves
 *   • Returns isReady=true once the module loads
 *   • sanitize() strips script tags with RICH_TEXT_CONFIG
 *   • sanitize() strips all tags with PLAIN_TEXT_CONFIG
 *   • sanitize() returns '' (safe fallback) before the module is ready
 *   • sanitize() returns '' (safe fallback) when the import fails
 *   • Module is cached — the dynamic import fires only once across mounts
 *   • error state is set when the import rejects
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// We need control over the module-level cache inside useDOMPurify.
// Re-import the module fresh for each test so the cache is clean.
// ---------------------------------------------------------------------------

// A minimal DOMPurify stand-in that is good enough for unit tests.
const mockSanitize = vi.fn((dirty: string, config?: { ALLOWED_TAGS?: string[] }) => {
  if (!config?.ALLOWED_TAGS || config.ALLOWED_TAGS.length === 0) {
    // Strip all tags
    return dirty.replace(/<[^>]*>/g, "");
  }
  // Strip script tags only (simplified)
  return dirty.replace(/<script[\s\S]*?<\/script>/gi, "");
});

const mockDOMPurify = { sanitize: mockSanitize };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset module registry + cache between tests. */
function resetModuleCache() {
  vi.resetModules();
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("useDOMPurify", () => {
  beforeEach(() => {
    resetModuleCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Happy path — module loads successfully ──────────────────────────

  it("starts with isReady=false when module has not loaded yet", async () => {
    // Delay the import so we can observe the initial state.
    let resolveImport!: (mod: unknown) => void;
    const importPromise = new Promise((res) => { resolveImport = res; });

    vi.doMock("dompurify", () => importPromise as any);

    const { useDOMPurify } = await import("@/hooks/useDOMPurify");
    const { result } = renderHook(() => useDOMPurify());

    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeNull();

    // Unblock the import
    await act(async () => {
      resolveImport({ default: mockDOMPurify });
      await importPromise;
    });
  });

  it("sets isReady=true after the module resolves", async () => {
    vi.doMock("dompurify", () => ({ default: mockDOMPurify }));

    const { useDOMPurify } = await import("@/hooks/useDOMPurify");
    const { result } = renderHook(() => useDOMPurify());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(result.current.error).toBeNull();
  });

  // ── 2. sanitize() behavior ─────────────────────────────────────────────

  it("sanitize() strips all tags with PLAIN_TEXT_CONFIG", async () => {
    vi.doMock("dompurify", () => ({ default: mockDOMPurify }));

    const { useDOMPurify, PLAIN_TEXT_CONFIG } = await import("@/hooks/useDOMPurify");
    const { result } = renderHook(() => useDOMPurify());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    const output = result.current.sanitize("<b>hello</b><script>alert(1)</script>", PLAIN_TEXT_CONFIG);
    expect(output).not.toContain("<b>");
    expect(output).not.toContain("<script>");
    expect(mockSanitize).toHaveBeenCalledWith(
      "<b>hello</b><script>alert(1)</script>",
      PLAIN_TEXT_CONFIG,
    );
  });

  it("sanitize() removes script tags with RICH_TEXT_CONFIG", async () => {
    vi.doMock("dompurify", () => ({ default: mockDOMPurify }));

    const { useDOMPurify, RICH_TEXT_CONFIG } = await import("@/hooks/useDOMPurify");
    const { result } = renderHook(() => useDOMPurify());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    const input = "<b>hello</b><script>alert(1)</script>";
    const output = result.current.sanitize(input, RICH_TEXT_CONFIG);
    expect(output).not.toContain("<script>");
    expect(mockSanitize).toHaveBeenCalledWith(input, RICH_TEXT_CONFIG);
  });

  it("sanitize() returns '' before module is ready (safe fallback)", async () => {
    // Never resolve the import within this test.
    vi.doMock("dompurify", () => new Promise(() => { /* never resolves */ }) as any);

    const { useDOMPurify } = await import("@/hooks/useDOMPurify");
    const { result } = renderHook(() => useDOMPurify());

    expect(result.current.isReady).toBe(false);
    const output = result.current.sanitize("<script>alert(1)</script>");
    expect(output).toBe("");
  });

  // ── 3. Error / fallback path ───────────────────────────────────────────

  it("sets error and keeps isReady=false when the import fails", async () => {
    // We simulate a failed import by mocking the module to return a rejected
    // promise. vi.doMock cannot use Promise.reject() directly (Vitest hoisting
    // constraint), so we wrap it in an async factory that throws instead.
    vi.doMock("dompurify", async () => {
      throw new Error("Network chunk failed");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { useDOMPurify } = await import("@/hooks/useDOMPurify");
    const { result } = renderHook(() => useDOMPurify());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.isReady).toBe(false);
    // The error message may be wrapped by Vitest's mock machinery; we
    // verify the error state is set and isReady stays false — which is
    // the safety contract the hook promises.
    expect(result.current.error).toBeInstanceOf(Error);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[useDOMPurify]"),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("sanitize() returns '' when the import has failed", async () => {
    vi.doMock("dompurify", async () => {
      throw new Error("chunk failed");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { useDOMPurify } = await import("@/hooks/useDOMPurify");
    const { result } = renderHook(() => useDOMPurify());

    await waitFor(() => expect(result.current.error).not.toBeNull());

    const output = result.current.sanitize("<b>content</b>");
    expect(output).toBe("");
  });

  // ── 4. Module caching ─────────────────────────────────────────────────

  it("only triggers one dynamic import when multiple components mount", async () => {
    let importCount = 0;
    vi.doMock("dompurify", () => {
      importCount++;
      return Promise.resolve({ default: mockDOMPurify });
    });

    const { useDOMPurify } = await import("@/hooks/useDOMPurify");

    const hook1 = renderHook(() => useDOMPurify());
    const hook2 = renderHook(() => useDOMPurify());
    const hook3 = renderHook(() => useDOMPurify());

    await waitFor(() => expect(hook1.result.current.isReady).toBe(true));
    await waitFor(() => expect(hook2.result.current.isReady).toBe(true));
    await waitFor(() => expect(hook3.result.current.isReady).toBe(true));

    // The dynamic import should have been called exactly once.
    expect(importCount).toBe(1);

    hook1.unmount();
    hook2.unmount();
    hook3.unmount();
  });

  // ── 5. Exported configs ────────────────────────────────────────────────

  it("RICH_TEXT_CONFIG allows safe tags", async () => {
    const { RICH_TEXT_CONFIG } = await import("@/hooks/useDOMPurify");
    expect(RICH_TEXT_CONFIG.ALLOWED_TAGS).toContain("b");
    expect(RICH_TEXT_CONFIG.ALLOWED_TAGS).toContain("a");
    expect(RICH_TEXT_CONFIG.ALLOWED_TAGS).not.toContain("script");
    expect(RICH_TEXT_CONFIG.ALLOWED_TAGS).not.toContain("iframe");
  });

  it("PLAIN_TEXT_CONFIG has empty ALLOWED_TAGS and ALLOWED_ATTR", async () => {
    const { PLAIN_TEXT_CONFIG } = await import("@/hooks/useDOMPurify");
    expect(PLAIN_TEXT_CONFIG.ALLOWED_TAGS).toEqual([]);
    expect(PLAIN_TEXT_CONFIG.ALLOWED_ATTR).toEqual([]);
  });
});
