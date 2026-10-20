/**
 * Stellar Name Service (SNS) types (Issue #727).
 *
 * SNS maps Stellar public keys to human-readable domains (e.g.
 * `alice.stellar`) and back. Lookups are cached for 1 hour and always degrade
 * gracefully to the raw address when resolution fails.
 */

/** Result of a forward (address → domain) lookup. */
export interface SnsForwardResult {
  /** The wallet address that was looked up. */
  address: string;
  /** The resolved SNS domain, or null when none is registered. */
  domain: string | null;
  /** True when the value came from cache rather than a fresh lookup. */
  cached: boolean;
  /** True when the lookup failed and `domain` is null (fallback to address). */
  failed: boolean;
}

/** Result of a reverse (domain → address) lookup. */
export interface SnsReverseResult {
  /** The domain that was looked up (normalised, lowercase). */
  domain: string;
  /** The resolved wallet address, or null when unregistered. */
  address: string | null;
  cached: boolean;
  failed: boolean;
}

/** An admin-approved domain → address ownership record. */
export interface SnsOwnershipRecord {
  domain: string;
  address: string;
  verifiedBy: string;
  verifiedAt: string;
  /** Optional free-text note from the verifying admin. */
  note?: string;
}

/** The pluggable resolution backend (real RPC, registry, or test double). */
export interface SnsResolver {
  /** Resolve an address to a domain, or null when none exists. */
  lookupAddress(address: string): Promise<string | null>;
  /** Resolve a domain to an address, or null when none exists. */
  lookupDomain(domain: string): Promise<string | null>;
}

/** Cache TTL for SNS lookups: 1 hour (Issue #727). */
export const SNS_CACHE_TTL_S = 60 * 60;

/** Basic SNS domain shape: a label followed by `.stellar`. */
export const SNS_DOMAIN_REGEX = /^[a-z0-9-]{1,63}\.stellar$/;

/** Normalise a user-entered domain to lowercase and strip a leading @. */
export function normalizeSnsDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, "");
}

/** True when the string is a structurally valid SNS domain. */
export function isValidSnsDomain(input: string): boolean {
  return SNS_DOMAIN_REGEX.test(normalizeSnsDomain(input));
}
