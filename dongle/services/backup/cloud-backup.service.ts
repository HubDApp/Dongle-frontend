/**
 * Cloud Backup Service — optional, client-side encrypted cross-device backups.
 *
 * Data lives only in the browser today. This service adds an OPT-IN cloud
 * snapshot so the same data can be restored on another device, while keeping
 * the privacy guarantee that the server can never read it:
 *
 *   1. The client gathers a snapshot (reviews, drafts, bookmarks, settings).
 *   2. The snapshot is encrypted with AES using a key derived from the user's
 *      Stellar public key (`lib/crypto-storage.ts`, `ENC_V1:` payload).
 *   3. Only the opaque ciphertext is uploaded to `POST /api/backup/upload`.
 *      Consequently a user's reviews, drafts and bookmarks are not visible to
 *      admins.
 *   4. Restoring pulls `GET /api/backup/download` and decrypts locally.
 *
 * Everything here is client-only and safe to import from client components.
 */

import { decryptData, encryptData } from "@/lib/crypto-storage";
import { getStoredItem, removeStoredItem, setStoredItem } from "@/lib/indexed-storage";
import { REVIEW_DRAFT_STORAGE_KEY } from "@/hooks/useReviewDraft";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Schema version stamped into every payload (bump on breaking changes). */
export const BACKUP_SCHEMA_VERSION = 1;

/** localStorage key holding this device's opt-in flag + sync bookkeeping. */
export const BACKUP_PREFS_KEY = "dongle_cloud_backup_settings";

/** localStorage key holding a stable per-device identifier. */
export const DEVICE_ID_KEY = "dongle_cloud_backup_device_id";

const REVIEWS_KEY = "dongle_reviews";
const REVIEW_OWNER_RESPONSES_KEY = "dongle_review_owner_responses";
const PROJECT_DRAFTS_KEY = "dongle_project_drafts";
const LOCALE_KEY = "dongle_locale";
const THEME_KEY = "theme";
const THEME_HIGH_CONTRAST_KEY = "theme-high-contrast";

const WATCHLIST_PREFIX = "dongle_watchlist:";
const WATCHLIST_MUTED_PREFIX = "dongle_watchlist_muted:";
const SAVED_PROJECTS_PREFIX = "dongle_saved_projects:";

/** Cross-tab events re-emitted after a restore so open views refresh. */
const WATCHLIST_EVENT = "dongle:watchlist-changed";
const SAVED_PROJECTS_EVENT = "dongle:saved-projects-changed";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The four logical groups shown in the conflict resolution UI. */
export type BackupSectionKey = "reviews" | "drafts" | "bookmarks" | "settings";

export const BACKUP_SECTIONS: ReadonlyArray<{ key: BackupSectionKey; label: string }> = [
  { key: "reviews", label: "Reviews" },
  { key: "drafts", label: "Drafts" },
  { key: "bookmarks", label: "Bookmarks" },
  { key: "settings", label: "Settings" },
];

/** The backed-up data itself. Raw localStorage strings are stored verbatim. */
export interface BackupData {
  /** Raw `dongle_reviews` value (plain JSON string). */
  reviews: string | null;
  /** Raw `dongle_review_owner_responses` value. */
  reviewOwnerResponses: string | null;
  /** Raw `dongle_project_drafts` value (already `ENC_V1:` encrypted). */
  projectDrafts: string | null;
  /** Parsed `dongle_review_drafts` value from IndexedDB/localStorage. */
  reviewDrafts: unknown | null;
  bookmarks: {
    watchlist: string[];
    muted: string[];
    saved: string[];
  };
  settings: {
    locale: string | null;
    theme: string | null;
    highContrast: string | null;
  };
}

/** The encrypted-at-rest unit that is uploaded to / downloaded from the API. */
export interface BackupPayload {
  schemaVersion: number;
  /** When the snapshot was captured on this device (ISO timestamp). */
  capturedAt: string;
  /** Identifier of the device that produced the snapshot. */
  deviceId: string;
  data: BackupData;
}

