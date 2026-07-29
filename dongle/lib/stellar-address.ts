/**
 * Stellar Address Utilities
 * Provides validation and formatting for Stellar public addresses
 */

// Stellar addresses are base-32 encoded with version byte,
// starting with 'G' and 55 characters long
const STELLAR_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * Validates a Stellar wallet address format.
 * Checks that the address starts with 'G', is 56 characters long,
 * and contains only valid base-32 characters.
 */
export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  const trimmed = address.trim().toUpperCase();
  return STELLAR_ADDRESS_REGEX.test(trimmed);
}

/**
 * Validates a Stellar address and returns a normalized version or error message.
 */
export function validateStellarAddress(
  address: string,
): { valid: true; normalized: string } | { valid: false; error: string } {
  if (!address || address.trim().length === 0) {
    return { valid: false, error: "Stellar address is required." };
  }

  const normalized = address.trim().toUpperCase();

  if (normalized.length !== 56) {
    return {
      valid: false,
      error: `Stellar address must be 56 characters long (got ${normalized.length}).`,
    };
  }

  if (!normalized.startsWith("G")) {
    return {
      valid: false,
      error: "Stellar address must start with 'G'.",
    };
  }

  if (!STELLAR_ADDRESS_REGEX.test(normalized)) {
    return {
      valid: false,
      error:
        "Stellar address contains invalid characters. Only letters A-Z and digits 0-9 are allowed.",
    };
  }

  return { valid: true, normalized };
}

/**
 * Abbreviate a Stellar address for display purposes.
 * Shows first 4 and last 4 characters with ellipsis.
 * Example: GBCD...XYZ1
 */
export function abbreviateStellarAddress(address: string): string {
  if (!address || address.length < 8) return address || "";
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
