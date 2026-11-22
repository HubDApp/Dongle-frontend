/**
 * Issue #878 – Preview Transaction Costs Before Signing
 *
 * Fetches an estimated fee for a Soroban transaction via `simulateTransaction`
 * before the user signs it.  Returns a structured breakdown with real-time
 * USD conversion so the UI can render:
 *
 *   "Estimated cost: 0.001 XLM ($0.03 USD)"
 *
 * and warn the user when the cost exceeds a configurable threshold.
 */

import { SOROBAN_CONFIG } from "@/constants/contracts";

// ─── Constants ────────────────────────────────────────────────────────────────

/** High-fee warning threshold in stroops (1 XLM = 10 000 000 stroops). */
const HIGH_FEE_THRESHOLD_STROOPS = 10_000_000; // 1 XLM

const XLM_TO_STROOP = 10_000_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeeBreakdown {
  /** Base network fee in stroops. */
  baseFeeStroops: number;
  /** Soroban resource fee in stroops. */
  resourceFeeStroops: number;
  /** Total fee in stroops. */
  totalStroops: number;
  /** Total fee in XLM (human-readable). */
  totalXlm: string;
  /** Total fee converted to USD using the latest spot price. */
  totalUsd: string | null;
  /** Formatted display string: "Estimated cost: 0.001 XLM ($0.03 USD)". */
  displayLabel: string;
  /** True when the total fee exceeds HIGH_FEE_THRESHOLD_STROOPS (1 XLM). */
  isHighCost: boolean;
}

export interface FeeEstimateResult {
  success: true;
  fee: FeeBreakdown;
}

export interface FeeEstimateError {
  success: false;
  error: string;
}

export type FeeEstimateResponse = FeeEstimateResult | FeeEstimateError;

/** Shape of the Soroban `simulateTransaction` RPC response. */
interface SimulateTransactionResult {
  error?: { message?: string };
  result?: {
    minResourceFee?: string | number;
    cost?: { cpuInsns?: string; memBytes?: string };
  };
  /** Some RPC nodes wrap the result in a `results` array. */
  results?: Array<{ xdr?: string; auth?: string[] }>;
}

// ─── USD price helper ─────────────────────────────────────────────────────────

/** Simple in-memory XLM/USD price cache (60-second TTL). */
let cachedXlmUsd: number | null = null;
let cacheExpiresAt = 0;

/**
 * Fetches the latest XLM/USD spot price from Stellar's Horizon DEX ticker.
 * Returns `null` on failure so the UI degrades gracefully.
 */
async function fetchXlmUsdPrice(): Promise<number | null> {
  if (cachedXlmUsd !== null && Date.now() < cacheExpiresAt) {
    return cachedXlmUsd;
  }
  try {
    // Horizon's /order_book?selling_asset_type=native&buying_asset_code=USDC
    // gives the best bid; we use a simple coingecko-compatible endpoint instead
    // to avoid cross-origin issues and dependency on a specific USDC issuer.
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd";
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { stellar?: { usd?: number } };
    const price = data?.stellar?.usd ?? null;
    if (price !== null) {
      cachedXlmUsd = price;
      cacheExpiresAt = Date.now() + 60_000;
    }
    return price;
  } catch {
    return null;
  }
}

// ─── Core service ─────────────────────────────────────────────────────────────

/**
 * Simulates a transaction against the Soroban RPC and returns a full fee
 * breakdown including USD conversion.
 *
 * @param transactionXdr - Base64-encoded XDR of the unsigned transaction.
 * @param rpcUrl         - Soroban RPC endpoint (defaults to env config).
 *
 * @example
 * const result = await estimateTransactionFee(unsignedTx.toXDR());
 * if (result.success) {
 *   console.log(result.fee.displayLabel);
 *   if (result.fee.isHighCost) {
 *     // Show "Proceed anyway?" warning
 *   }
 * }
 */
export async function estimateTransactionFee(
  transactionXdr: string,
  rpcUrl = SOROBAN_CONFIG.RPC_URL,
): Promise<FeeEstimateResponse> {
  if (!transactionXdr) {
    return { success: false, error: "Transaction XDR is required." };
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "simulateTransaction",
        params: { transaction: transactionXdr },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { success: false, error: `RPC HTTP ${response.status}` };
    }

    const body = (await response.json()) as { result?: SimulateTransactionResult; error?: { message?: string } };

    if (body.error) {
      return { success: false, error: body.error.message ?? "simulateTransaction RPC error" };
    }

    const sim = body.result ?? (body as unknown as SimulateTransactionResult);
    if (sim.error) {
      return { success: false, error: sim.error.message ?? "simulateTransaction error" };
    }

    // `minResourceFee` is returned in stroops (as a string in some SDK versions).
    const resourceFeeStroops = Number(sim.result?.minResourceFee ?? 0);
    // Base fee: Stellar network minimum (100 stroops per operation).
    const baseFeeStroops = 100;
    const totalStroops = baseFeeStroops + resourceFeeStroops;

    const totalXlm = (totalStroops / XLM_TO_STROOP).toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0");

    const xlmPrice = await fetchXlmUsdPrice();
    const totalUsd =
      xlmPrice !== null
        ? `$${((totalStroops / XLM_TO_STROOP) * xlmPrice).toFixed(4)}`
        : null;

    const displayLabel = totalUsd
      ? `Estimated cost: ${totalXlm} XLM (${totalUsd} USD)`
      : `Estimated cost: ${totalXlm} XLM`;

    const isHighCost = totalStroops > HIGH_FEE_THRESHOLD_STROOPS;

    return {
      success: true,
      fee: {
        baseFeeStroops,
        resourceFeeStroops,
        totalStroops,
        totalXlm,
        totalUsd,
        displayLabel,
        isHighCost,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Fee estimation failed: ${message}` };
  }
}

/**
 * Returns a human-readable high-cost warning string when `fee.isHighCost` is true.
 *
 * @example
 * if (result.fee.isHighCost) {
 *   toast.warn(highCostWarning(result.fee));
 * }
 */
export function highCostWarning(fee: FeeBreakdown): string {
  return (
    `This transaction costs ${fee.totalXlm} XLM` +
    (fee.totalUsd ? ` (${fee.totalUsd} USD)` : "") +
    ", which exceeds the 1 XLM threshold. Proceed anyway?"
  );
}
