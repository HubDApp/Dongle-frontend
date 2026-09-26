/**
 * Password hashing and verification utilities.
 *
 * Security approach:
 * - Hashing uses PBKDF2 via the Web Crypto API (subtle.crypto) with a SHA-256
 *   HMAC and a random 16-byte salt, producing a 32-byte derived key.
 * - Verification uses a timing-safe comparison of the derived key to prevent
 *   timing side-channel attacks.
 * - Strength validation provides a simple score (0-4) based on length and
 *   character variety; production applications should tune these thresholds.
 *
 * All functions work in both server (Node.js 20+) and browser runtimes that
 * support the Web Crypto API.
 */

export interface PasswordHash {
  /** Base64-encoded random salt (16 bytes) */
  salt: string;
  /** Base64-encoded derived key (32 bytes) */
  hash: string;
  /** Number of PBKDF2 iterations */
  iterations: number;
}

/** Default PBKDF2 iteration count (OWASP 2023 recommendation ≥ 600 000 for SHA-256). */
const DEFAULT_ITERATIONS = 600_000;

/** Salt length in bytes. */
const SALT_LENGTH = 16;

/** Derived key length in bytes. */
const KEY_LENGTH = 32;

/**
 * Hash a password using PBKDF2 via the Web Crypto API.
 *
 * @param password - The plain-text password to hash.
 * @param iterations - PBKDF2 iteration count (defaults to 600 000).
 * @returns A PasswordHash object containing salt, hash, and iteration count.
 */
export async function hashPassword(
  password: string,
  iterations: number = DEFAULT_ITERATIONS,
): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  return {
    salt: uint8ArrayToBase64(salt),
    hash: uint8ArrayToBase64(new Uint8Array(derivedBits)),
    iterations,
  };
}

/**
 * Verify a password against a previously generated hash.
 *
 * @param password - The plain-text password to verify.
 * @param stored - The PasswordHash object from a previous hashPassword call.
 * @returns True if the password matches; false otherwise.
 */
export async function verifyPassword(
  password: string,
  stored: PasswordHash,
): Promise<boolean> {
  try {
    const salt = base64ToUint8Array(stored.salt);
    const expectedHash = base64ToUint8Array(stored.hash);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: stored.iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      KEY_LENGTH * 8,
    );

    const computedHash = new Uint8Array(derivedBits);

    // Constant-time comparison to prevent timing attacks
    return constantTimeEqual(computedHash, expectedHash);
  } catch {
    return false;
  }
}

/**
 * Serialize a PasswordHash to a portable string format:
 *   "pbkdf2_sha256${iterations}$${salt}$${hash}"
 *
 * This format can be stored in a single database column.
 */
export function serializeHash(hash: PasswordHash): string {
  return `pbkdf2_sha256${hash.iterations}$${hash.salt}$${hash.hash}`;
}

/**
 * Parse a serialized hash string back into a PasswordHash object.
 * Returns null if the format is invalid.
 */
export function deserializeHash(encoded: string): PasswordHash | null {
  const PREFIX_RE = /^pbkdf2_sha256(\d+)\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/;
  const match = encoded.match(PREFIX_RE);
  if (!match) return null;

  const iterations = parseInt(match[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1) return null;

  return {
    iterations,
    salt: match[2],
    hash: match[3],
  };
}

/**
 * Evaluate the strength of a password on a scale of 0 (worst) to 4 (best).
 *
 * Criteria:
 * - 1 point for length ≥ 8
 * - 1 point for length ≥ 12
 * - 1 point for containing at least one uppercase letter
 * - 1 point for containing at least one digit
 * - 1 point for containing at least one non-alphanumeric character
 */
export function passwordStrength(password: string): number {
  if (!password) return 0;

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return score;
}

/**
 * Human-readable label for a strength score.
 */
export function strengthLabel(score: number): string {
  switch (score) {
    case 0:
      return "Very weak";
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Strong";
    case 4:
      return "Very strong";
    default:
      return "Unknown";
  }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Constant-time comparison of two Uint8Arrays.
 * Returns false if lengths differ, otherwise compares every byte without
 * early-exit on the first mismatch.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}