/**
 * Audit Log Service
 *
 * Appends an immutable record for every admin mutation and provides read-only
 * accessors for the admin dashboard.  All data is persisted to localStorage
 * (same pattern as review-report.service.ts and draft.service.ts).
 *
 * Rules enforced here:
 * - append() is the only write path; no update/delete methods are exposed.
 * - list() / getById() are read-only.
 * - Corrupt or partial records are skipped during hydration (never throw).
 */

import {
  AuditLogEntry,
  AuditAction,
  AppendAuditLogParams,
  AuditLogFilter,
} from "@/types/audit-log";
import { generateId } from "@/lib/id-generator";

export const AUDIT_LOG_STORAGE_KEY = "dongle_audit_log";

const VALID_ACTIONS: ReadonlySet<AuditAction> = new Set<AuditAction>([
  "verification_approved",
  "verification_rejected",
  "fee_updated",
  "report_resolved",
  "report_dismissed",
]);

/** Hydrate, validate, and return all stored entries (SSR-safe). */
function loadEntries(): AuditLogEntry[] {
  if (typeof window === "undefined") return [];

  let raw: string | null;
  try {
    raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const valid: AuditLogEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    if (typeof r.id !== "string" || !r.id) continue;
    if (typeof r.actor !== "string" || !r.actor) continue;
    if (typeof r.action !== "string" || !VALID_ACTIONS.has(r.action as AuditAction)) continue;
    if (typeof r.targetId !== "string" || !r.targetId) continue;
    if (typeof r.targetLabel !== "string") continue;
    if (typeof r.timestamp !== "string" || !r.timestamp) continue;

    const entry: AuditLogEntry = {
      id: r.id,
      actor: r.actor,
      action: r.action as AuditAction,
      targetId: r.targetId,
      targetLabel: r.targetLabel,
      timestamp: r.timestamp,
    };

    if (typeof r.reason === "string" && r.reason) {
      entry.reason = r.reason;
    }

    if (r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)) {
      entry.metadata = r.metadata as Record<string, string | number | boolean>;
    }

    valid.push(entry);
  }

  return valid;
}

/** Persist the full entry list. */
function saveEntries(entries: AuditLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage quota exceeded or private browsing — fail silently
  }
}

export const auditLogService = {
  // ── Write ────────────────────────────────────────────────────────────────

  /**
   * Append a new audit log entry.
   * This is the ONLY write path; entries are never modified or deleted.
   * Returns the created entry.
   */
  append(params: AppendAuditLogParams): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: generateId(),
      actor: params.actor,
      action: params.action,
      targetId: params.targetId,
      targetLabel: params.targetLabel,
      timestamp: new Date().toISOString(),
    };

    if (params.reason?.trim()) {
      entry.reason = params.reason.trim();
    }

    if (params.metadata && Object.keys(params.metadata).length > 0) {
      entry.metadata = { ...params.metadata };
    }

    const entries = loadEntries();
    saveEntries([...entries, entry]);
    return entry;
  },

  // ── Read ─────────────────────────────────────────────────────────────────

  /**
   * Return all entries, newest-first, optionally filtered.
   */
  list(filter?: AuditLogFilter): AuditLogEntry[] {
    let entries = loadEntries();

    if (filter?.actor) {
      entries = entries.filter((e) => e.actor === filter.actor);
    }
    if (filter?.action) {
      entries = entries.filter((e) => e.action === filter.action);
    }
    if (filter?.since) {
      const since = new Date(filter.since).getTime();
      entries = entries.filter((e) => new Date(e.timestamp).getTime() >= since);
    }
    if (filter?.until) {
      const until = new Date(filter.until).getTime();
      entries = entries.filter((e) => new Date(e.timestamp).getTime() <= until);
    }

    // Newest first
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  },

  /** Return a single entry by ID, or null if not found. */
  getById(id: string): AuditLogEntry | null {
    return loadEntries().find((e) => e.id === id) ?? null;
  },

  /** Total count of stored entries (unfiltered). */
  count(): number {
    return loadEntries().length;
  },

  // ── Test helpers ─────────────────────────────────────────────────────────

  /**
   * Wipe all entries from storage.
   * Only intended for use in test environments.
   */
  _clearForTesting(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  },
};
