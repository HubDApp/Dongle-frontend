import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  consumeOAuthStateCookie,
  createSessionToken,
  verifySessionToken,
  type AppUser,
} from "@/lib/auth/session";
import { resetUsersForTests, upsertOAuthUser, linkWallet, getUser } from "@/lib/auth/users";
import { isWalletRequiredAction, mapOAuthCallbackError } from "@/lib/auth/oauth";

const cookiesStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookiesStore.has(name) ? { value: cookiesStore.get(name) } : undefined,
    set: (name: string, value: string) => {
      cookiesStore.set(name, value);
    },
    delete: (name: string) => {
      cookiesStore.delete(name);
    },
  }),
}));

describe("oauth session", () => {
  beforeEach(() => {
    cookiesStore.clear();
    resetUsersForTests();
    process.env.AUTH_SESSION_SECRET = "test-oauth-secret-key-for-unit-tests";
  });

  afterEach(() => {
    delete process.env.AUTH_SESSION_SECRET;
  });

  it("creates and restores a session token", async () => {
    const user: AppUser = {
      id: "oauth:google:1",
      provider: "google",
      providerId: "1",
      email: "a@example.com",
      name: "Ada",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const token = await createSessionToken(user);
    const payload = await verifySessionToken(token);
    expect(payload?.sub).toBe(user.id);
    expect(payload?.email).toBe("a@example.com");
  });

  it("rejects invalid session tokens", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });

  it("rejects invalid OAuth state", async () => {
    const { setOAuthStateCookie } = await import("@/lib/auth/session");
    const state = await setOAuthStateCookie({
      provider: "google",
      nonce: "abc",
      returnTo: "/discover",
    });
    expect(await consumeOAuthStateCookie("tampered")).toBeNull();
    expect(await consumeOAuthStateCookie(state)).toMatchObject({ provider: "google" });
    expect(await consumeOAuthStateCookie(state)).toBeNull();
  });

  it("upserts provider identities without merging by email", () => {
    const google = upsertOAuthUser({
      provider: "google",
      providerId: "g1",
      email: "same@example.com",
      name: "G",
    });
    const github = upsertOAuthUser({
      provider: "github",
      providerId: "h1",
      email: "same@example.com",
      name: "H",
    });
    expect(google.id).not.toBe(github.id);
    expect(getUser(google.id)?.email).toBe("same@example.com");
  });

  it("maps denied authorization distinctly from provider errors", () => {
    expect(mapOAuthCallbackError("access_denied")).toBe("denied");
    expect(mapOAuthCallbackError("user_denied")).toBe("denied");
    expect(mapOAuthCallbackError("server_error")).toBe("provider");
    expect(mapOAuthCallbackError(null)).toBeNull();
  });

  it("links a wallet without treating OAuth as a stellar account", () => {
    const user = upsertOAuthUser({ provider: "google", providerId: "g2", name: "G" });
    expect(user.walletAddress).toBeUndefined();
    const linked = linkWallet(
      user.id,
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    expect(linked?.walletAddress).toMatch(/^G/);
    expect(isWalletRequiredAction("publish_review")).toBe(true);
    expect(isWalletRequiredAction("browse")).toBe(false);
  });
});
