import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useSWRConfig } from "swr";
import useSWR from "swr";
import { SWRProvider, exponentialBackoff, SWR_GLOBAL_CONFIG } from "@/providers/SWRProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ConfigInspector() {
  const config = useSWRConfig();
  return (
    <div>
      <span data-testid="revalidateOnFocus">{String(config.revalidateOnFocus)}</span>
      <span data-testid="dedupingInterval">{String(config.dedupingInterval)}</span>
      <span data-testid="refreshInterval">{String(config.refreshInterval)}</span>
      <span data-testid="focusThrottleInterval">{String(config.focusThrottleInterval)}</span>
      <span data-testid="refreshWhenHidden">{String(config.refreshWhenHidden)}</span>
      <span data-testid="refreshWhenOffline">{String(config.refreshWhenOffline)}</span>
    </div>
  );
}

function FetchingComponent({ fetcher }: { fetcher: () => Promise<string> }) {
  const { data, error, isLoading } = useSWR("test-key", fetcher);
  if (isLoading) return <div data-testid="state">loading</div>;
  if (error) return <div data-testid="state">error: {String(error.message)}</div>;
  return <div data-testid="state">data: {data}</div>;
}

// ---------------------------------------------------------------------------
// SWRProvider — config propagation
// ---------------------------------------------------------------------------

