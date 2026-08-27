/**
 * Server-side admin authentication utilities.
 *
 * ⚠️  This file must ONLY be imported from server-side code
 * (API routes, middleware, server actions). It must never be
 * imported into client components — the ADMIN_ALLOWLIST secret
 * would leak into the client bundle.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

// ─── Environment ──────────────────────────────────────────────────────────────

const RAW_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? "dongle-admin-dev-secret-change-me",
);

// Lazy-initialised CryptoKey (required by jose for HS256 in all runtimes).
let _cryptoKey: CryptoKey | null = null;
async function getSecretKey(): Promise<CryptoKey> {
  if (!_cryptoKey) {
    _cryptoKey = await crypto.subtle.importKey(
      "raw",
      RAW_SECRET,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return _cryptoKey;
}

const ADMIN_ALLOWLIST: ReadonlySet<string> = new Set(
  (process.env.ADMIN_ALLOWLIST ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
);

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes
const REFRESH_MARGIN_SECONDS = 2 * 60; // refresh if <2 min left
const COOKIE_NAME = "dongle_admin_token";
const NONCE_STORE_MAX_SIZE = 500;

// ─── Nonce Store (in-memory, prevents replay) ────────────────────────────────

const usedNonces = new Map<string, number>(); // jti → expiry timestamp

function storeNonce(jti: string, expiresAt: number): void {
  if (usedNonces.size >= NONCE_STORE_MAX_SIZE) {
    // Evict expired entries
    const now = Date.now();
    for (const [key, expiry] of usedNonces) {
      if (expiry < now) usedNonces.delete(key);
    }
    // If still over limit, remove oldest entries
    if (usedNonces.size >= NONCE_STORE_MAX_SIZE) {
      const entries = [...usedNonces.entries()].sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < Math.floor(NONCE_STORE_MAX_SIZE / 2); i++) {
        usedNonces.delete(entries[i][0]);
      }
    }
  }
  usedNonces.set(jti, expiresAt);
}

function isNonceUsed(jti: string): boolean {
  const expiry = usedNonces.get(jti);
  if (expiry === undefined) return false;
  if (expiry < Date.now()) {
    usedNonces.delete(jti);
    return false;
  }
  return true;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface AdminJWTPayload extends JWTPayload {
  /** Stellar public key of the admin. */
  publicKey: string;
  /** Unique nonce to prevent replay attacks. */
  nonce: string;
}

// ─── Core Functions ───────────────────────────────────────────────────────────

export function isAdminAllowed(publicKey: string): boolean {
  return ADMIN_ALLOWLIST.has(publicKey);
}

export async function createAdminToken(publicKey: string): Promise<string> {
  const nonce = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ publicKey, nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(`${TOKEN_MAX_AGE_SECONDS}s`)
    .setJti(nonce)
    .sign(await getSecretKey());

  // Store nonce for replay protection
  storeNonce(nonce, now + TOKEN_MAX_AGE_SECONDS);

  return token;
}

export async function verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await getSecretKey());
    const adminPayload = payload as AdminJWTPayload;

    // Verify nonce hasn't been reused
    if (adminPayload.nonce && isNonceUsed(adminPayload.nonce as string)) {
      return null;
    }

    return adminPayload;
  } catch {
    return null;
  }
}

export async function refreshAdminToken(token: string): Promise<string | null> {
  const payload = await verifyAdminToken(token);
  if (!payload || !payload.publicKey) return null;

  // Mark old nonce as used (consumed by refresh)
  if (payload.nonce) {
    usedNonces.set(payload.nonce as string, Date.now());
  }

  // Issue a new token
  return createAdminToken(payload.publicKey as string);
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

export async function setAdminTokenCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

export async function getAdminTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function clearAdminTokenCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export { TOKEN_MAX_AGE_SECONDS, REFRESH_MARGIN_SECONDS, COOKIE_NAME };
