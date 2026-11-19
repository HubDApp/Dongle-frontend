/**
 * Retry and offline handling (#910)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  retryWithBackoff,
  withNetworkGuard,
  NETWORK_ACTIONS,
} from "@/lib/network-guard";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const networkFailure = () => new TypeError("Failed to fetch");

describe("retryWithBackoff", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("retries a throwing fetch with exponential backoff and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(networkFailure())
      .mockRejectedValueOnce(networkFailure())
      .mockResolvedValueOnce("ok");

    const promise = retryWithBackoff(fetchMock, { initialDelay: 100, backoffMultiplier: 2 });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await expect(promise).resolves.toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after the max retry limit with the last error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(networkFailure());
    const promise = retryWithBackoff(fetchMock, { maxRetries: 2, initialDelay: 10 });
    const assertion = expect(promise).rejects.toThrow("Failed to fetch");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("caps the delay at maxDelay", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(networkFailure())
      .mockRejectedValueOnce(networkFailure())
      .mockResolvedValueOnce("ok");
    const promise = retryWithBackoff(fetchMock, {
      initialDelay: 100,
      backoffMultiplier: 10,
      maxDelay: 150,
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(150);
    await expect(promise).resolves.toBe("ok");
  });

  it("does not retry non-network errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("400 Bad Request"));
    await expect(retryWithBackoff(fetchMock)).rejects.toThrow("400 Bad Request");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("offline mode", () => {
  const setOnline = (value: boolean) =>
    Object.defineProperty(navigator, "onLine", { value, configurable: true });

  afterEach(() => setOnline(true));

  it("blocks network actions while offline and shows the user a message", async () => {
    const submit = vi.fn().mockResolvedValue("sent");
    const guarded = withNetworkGuard(false, NETWORK_ACTIONS.REVIEW_SUBMIT, submit);
    await expect(guarded()).rejects.toThrow(NETWORK_ACTIONS.REVIEW_SUBMIT.offlineMessage);
    expect(submit).not.toHaveBeenCalled();
  });

  it("activates offline mode and triggers a sync on reconnect", () => {
    setOnline(true);
    const onOffline = vi.fn();
    const sync = vi.fn();
    const { result } = renderHook(() => useOnlineStatus({ onOffline, onOnline: sync }));

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);
    expect(onOffline).toHaveBeenCalledTimes(1);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
    expect(sync).toHaveBeenCalledTimes(1);
  });
});
