/**
 * RFC 6238 TOTP helpers built on the Web Crypto API.
 *
 * Runtime-agnostic (Node 18+/Edge) — uses `crypto.subtle` and
 * `crypto.getRandomValues` only. Used by the admin 2FA service (#728).
 */

const TOTP_TIME_STEP = 30;
const TOTP_CODE_LENGTH = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encode bytes to a base32 string (RFC 4648, no padding). */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return output;
}

/** Decode a base32 string (RFC 4648, padding optional) to bytes. */
export function base32Decode(base32: string): Uint8Array {
  const cleaned = base32.replace(/[^A-Za-z2-7]/g, "").toUpperCase();
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

/** Generate a fresh 20-byte base32 TOTP secret. */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

async function computeHmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message);
  return new Uint8Array(signature);
}

/** Compute the HOTP value for a counter (RFC 4226). */
async function hotp(secret: Uint8Array, counter: bigint): Promise<string> {
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = Number(c & BigInt(0xff));
    c >>= BigInt(8);
  }
  const hmac = await computeHmacSha1(secret, msg);
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! << 16) & 0xff0000) |
    ((hmac[offset + 2]! << 8) & 0xff00) |
    (hmac[offset + 3]! & 0xff);
  return (binary % 10 ** TOTP_CODE_LENGTH).toString().padStart(TOTP_CODE_LENGTH, "0");
}

/** Current TOTP counter for a timestamp (ms). */
export function currentTotpCounter(time: number = Date.now()): bigint {
  return BigInt(Math.floor(time / 1000 / TOTP_TIME_STEP));
}

/**
 * Verify a code against a secret, allowing ±1 step of clock drift.
 * `atTime` is injectable for deterministic tests.
 */
export async function verifyTotp(
  secretBase32: string,
  code: string,
  atTime: number = Date.now(),
): Promise<boolean> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;
  try {
    const secret = base32Decode(secretBase32);
    const counter = currentTotpCounter(atTime);
    for (let offset = -1; offset <= 1; offset++) {
      const expected = await hotp(secret, counter + BigInt(offset));
      if (expected === trimmed) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Build an otpauth:// URI for QR-code enrolment. */
export function buildTotpUri(secret: string, accountName: string, issuer = "Dongle Admin"): string {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(accountName)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export { TOTP_TIME_STEP, TOTP_CODE_LENGTH };
