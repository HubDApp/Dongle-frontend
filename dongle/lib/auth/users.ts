/**
 * In-memory application user store (OAuth identities).
 *
 * Production must persist this in a database. We never merge accounts
 * solely because emails match.
 */

import type { AppUser, OAuthProvider } from "./session";

const users = new Map<string, AppUser>();
/** Provider access tokens, server-side only (never sent to the client). */
const providerTokens = new Map<string, string>();

export interface AuthAuditEntry {
  userId: string;
  action: "wallet_link" | "wallet_unlink" | "profile_sync";
  detail?: string;
  at: string;
}
const auditLog: AuthAuditEntry[] = [];

export function recordAuthAudit(entry: Omit<AuthAuditEntry, "at">): void {
  const full = { ...entry, at: new Date().toISOString() };
  auditLog.push(full);
  console.info("[auth-audit]", JSON.stringify(full));
}

export function getAuthAuditLog(userId?: string): AuthAuditEntry[] {
  return userId ? auditLog.filter((e) => e.userId === userId) : [...auditLog];
}

export function setProviderToken(userId: string, token: string): void {
  providerTokens.set(userId, token);
}

export function getProviderToken(userId: string): string | undefined {
  return providerTokens.get(userId);
}

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
      lastSyncedAt: new Date().toISOString(),
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
    lastSyncedAt: new Date().toISOString(),
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

export function unlinkWallet(userId: string): AppUser | null {
  const user = users.get(userId);
  if (!user) return null;
  const { walletAddress: _removed, ...rest } = user;
  const next: AppUser = rest;
  users.set(userId, next);
  return next;
}

export function resetUsersForTests(): void {
  users.clear();
  providerTokens.clear();
  auditLog.length = 0;
}
