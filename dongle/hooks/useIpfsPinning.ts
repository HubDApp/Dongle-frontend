"use client";

import { useState, useEffect, useCallback } from "react";
import {
  pinContent,
  verifyPin,
  listPins,
  type PinningProvider,
  type PinResult,
  type PinStatus,
} from "@/services/ipfs/pinning.service";

export interface UseIpfsPinningResult {
  pins: PinStatus[];
  loading: boolean;
  pin: (cid: string, size: number, provider: PinningProvider) => Promise<PinResult | null>;
  verify: (cid: string, provider: PinningProvider) => Promise<PinStatus | null>;
  refresh: () => Promise<void>;
  error: string | null;
}

/**
 * Hook for IPFS pinning operations. Powers the admin pinning panel (issue #724).
 */
export function useIpfsPinning() {
  const [pins, setPins] = useState<PinStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tracked = listPins();
      const statuses = await Promise.all(
        tracked.map((p) => verifyPin(p.cid, p.provider)),
      );
      setPins(statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh pin status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pin = useCallback(
    async (cid: string, size: number, provider: PinningProvider): Promise<PinResult | null> => {
      setError(null);
      try {
        const result = await pinContent(cid, size, provider);
        await refresh();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pin failed");
        return null;
      }
    },
    [refresh],
  );

  const verify = useCallback(
    async (cid: string, provider: PinningProvider): Promise<PinStatus | null> => {
      setError(null);
      try {
        return await verifyPin(cid, provider);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
        return null;
      }
    },
    [],
  );

  return { pins, loading, pin, verify, refresh, error };
}

export type { PinningProvider, PinResult, PinStatus };
