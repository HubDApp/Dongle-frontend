/**
 * Stellar DEX trading data service.
 *
 * Fetches trading metrics for a project's token from the Stellar Horizon
 * /trades endpoint, caches the result for 5 minutes, and degrades gracefully
 * when the token is not listed on the Stellar DEX or Horizon is unreachable.
 *
 * Acceptance criteria (issue #725):
 *  - Detect if a project has a token on Stellar DEX
 *  - Display trading metrics: current price, 24h volume, price chart (7 days), liquidity
 *  - Link to trade on DEX
 *  - Data fetched from Horizon /trades endpoint
 *  - Cache data for 5 minutes
 *  - Graceful fallback if token not found
 */

import type { Asset } from "stellar-sdk";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface DexCacheEntry {
  data: DexTradingData;
  expiresAt: number;
}

const cache = new Map<string, DexCacheEntry>();

export interface DexTrade {
  id: string;
  timestamp: string;
  baseAmount: string;
  counterAmount: string;
  price: string;
}

export interface DexTradingData {
  hasToken: boolean;
  token?: {
    code: string;
    issuer: string;
  };
  currentPrice?: string; // price in counter asset (XLM/USDC)
  priceChange24h?: string;
  volume24h?: string; // counter asset volume over last 24h
  liquidity?: string; // available counter asset liquidity
  chart7d: { timestamp: string; price: string }[];
  trades: DexTrade[];
  tradeLink: string; // link to trade on DEX (StellarTerm / Lobstr)
  updatedAt: string;
  source: "horizon" | "fallback";
  error?: string;
}

interface HorizonTrade {
  ledger_close_time: string;
  base_amount: string;
  counter_amount: string;
  price: { r: string; n: string; d: string };
  base: { type: string; code?: string; issuer?: string };
  counter: { type: string; code?: string; issuer?: string };
}

interface HorizonTradesResponse {
  _embedded: { records: HorizonTrade[] };
}

/**
 * Horizon instance to query. Defaults to public testnet horizon.
 */
function getHorizonUrl(): string {
  if (typeof process !== "undefined" && process.env.STELLAR_HORIZON_URL) {
    return process.env.STELLAR_HORIZON_URL;
  }
  return "https://horizon-testnet.stellar.org";
}

/**
 * Build the DEX trade link for a given asset.
 */
export function buildTradeLink(tokenCode: string, tokenIssuer: string): string {
  return `https://stellarterm.co/#/trade?asset=${tokenCode}:${tokenIssuer}&focus=buy`;
}

/**
 * Parse a Horizon asset record into { code, issuer }.
 */
function assetKey(asset: HorizonTrade["base"] | HorizonTrade["counter"]): string | null {
  if (asset.type === "native") return "native:stellar";
  if (!asset.code || !asset.issuer) return null;
  return `${asset.code}:${asset.issuer}`;
}

/**
 * Fetch recent trades for a trading pair from Horizon /trades.
 */
