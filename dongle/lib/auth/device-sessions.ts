/**
 * Device session store — tracks active sessions per user with device fingerprinting.
 *
 * - Access tokens: 15 minutes
 * - Refresh tokens: 30 days
 * - Max 5 concurrent sessions per user
 * - IP change detection for suspicious activity
 * - Backed by Redis when available, in-memory fallback for dev
 */

import { redis } from "@/lib/redis";
import { sendEmail } from "@/lib/email/email-service";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes (seconds)
export const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days (seconds)
export const MAX_SESSIONS_PER_USER = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  /** Opaque browser/device fingerprint derived from UA + headers. */
  fingerprint: string;
  /** Human-readable device label (e.g. "Chrome on macOS"). */
  label: string;
  /** Hashed IP at session creation. */
  ipHash: string;
  /** Raw IP — stored server-side only, never sent to client. */
  ipAddress: string;
}

export interface DeviceSession {
  sessionId: string;
  userId: string;
  refreshToken: string;
  device: DeviceInfo;
  createdAt: string;
  lastActiveAt: string;
  /** IP hash at last seen — used to detect suspicious IP changes. */
  lastIpHash: string;
  expiresAt: string;
}

/** Public-safe view (no refreshToken / raw IP). */
export interface SessionView {
  sessionId: string;
  device: Omit<DeviceInfo, "ipAddress">;
  createdAt: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

/** userId → sessionId[] */
const memUserSessions = new Map<string, string[]>();
/** sessionId → DeviceSession */
const memSessions = new Map<string, DeviceSession>();
/** refreshToken → sessionId */
const memRefreshIndex = new Map<string, string>();

// ─── Redis key helpers ────────────────────────────────────────────────────────

const rk = {
  session: (id: string) => `dongle:session:${id}`,
  userSessions: (uid: string) => `dongle:user_sessions:${uid}`,
  refreshIndex: (token: string) => `dongle:refresh:${token}`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildDeviceLabel(ua: string): string {
  const lower = ua.toLowerCase();
  let browser = "Browser";
  let os = "Unknown OS";

  if (lower.includes("edg/") || lower.includes("edge/")) browser = "Edge";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("chrome/")) browser = "Chrome";
  else if (lower.includes("safari/")) browser = "Safari";

  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("iphone")) os = "iPhone";
  else if (lower.includes("ipad")) os = "iPad";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("linux")) os = "Linux";

  return `${browser} on ${os}`;
}

