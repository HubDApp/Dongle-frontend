/**
 * OAuth + application session (server).
 *
 * Parallel to Freighter: OAuth creates a read-only application user.
 * On-chain writes still require a wallet signature. Secrets stay server-side.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type OAuthProvider = "google" | "github";
export type AuthMethod = "oauth" | "wallet";

export interface AppUser {
  id: string;
  provider: OAuthProvider | "wallet";
  providerId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  walletAddress?: string;
  createdAt: string;
}

export interface SessionPayload {
  sub: string;
  provider: AppUser["provider"];
  email?: string;
  name?: string;
  avatarUrl?: string;
  walletAddress?: string;
}

const SESSION_COOKIE = "dongle_oauth_session";
const STATE_COOKIE = "dongle_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const STATE_MAX_AGE = 60 * 10;

function sessionSecret(): Uint8Array {
  const raw =
    process.env.AUTH_SESSION_SECRET ??
    process.env.ADMIN_JWT_SECRET ??
    "dongle-oauth-dev-secret-change-me";
  return new TextEncoder().encode(raw);
}

let cryptoKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (!cryptoKey) {
    cryptoKey = await crypto.subtle.importKey(
      "raw",
      sessionSecret(),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return cryptoKey;
}

export async function createSessionToken(user: AppUser): Promise<string> {
  const key = await getKey();
  return new SignJWT({
    provider: user.provider,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    walletAddress: user.walletAddress,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const key = await getKey();
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      provider: payload.provider as AppUser["provider"],
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : undefined,
      walletAddress:
        typeof payload.walletAddress === "string" ? payload.walletAddress : undefined,
    };
  } catch {
    return null;
  }
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSessionCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = await readSessionCookie();
  if (!token) return null;
  return verifySessionToken(token);
}

export interface OAuthState {
  provider: OAuthProvider;
  nonce: string;
  returnTo: string;
}

export async function setOAuthStateCookie(state: OAuthState): Promise<string> {
  const encoded = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  const jar = await cookies();
  jar.set(STATE_COOKIE, encoded, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: STATE_MAX_AGE,
  });
  return encoded;
}

export async function consumeOAuthStateCookie(expected: string): Promise<OAuthState | null> {
  const jar = await cookies();
  const stored = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  if (!stored || stored !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(stored, "base64url").toString("utf8")) as OAuthState;
    if (parsed.provider !== "google" && parsed.provider !== "github") return null;
    if (typeof parsed.nonce !== "string" || typeof parsed.returnTo !== "string") return null;
    if (!parsed.returnTo.startsWith("/")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function appBaseUrl(): string {
  return (
    process.env.AUTH_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  return `${appBaseUrl()}/api/auth/oauth/${provider}/callback`;
}

export { SESSION_COOKIE, STATE_COOKIE, SESSION_MAX_AGE };
