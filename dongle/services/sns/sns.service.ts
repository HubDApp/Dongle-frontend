/**
 * Stellar Name Service (SNS) resolution service (Issue #727).
 *
 * Responsibilities:
 * - Forward lookup: wallet address → SNS domain.
 * - Reverse lookup: SNS domain → wallet address.
 * - 1-hour caching (Redis-first with in-memory fallback via lib/cache).
 * - Graceful fallback to the raw address whenever a lookup fails.
 * - Admin verification of domain ownership.
 *
 * The actual on-chain query is delegated to a pluggable `SnsResolver`. A
 * `NullResolver` is used by default so the app never makes surprise network
 * calls; wire a Soroban-backed resolver in production via `setSnsResolver`.
 */

import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "@/lib/cache";
import {
  normalizeSnsDomain,
  SNS_CACHE_TTL_S,
  type SnsForwardResult,
  type SnsOwnershipRecord,
  type SnsResolver,
  type SnsReverseResult,
} from "@/types/sns";

// ── Cache keys ────────────────────────────────────────────────────────────────

const cacheKey = {
  address: (address: string) => `sns:addr:${address}`,
  domain: (domain: string) => `sns:domain:${domain}`,
} as const;

// ── Resolver ──────────────────────────────────────────────────────────────────

/** Resolver that reports "not registered" for every query. */
const nullResolver: SnsResolver = {
  async lookupAddress() {
    return null;
  },
  async lookupDomain() {
    return null;
  },
};

let activeResolver: SnsResolver = nullResolver;

/** Install the production resolver (Soroban-backed). */
export function setSnsResolver(resolver: SnsResolver): void {
  activeResolver = resolver;
}

/** Restore the default no-op resolver (used by tests and teardown). */
export function resetSnsResolver(): void {
  activeResolver = nullResolver;
}

// ── Forward lookup (address → domain) ─────────────────────────────────────────

/**
 * Resolve a wallet address to its SNS domain.
 * Never throws: on any failure `domain` is null, `failed` is true, and callers
 * should fall back to displaying the address.
 */
export async function resolveAddressToDomain(
  address: string,
): Promise<SnsForwardResult> {
  const key = cacheKey.address(address);

  const cached = await cacheGet<string | null>(key);
  if (cached !== null) {
    return { address, domain: cached || null, cached: true, failed: false };
  }

  try {
    const domain = await activeResolver.lookupAddress(address);
    // Cache the raw value ("" for "no domain") to negative-cache misses too.
    await cacheSet(key, domain ?? "", SNS_CACHE_TTL_S);
    return { address, domain, cached: false, failed: false };
  } catch {
    return { address, domain: null, cached: false, failed: true };
  }
}

// ── Reverse lookup (domain → address) ─────────────────────────────────────────

/** Resolve an SNS domain to a wallet address. */
export async function resolveDomainToAddress(
  domainInput: string,
): Promise<SnsReverseResult> {
  const domain = normalizeSnsDomain(domainInput);
  const key = cacheKey.domain(domain);

  const cached = await cacheGet<string | null>(key);
  if (cached !== null) {
    return { domain, address: cached || null, cached: true, failed: false };
  }

  try {
    const address = await activeResolver.lookupDomain(domain);
    await cacheSet(key, address ?? "", SNS_CACHE_TTL_S);
    return { domain, address, cached: false, failed: false };
  } catch {
    return { domain, address: null, cached: false, failed: true };
  }
}

/** Invalidate both caches for an address (e.g. after an admin change). */
export async function invalidateSnsCache(address: string, domain?: string): Promise<void> {
  await cacheDel(cacheKey.address(address));
  if (domain) await cacheDel(cacheKey.domain(normalizeSnsDomain(domain)));
}

// ── Admin verification ────────────────────────────────────────────────────────

const ownershipRegistry = new Map<string, SnsOwnershipRecord>();

/**
 * Record an admin's verification that `domain` is owned by `address`.
 * Persisted in-process; a durable store can be layered on without changing
 * callers.
 */
export function verifyDomainOwnership(
  record: Omit<SnsOwnershipRecord, "verifiedAt">,
): SnsOwnershipRecord {
  const domain = normalizeSnsDomain(record.domain);
  const full: SnsOwnershipRecord = {
    ...record,
    domain,
    verifiedAt: new Date().toISOString(),
  };
  ownershipRegistry.set(domain, full);
  // Bust caches so the verified mapping is reflected immediately.
  void invalidateSnsCache(record.address, domain);
  return full;
}

/** Return the verification record for a domain, or null. */
export function getOwnershipRecord(domainInput: string): SnsOwnershipRecord | null {
  return ownershipRegistry.get(normalizeSnsDomain(domainInput)) ?? null;
}

/** True when the domain has been verified by an admin. */
export function isDomainVerified(domainInput: string): boolean {
  return getOwnershipRecord(domainInput) !== null;
}

/** Test helper — clear the ownership registry. */
export function _clearOwnershipRegistry(): void {
  ownershipRegistry.clear();
}

/** Test helper — purge all SNS lookup caches ("sns:" prefix). */
export async function _clearSnsCache(): Promise<void> {
  await cacheDelPattern("sns:");
}