async function fetchHorizonTrades(
  baseAsset: string,
  counterAsset: string,
  limit = 200,
): Promise<HorizonTrade[]> {
  const [baseCode, baseIssuer] = baseAsset.split(":");
  const [counterCode, counterIssuer] = counterAsset.split(":");

  const params = new URLSearchParams();
  params.append("limit", String(limit));
  params.append("order", "desc");
  if (baseCode && baseCode !== "native") params.append("base_asset_type", "credit_alphanum4");
  if (baseCode && baseCode !== "native") params.append("base_asset_code", baseCode);
  if (baseIssuer) params.append("base_asset_issuer", baseIssuer);
  if (counterCode && counterCode !== "native") params.append("counter_asset_type", "credit_alphanum4");
  if (counterCode && counterCode !== "native") params.append("counter_asset_code", counterCode);
  if (counterIssuer) params.append("counter_asset_issuer", counterIssuer);

  const url = `${getHorizonUrl()}/trades?${params.toString()}`;
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Horizon returned ${response.status}`);
  const json: HorizonTradesResponse = await response.json();
  return json._embedded.records;
}

/**
 * Detect whether a project's token is listed on the Stellar DEX and gather
 * trading metrics. Returns a graceful fallback when the token is not found or
 * Horizon is unavailable.
 */
export async function getDexTradingData(
  tokenCode: string,
  tokenIssuer: string,
): Promise<DexTradingData> {
  const cacheKey = `${tokenCode}:${tokenIssuer}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const fallback: DexTradingData = {
    hasToken: false,
    token: { code: tokenCode, issuer: tokenIssuer },
    chart7d: [],
    trades: [],
    tradeLink: buildTradeLink(tokenCode, tokenIssuer),
    updatedAt: new Date().toISOString(),
    source: "fallback",
    error: "Token not found on Stellar DEX or Horizon unavailable",
  };

  try {
    // Probe both directions (token/XLM and XLM/token) to detect listing.
    const pairs: [string, string][] = [
      [`${tokenCode}:${tokenIssuer}`, "native:stellar"],
      ["native:stellar", `${tokenCode}:${tokenIssuer}`],
    ];

    let allTrades: HorizonTrade[] = [];
    let detectedPair: [string, string] | null = null;

    for (const [base, counter] of pairs) {
      try {
        const trades = await fetchHorizonTrades(base, counter);
        if (trades.length > 0) {
          detectedPair = [base, counter];
          allTrades = trades;
          break;
        }
      } catch {
        // Try the other direction.
      }
    }

    if (!detectedPair || allTrades.length === 0) {
      cache.set(cacheKey, { data: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
      return fallback;
    }

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const trades: DexTrade[] = allTrades.map((t) => ({
      id: `${t.ledger_close_time}-${t.base_amount}-${t.counter_amount}`,
      timestamp: t.ledger_close_time,
      baseAmount: t.base_amount,
      counterAmount: t.counter_amount,
      price: t.price.r || `${Number(t.counter_amount) / Number(t.base_amount || 1)}`,
    }));

    const volume24h = allTrades
      .filter((t) => new Date(t.ledger_close_time).getTime() >= dayAgo)
      .reduce((sum, t) => sum + Number(t.counter_amount), 0)
      .toFixed(6);

    const latestPrice = trades[0]?.price ?? "0";
    const price24hAgo = trades
      .slice()
      .reverse()
      .find((t) => new Date(t.timestamp).getTime() >= dayAgo)?.price;
    const priceChange24h = price24hAgo
      ? ((Number(latestPrice) - Number(price24hAgo)) / Number(price24hAgo) * 100).toFixed(2)
      : "0";

    const liquidity = allTrades
      .filter((t) => new Date(t.ledger_close_time).getTime() >= dayAgo)
      .reduce((sum, t) => sum + Number(t.base_amount), 0)
      .toFixed(6);

    const chart7d = allTrades
      .filter((t) => new Date(t.ledger_close_time).getTime() >= sevenDaysAgo)
      .map((t) => ({ timestamp: t.ledger_close_time, price: t.price.r || "0" }));

    const data: DexTradingData = {
      hasToken: true,
      token: { code: tokenCode, issuer: tokenIssuer },
      currentPrice: latestPrice,
      priceChange24h,
      volume24h,
      liquidity,
      chart7d,
      trades: trades.slice(0, 50),
      tradeLink: buildTradeLink(tokenCode, tokenIssuer),
      updatedAt: new Date().toISOString(),
      source: "horizon",
    };

    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (error) {
    fallback.error = error instanceof Error ? error.message : "Horizon unavailable";
    cache.set(cacheKey, { data: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
    return fallback;
  }
}

/**
 * Clear the DEX cache (useful for tests / admin refresh).
 */
export function clearDexCache(tokenCode?: string, tokenIssuer?: string) {
  if (tokenCode && tokenIssuer) {
    cache.delete(`${tokenCode}:${tokenIssuer}`);
  } else {
    cache.clear();
  }
}
