/**
 * Shared guard for admin-only API routes (Issue #728).
 */

import {
  getAdminTokenFromCookie,
  verifyAdminToken,
  isAdminAllowed,
  type AdminJWTPayload,
} from "@/lib/admin-auth";

/**
 * Resolve the authenticated admin from the session cookie, or null.
 * Re-checks the allowlist so revoked admins lose access immediately.
 */
export async function getAuthenticatedAdmin(): Promise<AdminJWTPayload | null> {
  const token = await getAdminTokenFromCookie();
  if (!token) return null;
  const payload = await verifyAdminToken(token);
  if (!payload || !payload.publicKey) return null;
  if (!isAdminAllowed(payload.publicKey)) return null;
  return payload;
}
