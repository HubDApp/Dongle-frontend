"use client";

/**
 * SWRProvider
 *
 * Wraps the entire client tree in SWRConfig, establishing app-wide defaults
 * for every useSWR call that doesn't explicitly override them.
 *
 * Design decisions
 * ─────────────────
 * • revalidateOnFocus: true  — keeps data fresh when the user returns to the
 *   tab (e.g. after completing a Stellar transaction in another window).
 *
 * • dedupingInterval: 5 000 ms  — collapses concurrent requests for the same
 *   key into a single in-flight fetch.  5 s is intentionally shorter than the
 *   30 s SWR default because Dongle renders many cards on a single page and
 *   some are mounted/unmounted rapidly during navigation.
 *
 * • refreshInterval: 0  — no background polling at the global level.  Hooks
 *   that genuinely need periodic refresh (e.g. useVerificationStatuses with
 *   refreshInterval: 300_000) set their own value and it overrides this zero.
 *
 * • focusThrottleInterval: 10 000 ms  — prevents a burst of revalidations
 *   when the browser fires multiple focus events in quick succession.
 *
 * • onErrorRetry (exponential back-off)  — replaces the default fixed-delay
 *   retry with a capped exponential strategy:
 *
 *       base: 2 s, factor: 2, jitter: 0–1 s, cap: 30 s, max attempts: 5
 *
 *   This matches the guidance in the SWR docs and avoids hammering an already
 *   struggling backend while still recovering quickly from transient errors.
 *
 * • 404 / 401 responses are not retried — retrying authentication or
 *   not-found errors is pointless and wastes bandwidth.
 */

import { SWRConfig, type SWRConfiguration } from "swr";

// ---------------------------------------------------------------------------
// Exponential back-off with jitter
// ---------------------------------------------------------------------------

/** Maximum number of retry attempts before giving up. */
const MAX_RETRIES = 5;

/** Base delay in milliseconds for the first retry. */
const BASE_DELAY_MS = 2_000;

/** Hard ceiling for any single delay. */
const MAX_DELAY_MS = 30_000;

export function exponentialBackoff(
  error: unknown,
  revalidate: () => void,
  context: { retryCount: number },
): void {
  const { retryCount } = context;

  // Do not retry on permanent client errors.
  if (error instanceof Response || (error as { status?: number })?.status) {
    const status = (error as { status: number }).status;
    if (status === 401 || status === 403 || status === 404) return;
  }

  if (retryCount >= MAX_RETRIES) return;

  // 2^retryCount × BASE_DELAY + random jitter up to 1 s
  const delay = Math.min(
    BASE_DELAY_MS * 2 ** retryCount + Math.random() * 1_000,
    MAX_DELAY_MS,
  );

  setTimeout(revalidate, delay);
}

// ---------------------------------------------------------------------------
// Global SWR configuration
// ---------------------------------------------------------------------------

export const SWR_GLOBAL_CONFIG: SWRConfiguration = {
  /**
   * Revalidate when the window regains focus.  Useful for a dApp where users
   * switch to their wallet, sign a transaction, then return to Dongle.
   */
  revalidateOnFocus: true,

  /**
   * Revalidate automatically when the browser reconnects after going offline.
   */
  revalidateOnReconnect: true,

  /**
   * Deduplicate requests for the same key within this window (ms).
   * Individual hooks may tighten this (e.g. useVerificationStatuses uses 60 s).
   */
  dedupingInterval: 5_000,

  /**
   * No global background polling.  Hooks that need it set their own value.
   */
  refreshInterval: 0,

  /**
   * Throttle focus-triggered revalidations so rapid tab switches don't pile up.
   */
  focusThrottleInterval: 10_000,

  /**
   * Retry failed requests with exponential back-off (see above).
   */
  onErrorRetry: exponentialBackoff,

  /**
   * Keep showing stale data while revalidating — the core SWR pattern.
   * This is the default, but we set it explicitly so its intent is clear.
   */
  revalidateIfStale: true,

  /**
   * Do not poll while the browser tab is hidden.  Saves bandwidth and avoids
   * waking up Soroban RPC connections unnecessarily.
   */
  refreshWhenHidden: false,

  /**
   * Do not poll while the device is offline.
   */
  refreshWhenOffline: false,
};

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

interface SWRProviderProps {
  children: React.ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={SWR_GLOBAL_CONFIG}>{children}</SWRConfig>;
}
