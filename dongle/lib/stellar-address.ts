/**
 * Stellar Address Utilities
 * Provides validation and formatting for Stellar public addresses and
 * Soroban contract IDs.
 */

// Stellar addresses are base-32 encoded with version byte,
// starting with 'G' and 55 characters long
const STELLAR_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * Soroban contract IDs use the Stellar strkey "C" prefix and are encoded in
 * base-32 (A-Z, 2-7).  Total length is 56 characters.
 *
 * This matches the ContractIdSchema regex in constants/contracts.ts.
 */
const SOROBAN_CONTRACT_ID_REGEX = /^C[A-Z2-7]{55}$/;

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

// ─── Soroban Contract ID ─────────────────────────────────────────────────────

/**
 * Returns true when the given string is a structurally valid Soroban contract
 * ID: starts with 'C', followed by exactly 55 base-32 characters (A–Z, 2–7),
 * total length 56.
 */
export function isValidSorobanContractId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  return SOROBAN_CONTRACT_ID_REGEX.test(id.trim().toUpperCase());
}

/**
 * Validates a Soroban contract ID and returns a normalised version or a
 * structured error message.
 */
export function validateSorobanContractId(
  id: string,
): { valid: true; normalized: string } | { valid: false; error: string } {
  if (!id || id.trim().length === 0) {
    return { valid: false, error: "Contract ID is required." };
  }

  const normalized = id.trim().toUpperCase();

  if (normalized.length !== 56) {
    return {
      valid: false,
      error: `Contract ID must be 56 characters long (got ${normalized.length}).`,
    };
  }

  if (!normalized.startsWith("C")) {
    return {
      valid: false,
      error: "Contract ID must start with 'C'.",
    };
  }

  if (!SOROBAN_CONTRACT_ID_REGEX.test(normalized)) {
    return {
      valid: false,
      error:
        "Contract ID contains invalid characters. Valid characters are A-Z and 2-7.",
    };
  }

  return { valid: true, normalized };
}
