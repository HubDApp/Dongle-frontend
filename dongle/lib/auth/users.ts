/**
 * In-memory application user store (OAuth identities).
 *
 * Production must persist this in a database. We never merge accounts
 * solely because emails match.
 */

import type { AppUser, OAuthProvider } from "./session";

const users = new Map<string, AppUser>();

export function oauthUserId(provider: OAuthProvider, providerId: string): string {
  return `oauth:${provider}:${providerId}`;
}

export function upsertOAuthUser(input: {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}): AppUser {
  const id = oauthUserId(input.provider, input.providerId);
  const existing = users.get(id);
  if (existing) {
    const next: AppUser = {
      ...existing,
      email: input.email ?? existing.email,
      name: input.name ?? existing.name,
      avatarUrl: input.avatarUrl ?? existing.avatarUrl,
    };
    users.set(id, next);
    return next;
  }

  const created: AppUser = {
    id,
    provider: input.provider,
    providerId: input.providerId,
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl,
    createdAt: new Date().toISOString(),
  };
  users.set(id, created);
  return created;
}

export function getUser(id: string): AppUser | undefined {
  return users.get(id);
}

export function linkWallet(userId: string, walletAddress: string): AppUser | null {
  const user = users.get(userId);
  if (!user) return null;
  if (user.walletAddress && user.walletAddress !== walletAddress) {
    return user;
  }
  const next = { ...user, walletAddress };
  users.set(userId, next);
  return next;
}

export function resetUsersForTests(): void {
  users.clear();
}