/** Device-local opt-in + sync bookkeeping (never uploaded). */
export interface CloudBackupPrefs {
  enabled: boolean;
  /** Last successful upload (ISO timestamp). */
  lastBackupAt: string | null;
  /** Last successful push/pull (ISO timestamp). */
  lastSyncedAt: string | null;
  /** Fingerprint of the data as of the last successful sync. */
  lastSyncedFingerprint: string | null;
}

export interface UploadResult {
  ok: boolean;
  error?: string;
  updatedAt?: string;
}

export interface DownloadResult {
  ok: boolean;
  status: number;
  payload?: BackupPayload;
  error?: string;
}

// ---------------------------------------------------------------------------
// Small local-storage helpers
// ---------------------------------------------------------------------------

function readLocalRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalRaw(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Storage is optional */
  }
}

function readLocalArray(key: string): string[] {
  const raw = readLocalRaw(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function writeLocalArray(key: string, ids: string[]): void {
  writeLocalRaw(key, JSON.stringify(ids ?? []));
}

function safeJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Count items in a value that may be encrypted (`ENC_V1:`) or plain JSON. */
function countEncryptedOrPlain(raw: string | null, wallet: string): number {
  if (!raw) return 0;
  const decrypted = decryptData<unknown>(raw, wallet, { showConsoleWarning: false });
  if (Array.isArray(decrypted)) return decrypted.length;
  return safeJsonArray(raw).length;
}

// ---------------------------------------------------------------------------
// Fingerprinting (stable hash so identical data matches across devices)
// ---------------------------------------------------------------------------

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/** Deterministic 32-bit hash (djb2) rendered as hex. */
export function fingerprint(value: unknown): string {
  const str = stableStringify(value);
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

/** Fingerprint the backup content only (ignores capturedAt / deviceId). */
export function payloadFingerprint(payload: BackupPayload): string {
  return fingerprint(payload.data);
}

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------

/** Return a stable per-device id, creating one on first use. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = `dev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

const DEFAULT_PREFS: CloudBackupPrefs = {
  enabled: false,
  lastBackupAt: null,
  lastSyncedAt: null,
  lastSyncedFingerprint: null,
};

/** Read this device's opt-in/sync bookkeeping with defaults applied. */
export function readPrefs(): CloudBackupPrefs {
  const raw = readLocalRaw(BACKUP_PREFS_KEY);
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<CloudBackupPrefs>;
    return {
      enabled: parsed.enabled === true,
      lastBackupAt: typeof parsed.lastBackupAt === "string" ? parsed.lastBackupAt : null,
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
      lastSyncedFingerprint:
        typeof parsed.lastSyncedFingerprint === "string" ? parsed.lastSyncedFingerprint : null,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Persist this device's opt-in/sync bookkeeping. */
export function writePrefs(prefs: CloudBackupPrefs): void {
  writeLocalRaw(BACKUP_PREFS_KEY, JSON.stringify(prefs));
}

// ---------------------------------------------------------------------------
// Collect / restore
// ---------------------------------------------------------------------------

/** Gather a snapshot of everything the backup covers. */
export async function collectBackupData(wallet: string): Promise<BackupData> {
  const reviewDrafts = await getStoredItem<unknown>(REVIEW_DRAFT_STORAGE_KEY);

  return {
    reviews: readLocalRaw(REVIEWS_KEY),
    reviewOwnerResponses: readLocalRaw(REVIEW_OWNER_RESPONSES_KEY),
    projectDrafts: readLocalRaw(PROJECT_DRAFTS_KEY),
    reviewDrafts: reviewDrafts ?? null,
    bookmarks: {
      watchlist: readLocalArray(`${WATCHLIST_PREFIX}${wallet}`),
      muted: readLocalArray(`${WATCHLIST_MUTED_PREFIX}${wallet}`),
      saved: readLocalArray(`${SAVED_PROJECTS_PREFIX}${wallet}`),
    },
    settings: {
      locale: readLocalRaw(LOCALE_KEY),
      theme: readLocalRaw(THEME_KEY),
      highContrast: readLocalRaw(THEME_HIGH_CONTRAST_KEY),
    },
  };
}

/** Build a full payload for upload (adds device + capture metadata). */
export async function captureBackupPayload(wallet: string): Promise<BackupPayload> {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    deviceId: getOrCreateDeviceId(),
    data: await collectBackupData(wallet),
  };
}

/**
 * Write a snapshot back into local storage (used by restore / conflict merge).
 * The snapshot is authoritative: a `null` entry clears the matching local key.
 */
export async function applyBackupData(wallet: string, data: BackupData): Promise<void> {
  if (typeof window === "undefined") return;

  writeLocalRaw(REVIEWS_KEY, data.reviews);
  writeLocalRaw(REVIEW_OWNER_RESPONSES_KEY, data.reviewOwnerResponses);
  writeLocalRaw(PROJECT_DRAFTS_KEY, data.projectDrafts);

  if (data.reviewDrafts === null || data.reviewDrafts === undefined) {
    await removeStoredItem(REVIEW_DRAFT_STORAGE_KEY);
  } else {
    await setStoredItem(REVIEW_DRAFT_STORAGE_KEY, data.reviewDrafts);
  }

  writeLocalArray(`${WATCHLIST_PREFIX}${wallet}`, data.bookmarks?.watchlist ?? []);
  writeLocalArray(`${WATCHLIST_MUTED_PREFIX}${wallet}`, data.bookmarks?.muted ?? []);
  writeLocalArray(`${SAVED_PROJECTS_PREFIX}${wallet}`, data.bookmarks?.saved ?? []);

  writeLocalRaw(LOCALE_KEY, data.settings?.locale ?? null);
  writeLocalRaw(THEME_KEY, data.settings?.theme ?? null);
  writeLocalRaw(THEME_HIGH_CONTRAST_KEY, data.settings?.highContrast ?? null);

  // Let open views (watchlist, saved projects) refresh without a reload.
  try {
    window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT, { detail: { walletAddress: wallet } }));
    window.dispatchEvent(
      new CustomEvent(SAVED_PROJECTS_EVENT, { detail: { walletAddress: wallet } }),
    );
  } catch {
    /* CustomEvent unsupported — ignore */
  }
}

// ---------------------------------------------------------------------------
// Section helpers (conflict resolution)
// ---------------------------------------------------------------------------

function sectionValue(data: BackupData, key: BackupSectionKey): unknown {
  switch (key) {
    case "reviews":
      return { reviews: data.reviews, ownerResponses: data.reviewOwnerResponses };
    case "drafts":
      return { projectDrafts: data.projectDrafts, reviewDrafts: data.reviewDrafts };
    case "bookmarks":
      return data.bookmarks;
    case "settings":
      return data.settings;
  }
}

/** Fingerprint for a single section — used to detect real divergence. */
export function sectionFingerprint(data: BackupData, key: BackupSectionKey): string {
  return fingerprint(sectionValue(data, key));
}

/** Human-readable one-line summary of a section for the conflict UI. */
export function describeSection(data: BackupData, key: BackupSectionKey, wallet: string): string {
  switch (key) {
    case "reviews": {
      const count =
        safeJsonArray(data.reviews).length + safeJsonArray(data.reviewOwnerResponses).length;
      return `${count} review${count === 1 ? "" : "s"}`;
    }
    case "drafts": {
      const projects = countEncryptedOrPlain(data.projectDrafts, wallet);
      const reviews =
        data.reviewDrafts && typeof data.reviewDrafts === "object"
          ? Object.keys(data.reviewDrafts as Record<string, unknown>).length
          : 0;
      return `${projects} project draft${projects === 1 ? "" : "s"}, ${reviews} review draft${
        reviews === 1 ? "" : "s"
      }`;
    }
    case "bookmarks": {
      const count =
        (data.bookmarks?.watchlist?.length ?? 0) + (data.bookmarks?.saved?.length ?? 0);
      return `${count} bookmark${count === 1 ? "" : "s"}`;
    }
    case "settings": {
      const count = Object.values(data.settings ?? {}).filter(
        (v) => v !== null && v !== undefined && v !== "",
      ).length;
      return `${count} setting${count === 1 ? "" : "s"} saved`;
    }
  }
}

/** True when the snapshot holds anything worth protecting/restoring. */
export function hasBackupContent(data: BackupData): boolean {
  if (safeJsonArray(data.reviews).length > 0) return true;
  if (safeJsonArray(data.reviewOwnerResponses).length > 0) return true;
  if (data.projectDrafts) return true;
  if (
    data.reviewDrafts &&
    typeof data.reviewDrafts === "object" &&
    Object.keys(data.reviewDrafts as Record<string, unknown>).length > 0
  ) {
    return true;
  }
  if ((data.bookmarks?.watchlist?.length ?? 0) > 0) return true;
  if ((data.bookmarks?.saved?.length ?? 0) > 0) return true;
  return Object.values(data.settings ?? {}).some((v) => v !== null && v !== undefined && v !== "");
}

/** Merge two snapshots section-by-section according to the user's choices. */
export function mergeBackupData(
  local: BackupData,
  remote: BackupData,
  choices: Record<BackupSectionKey, "local" | "remote">,
): BackupData {
  const pick = <T>(key: BackupSectionKey, localValue: T, remoteValue: T): T =>
    choices[key] === "remote" ? remoteValue : localValue;

  return {
    reviews: pick("reviews", local.reviews, remote.reviews),
    reviewOwnerResponses: pick(
      "reviews",
      local.reviewOwnerResponses,
      remote.reviewOwnerResponses,
    ),
    projectDrafts: pick("drafts", local.projectDrafts, remote.projectDrafts),
    reviewDrafts: pick("drafts", local.reviewDrafts, remote.reviewDrafts),
    bookmarks: pick("bookmarks", local.bookmarks, remote.bookmarks),
    settings: pick("settings", local.settings, remote.settings),
  };
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

/** Encrypt the payload on the client and upload it to the cloud. */
export async function uploadBackup(wallet: string, payload: BackupPayload): Promise<UploadResult> {
  let ciphertext: string;
  try {
    ciphertext = encryptData(payload, wallet);
  } catch {
    return { ok: false, error: "Could not encrypt your data." };
  }

  try {
    const response = await fetch("/api/backup/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: wallet,
        ciphertext,
        version: payload.schemaVersion,
        deviceId: payload.deviceId,
        createdAt: payload.capturedAt,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      updatedAt?: string;
      error?: string;
    };

    if (!response.ok) {
      return { ok: false, error: body.error ?? "Backup upload failed." };
    }
    return { ok: true, updatedAt: body.updatedAt };
  } catch {
    return { ok: false, error: "Network error while uploading the backup." };
  }
}

/** Download the cloud backup and decrypt it locally. */
export async function downloadBackup(wallet: string): Promise<DownloadResult> {
  try {
    const response = await fetch(
      `/api/backup/download?walletAddress=${encodeURIComponent(wallet)}`,
      { cache: "no-store" },
    );

    if (response.status === 404) {
      return { ok: false, status: 404, error: "No cloud backup found." };
    }

    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      backup?: { ciphertext?: string; updatedAt?: string };
    };

    if (!response.ok) {
      return { ok: false, status: response.status, error: body.error ?? "Download failed." };
    }

    const ciphertext = body.backup?.ciphertext;
    if (!ciphertext) {
      return { ok: false, status: response.status, error: "Backup is empty." };
    }

    const payload = decryptData<BackupPayload>(ciphertext, wallet, {
      showConsoleWarning: false,
    });
    if (!payload) {
      return {
        ok: false,
        status: response.status,
        error: "Could not decrypt the cloud backup on this device.",
      };
    }

    return { ok: true, status: response.status, payload };
  } catch {
    return { ok: false, status: 0, error: "Network error while downloading the backup." };
  }
}
