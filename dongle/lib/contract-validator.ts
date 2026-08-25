import { rpc, Contract } from "stellar-sdk";

// ─── Error class ──────────────────────────────────────────────────────────────

/**
 * Thrown when a Soroban contract ID passes format validation but is not found
 * on the network. This indicates the contract has not been deployed to the
 * configured RPC endpoint/network, or the wrong network passphrase is set.
 */
export class ContractNotFoundError extends Error {
  /** The contract ID that was not found. */
  readonly contractId: string;
  /** The RPC URL that was queried. */
  readonly rpcUrl: string;

  constructor(contractId: string, rpcUrl: string) {
    super(
      `Contract not found on network: ${contractId}. ` +
        `Verify the contract is deployed to the network served by ${rpcUrl} ` +
        `and that NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE matches the target network.`,
    );
    this.name = "ContractNotFoundError";
    this.contractId = contractId;
    this.rpcUrl = rpcUrl;
  }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  /** true = contract exists, false = contract does not exist */
  exists: boolean;
  /** Epoch ms when this entry expires */
  expiresAt: number;
}

/** In-memory validation cache: `${rpcUrl}::${contractId}` → CacheEntry */
const cache = new Map<string, CacheEntry>();

/**
 * Exposed for testing only. Clears all cached entries.
 * @internal
 */
export function _clearValidationCache(): void {
  cache.clear();
}

/**
 * Exposed for testing only. Returns the number of entries currently cached.
 * @internal
 */
export function _validationCacheSize(): number {
  return cache.size;
}

// ─── Core validator ───────────────────────────────────────────────────────────

/**
 * Checks whether a Soroban contract exists on the network by querying the
 * contract's instance ledger entry via `getLedgerEntries`. The result is
 * cached for 1 hour so repeated lookups within a session are free.
 *
 * - Returns `true` when the contract instance ledger entry is present.
 * - Returns `false` when the RPC responds with an empty entries list or a
 *   404-coded rejection (contract not deployed or entry expired).
 * - Re-throws any unexpected network/RPC error (timeouts, 5xx, etc.) so
 *   callers can decide whether to treat it as a hard failure or log-and-skip.
 *
 * @param contractId  A structurally-valid 56-char Stellar contract ID (`C…`).
 * @param rpcUrl      Soroban RPC URL to query (e.g. `SOROBAN_CONFIG.RPC_URL`).
 */
export async function checkContractExists(
  contractId: string,
  rpcUrl: string,
): Promise<boolean> {
  const cacheKey = `${rpcUrl}::${contractId}`;
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.exists;
  }

  const server = new rpc.Server(rpcUrl, { timeout: 10_000 });

  let exists: boolean;
  try {
    // Contract.getFootprint() returns the LedgerKey for the contract's
    // instance entry — the canonical way to probe whether a contract is
    // deployed without executing a transaction.
    const footprint = new Contract(contractId).getFootprint();
    const response = await server.getLedgerEntries(footprint);
    exists = response.entries.length > 0;
  } catch (err) {
    if (isNotFoundError(err)) {
      exists = false;
    } else {
      // Unexpected error (network down, timeout, malformed response) —
      // do not cache, re-throw so the caller can decide how to handle it.
      throw err;
    }
  }

  cache.set(cacheKey, { exists, expiresAt: now + CACHE_TTL_MS });
  return exists;
}

/**
 * Validates that a contract ID is actually deployed on the network. Throws
 * {@link ContractNotFoundError} when the contract is not found.
 *
 * This is the high-level entry point for UI and build-time checks.
 *
 * @param contractId  A structurally-valid 56-char Stellar contract ID.
 * @param rpcUrl      Soroban RPC URL to query.
 * @throws {ContractNotFoundError} If the contract does not exist on the network.
 */
export async function validateContractExists(
  contractId: string,
  rpcUrl: string,
): Promise<void> {
  const exists = await checkContractExists(contractId, rpcUrl);
  if (!exists) {
    throw new ContractNotFoundError(contractId, rpcUrl);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true for any error shape that indicates the contract ledger entry
 * was not found, as opposed to a network or infrastructure failure.
 *
 * The stellar-sdk `getLedgerEntries` path rejects with a plain object
 * `{ code: 404, message: "..." }` — not an Error instance — when the entry
 * is absent. This helper handles both that shape and standard Error messages.
 */
function isNotFoundError(err: unknown): boolean {
  if (err === null || err === undefined) return false;

  // Plain object rejection from stellar-sdk: { code: 404, message: "..." }
  if (typeof err === "object") {
    const maybeCode = (err as { code?: unknown }).code;
    if (maybeCode === 404) return true;
  }

  // Error instance with a descriptive message
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("entrynotfound") ||
      msg.includes("entry not found") ||
      msg.includes("not_found") ||
      msg.includes("not found") ||
      msg.includes("contract data not found")
    );
  }

  return false;
}