export function fingerprintDevice(ua: string, acceptLang: string): string {
  const raw = `${ua}|${acceptLang}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `fp_${Math.abs(hash >>> 0).toString(16)}`;
}

function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash = hash & hash;
  }
  return `ip_${Math.abs(hash).toString(16).substring(0, 8)}`;
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

async function getSessionById(sessionId: string): Promise<DeviceSession | null> {
  if (redis) {
    const raw = await redis.get<DeviceSession>(rk.session(sessionId));
    return raw ?? null;
  }
  return memSessions.get(sessionId) ?? null;
}

async function getUserSessionIds(userId: string): Promise<string[]> {
  if (redis) {
    const raw = await redis.get<string[]>(rk.userSessions(userId));
    return raw ?? [];
  }
  return memUserSessions.get(userId) ?? [];
}

async function saveSession(session: DeviceSession): Promise<void> {
  const ttl = Math.floor(
    (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
  );
  if (ttl <= 0) return;

  if (redis) {
    await Promise.all([
      redis.set(rk.session(session.sessionId), session, { ex: ttl }),
      redis.set(rk.refreshIndex(session.refreshToken), session.sessionId, { ex: ttl }),
    ]);
    // Update user sessions list
    const ids = await getUserSessionIds(session.userId);
    if (!ids.includes(session.sessionId)) {
      ids.push(session.sessionId);
      await redis.set(rk.userSessions(session.userId), ids, {
        ex: REFRESH_TOKEN_TTL,
      });
    }
  } else {
    memSessions.set(session.sessionId, session);
    memRefreshIndex.set(session.refreshToken, session.sessionId);
    const ids = memUserSessions.get(session.userId) ?? [];
    if (!ids.includes(session.sessionId)) {
      ids.push(session.sessionId);
      memUserSessions.set(session.userId, ids);
    }
  }
}

async function deleteSession(sessionId: string): Promise<void> {
  const session = await getSessionById(sessionId);
  if (!session) return;

  if (redis) {
    await Promise.all([
      redis.del(rk.session(sessionId)),
      redis.del(rk.refreshIndex(session.refreshToken)),
    ]);
    const ids = await getUserSessionIds(session.userId);
    const updated = ids.filter((id) => id !== sessionId);
    if (updated.length > 0) {
      await redis.set(rk.userSessions(session.userId), updated, {
        ex: REFRESH_TOKEN_TTL,
      });
    } else {
      await redis.del(rk.userSessions(session.userId));
    }
  } else {
    memSessions.delete(sessionId);
    memRefreshIndex.delete(session.refreshToken);
    const ids = memUserSessions.get(session.userId) ?? [];
    memUserSessions.set(
      session.userId,
      ids.filter((id) => id !== sessionId),
    );
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CreateSessionOptions {
  userId: string;
  userEmail?: string;
  userName?: string;
  ua: string;
  acceptLang: string;
  ipAddress: string;
}

/**
 * Create a new device session, evicting the oldest if the limit is reached.
 * Returns the new sessionId and refresh token.
 */
export async function createDeviceSession(
  opts: CreateSessionOptions,
): Promise<{ sessionId: string; refreshToken: string; isNewDevice: boolean }> {
  const fingerprint = fingerprintDevice(opts.ua, opts.acceptLang);
  const ipHash = hashIP(opts.ipAddress);

  // Check if this fingerprint already has an active session (same device)
  const existingIds = await getUserSessionIds(opts.userId);
  let isNewDevice = true;

  for (const id of existingIds) {
    const s = await getSessionById(id);
    if (s?.device.fingerprint === fingerprint) {
      isNewDevice = false;
      break;
    }
  }

  // Enforce session limit — evict oldest if at cap
  const liveSessions = await getLiveSessions(opts.userId);
  if (liveSessions.length >= MAX_SESSIONS_PER_USER) {
    const oldest = liveSessions.sort(
      (a, b) => new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime(),
    )[0];
    if (oldest) await deleteSession(oldest.sessionId);
  }

  const sessionId = crypto.randomUUID();
  const refreshToken = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL * 1000);

  const session: DeviceSession = {
    sessionId,
    userId: opts.userId,
    refreshToken,
    device: {
      fingerprint,
      label: buildDeviceLabel(opts.ua),
      ipHash,
      ipAddress: opts.ipAddress,
    },
    createdAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    lastIpHash: ipHash,
    expiresAt: expiresAt.toISOString(),
  };

  await saveSession(session);

  // Fire-and-forget email alert for new devices
  if (isNewDevice && opts.userEmail) {
    void sendNewDeviceEmail(opts.userEmail, opts.userName, session.device.label, opts.ipAddress, now);
  }

  return { sessionId, refreshToken, isNewDevice };
}

/** Get all non-expired sessions for a user. */
export async function getLiveSessions(userId: string): Promise<DeviceSession[]> {
  const ids = await getUserSessionIds(userId);
  const now = Date.now();
  const sessions: DeviceSession[] = [];

  for (const id of ids) {
    const s = await getSessionById(id);
    if (s && new Date(s.expiresAt).getTime() > now) {
      sessions.push(s);
    } else if (s) {
      // Prune expired
      await deleteSession(id);
    }
  }
  return sessions;
}

/**
 * Consume a refresh token and return a new refresh token + sessionId.
 * Returns null if the token is invalid/expired.
 */
export async function rotateRefreshToken(
  refreshToken: string,
  ipAddress: string,
): Promise<{ sessionId: string; refreshToken: string; suspicious: boolean } | null> {
  let sessionId: string | null = null;

  if (redis) {
    sessionId = await redis.get<string>(rk.refreshIndex(refreshToken));
  } else {
    sessionId = memRefreshIndex.get(refreshToken) ?? null;
  }

  if (!sessionId) return null;

  const session = await getSessionById(sessionId);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await deleteSession(sessionId);
    return null;
  }

  const newIpHash = hashIP(ipAddress);
  const suspicious = session.lastIpHash !== newIpHash;

  const newRefreshToken = generateToken();
  const now = new Date();

  const updated: DeviceSession = {
    ...session,
    refreshToken: newRefreshToken,
    lastActiveAt: now.toISOString(),
    lastIpHash: newIpHash,
  };

  // Delete old refresh index, save updated session
  if (redis) {
    await redis.del(rk.refreshIndex(refreshToken));
  } else {
    memRefreshIndex.delete(refreshToken);
  }
  await saveSession(updated);

  return { sessionId: updated.sessionId, refreshToken: newRefreshToken, suspicious };
}

/** Revoke a single session by ID, only if it belongs to the given user. */
export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const session = await getSessionById(sessionId);
  if (!session || (userId && session.userId !== userId)) return false;
  await deleteSession(sessionId);
  return true;
}

/** Revoke all sessions for a user except the current one (optional). */
export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const ids = await getUserSessionIds(userId);
  let count = 0;
  for (const id of ids) {
    if (id === exceptSessionId) continue;
    await deleteSession(id);
    count++;
  }
  return count;
}

/** Public view of sessions for the /settings/sessions page. */
export async function getSessionViews(
  userId: string,
  currentSessionId?: string,
): Promise<SessionView[]> {
  const live = await getLiveSessions(userId);
  return live
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    .map((s) => ({
      sessionId: s.sessionId,
      device: {
        fingerprint: s.device.fingerprint,
        label: s.device.label,
        ipHash: s.device.ipHash,
      },
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.sessionId === currentSessionId,
    }));
}

async function sendNewDeviceEmail(
  email: string,
  name: string | undefined,
  deviceLabel: string,
  ip: string,
  at: Date,
): Promise<void> {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const time = at.toUTCString();
  const maskedIp = ip === "unknown" ? "unknown" : ip.replace(/(\d+\.\d+)\.\d+\.\d+/, "$1.x.x");

  await sendEmail({
    to: email,
    subject: "New device signed in to your Dongle account",
    html: `
      <p>${greeting}</p>
      <p>A new device just signed in to your Dongle account:</p>
      <ul>
        <li><strong>Device:</strong> ${deviceLabel}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>IP:</strong> ${maskedIp}</li>
      </ul>
      <p>If this was you, no action is needed. If you don't recognise this activity,
      please <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/sessions">
      review and revoke active sessions</a> immediately.</p>
    `,
    text: `${greeting}\n\nA new device signed in:\nDevice: ${deviceLabel}\nTime: ${time}\nIP: ${maskedIp}\n\nVisit /settings/sessions to revoke sessions.`,
  });
}

/** Exported for API routes that need to look up a session directly by ID. */
export { getSessionById };
