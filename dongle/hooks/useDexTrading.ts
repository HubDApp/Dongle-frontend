"use client";

import { useState, useEffect, useCallback } from "react";
import { getDexTradingData, buildTradeLink, type DexTradingData } from "@/services/stellar/dex-trading.service";

export interface UseDexTradingResult {
  data: DexTradingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook that exposes Stellar DEX trading data for a token.
 */
export function useDexTrading(tokenCode: string, tokenIssuer: string): UseDexTradingResult {
  const [data, setData] = useState<DexTradingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tokenCode || !tokenIssuer) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getDexTradingData(tokenCode, tokenIssuer);
      setData(result);
      if (result.error) setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trading data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tokenCode, tokenIssuer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export { buildTradeLink, getDexTradingData };
export type { DexTradingData };