describe("SWRProvider", () => {
  it("propagates revalidateOnFocus: true to all child hooks", () => {
    render(
      <SWRProvider>
        <ConfigInspector />
      </SWRProvider>,
    );

    expect(screen.getByTestId("revalidateOnFocus").textContent).toBe("true");
  });

  it("propagates dedupingInterval: 5000", () => {
    render(
      <SWRProvider>
        <ConfigInspector />
      </SWRProvider>,
    );

    expect(screen.getByTestId("dedupingInterval").textContent).toBe("5000");
  });

  it("sets refreshInterval to 0 (no global polling)", () => {
    render(
      <SWRProvider>
        <ConfigInspector />
      </SWRProvider>,
    );

    expect(screen.getByTestId("refreshInterval").textContent).toBe("0");
  });

  it("disables refreshWhenHidden and refreshWhenOffline", () => {
    render(
      <SWRProvider>
        <ConfigInspector />
      </SWRProvider>,
    );

    expect(screen.getByTestId("refreshWhenHidden").textContent).toBe("false");
    expect(screen.getByTestId("refreshWhenOffline").textContent).toBe("false");
  });

  it("renders children without errors", () => {
    render(
      <SWRProvider>
        <span data-testid="child">hello</span>
      </SWRProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SWR_GLOBAL_CONFIG — static shape
// ---------------------------------------------------------------------------

describe("SWR_GLOBAL_CONFIG", () => {
  it("has revalidateOnFocus true", () => {
    expect(SWR_GLOBAL_CONFIG.revalidateOnFocus).toBe(true);
  });

  it("has revalidateOnReconnect true", () => {
    expect(SWR_GLOBAL_CONFIG.revalidateOnReconnect).toBe(true);
  });

  it("has dedupingInterval 5000", () => {
    expect(SWR_GLOBAL_CONFIG.dedupingInterval).toBe(5_000);
  });

  it("has refreshInterval 0", () => {
    expect(SWR_GLOBAL_CONFIG.refreshInterval).toBe(0);
  });

  it("has focusThrottleInterval 10000", () => {
    expect(SWR_GLOBAL_CONFIG.focusThrottleInterval).toBe(10_000);
  });

  it("has refreshWhenHidden false", () => {
    expect(SWR_GLOBAL_CONFIG.refreshWhenHidden).toBe(false);
  });

  it("has refreshWhenOffline false", () => {
    expect(SWR_GLOBAL_CONFIG.refreshWhenOffline).toBe(false);
  });

  it("has revalidateIfStale true", () => {
    expect(SWR_GLOBAL_CONFIG.revalidateIfStale).toBe(true);
  });

  it("has an onErrorRetry function", () => {
    expect(typeof SWR_GLOBAL_CONFIG.onErrorRetry).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// exponentialBackoff — retry strategy
// ---------------------------------------------------------------------------

describe("exponentialBackoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules a retry after a positive delay on the first attempt", () => {
    const revalidate = vi.fn();
    exponentialBackoff(new Error("network"), revalidate, { retryCount: 0 });

    expect(revalidate).not.toHaveBeenCalled();
    // Advance past the maximum possible delay for attempt 0 (2 s base + 1 s jitter)
    vi.advanceTimersByTime(3_500);
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("does not retry after MAX_RETRIES (5) attempts", () => {
    const revalidate = vi.fn();
    exponentialBackoff(new Error("network"), revalidate, { retryCount: 5 });

    vi.advanceTimersByTime(60_000);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("does not retry on a 401 error", () => {
    const revalidate = vi.fn();
    const authError = { status: 401 };
    exponentialBackoff(authError, revalidate, { retryCount: 0 });

    vi.advanceTimersByTime(60_000);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("does not retry on a 403 error", () => {
    const revalidate = vi.fn();
    exponentialBackoff({ status: 403 }, revalidate, { retryCount: 0 });

    vi.advanceTimersByTime(60_000);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("does not retry on a 404 error", () => {
    const revalidate = vi.fn();
    exponentialBackoff({ status: 404 }, revalidate, { retryCount: 0 });

    vi.advanceTimersByTime(60_000);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("retries on a 500 error", () => {
    const revalidate = vi.fn();
    exponentialBackoff({ status: 500 }, revalidate, { retryCount: 0 });

    vi.advanceTimersByTime(3_500);
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("delay is capped at 30 s regardless of attempt count", () => {
    // At retryCount 10, 2^10 × 2 s = 2048 s, but we cap at 30 s.
    const revalidate = vi.fn();
    exponentialBackoff(new Error("network"), revalidate, { retryCount: 10 });

    // Should NOT fire before 30 s + 1 s jitter headroom
    vi.advanceTimersByTime(29_000);
    // May or may not have fired depending on jitter, but should fire by 31 s
    vi.advanceTimersByTime(2_000);
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("increases delay with each successive attempt", () => {
    // Attempt 1 fires in ~4–5 s, attempt 0 fires in ~2–3 s
    const calls0: number[] = [];
    const calls1: number[] = [];

    exponentialBackoff(new Error("e"), () => calls0.push(Date.now()), {
      retryCount: 0,
    });
    exponentialBackoff(new Error("e"), () => calls1.push(Date.now()), {
      retryCount: 1,
    });

    vi.advanceTimersByTime(10_000);

    expect(calls0.length).toBe(1);
    expect(calls1.length).toBe(1);
    // The second attempt fires later
    expect(calls1[0]).toBeGreaterThanOrEqual(calls0[0]);
  });
});

// ---------------------------------------------------------------------------
// Revalidation behaviour — integration
// ---------------------------------------------------------------------------

describe("SWRProvider revalidation behaviour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders data returned by the fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue("hello");

    render(
      <SWRProvider>
        <FetchingComponent fetcher={fetcher} />
      </SWRProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("data: hello");
    });
  });

  it("surfaces an error when the fetcher rejects", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("boom"));

    render(
      <SWRProvider>
        <FetchingComponent fetcher={fetcher} />
      </SWRProvider>,
    );

    // SWR will retry; advance time past all retries to settle on error
    await waitFor(
      () => {
        expect(screen.getByTestId("state").textContent).toContain("error");
      },
      { timeout: 5_000 },
    );
  });

  it("does not poll in the background (global refreshInterval is 0)", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount += 1;
      return Promise.resolve("ok");
    });

    render(
      <SWRProvider>
        <FetchingComponent fetcher={fetcher} />
      </SWRProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("data: ok");
    });

    const countAfterMount = callCount;

    // Advance 10 minutes; with refreshInterval: 0 no extra calls should occur
    vi.advanceTimersByTime(10 * 60 * 1_000);

    expect(callCount).toBe(countAfterMount);
  });
});
