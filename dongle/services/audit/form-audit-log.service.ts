/**
 * Form Audit Log Service
 *
 * Append-only record of user form interactions (field changes, submit
 * attempts) for audit purposes. This is a sibling of `audit-log.service.ts`
 * (which records admin mutations) and follows the same conventions:
 *
 * - `record()` is the only write path; entries are never updated or deleted.
 * - `list()` / `search()` are read-only and provide the "searchable logs" API.
 * - Corrupt or partial records are skipped during hydration (never throw).
 * - Retention: entries older than 1 year can be pruned via `pruneOldEntries()`.
 *
 * The client IP is stamped server-side (`GET /api/audit/client-ip`) because a
 * browser cannot read its own public address; see `lib/request-ip.ts`.
 */

import { generateId } from "@/lib/id-generator";
import {
  AppendFormAuditLogParams,
  FormAuditAction,
  FormAuditIpSource,
  FormAuditLogEntry,
  FormAuditLogFilter,
} from "@/types/form-audit-log";

export const FORM_AUDIT_LOG_STORAGE_KEY = "dongle_form_audit_log";

/** Retention period: 1 year, matching audit-log.service.ts. */
export const FORM_AUDIT_LOG_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

/** Field/previous values longer than this are truncated before persistence. */
export const MAX_FORM_AUDIT_VALUE_LENGTH = 500;

const VALID_ACTIONS: ReadonlySet<FormAuditAction> = new Set<FormAuditAction>([
  "field_change",
  "form_submit",
  "form_submit_failed",
  "form_reset",
]);

const VALID_IP_SOURCES: ReadonlySet<FormAuditIpSource> = new Set<FormAuditIpSource>([
  "server",
  "unavailable",
]);

function capValue(value: string): string {
  return value.length > MAX_FORM_AUDIT_VALUE_LENGTH
    ? value.slice(0, MAX_FORM_AUDIT_VALUE_LENGTH)
    : value;
}

/** Hydrate, validate, and return all stored entries (SSR-safe). */
function loadEntries(): FormAuditLogEntry[] {
  if (typeof window === "undefined") return [];

  let raw: string | null;
  try {
    raw = localStorage.getItem(FORM_AUDIT_LOG_STORAGE_KEY);
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

  const valid: FormAuditLogEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    if (typeof r.id !== "string" || !r.id) continue;
    if (typeof r.formId !== "string" || !r.formId) continue;
    if (typeof r.formType !== "string" || !r.formType) continue;
    if (typeof r.actor !== "string" || !r.actor) continue;
    if (typeof r.action !== "string" || !VALID_ACTIONS.has(r.action as FormAuditAction)) continue;
    if (typeof r.timestamp !== "string" || !r.timestamp) continue;

    const ipSource: FormAuditIpSource =
      typeof r.ipSource === "string" && VALID_IP_SOURCES.has(r.ipSource as FormAuditIpSource)
        ? (r.ipSource as FormAuditIpSource)
        : "unavailable";

    const entry: FormAuditLogEntry = {
      id: r.id,
      formId: r.formId,
      formType: r.formType,
      actor: r.actor,
      action: r.action as FormAuditAction,
      timestamp: r.timestamp,
      ipAddress: typeof r.ipAddress === "string" && r.ipAddress ? r.ipAddress : null,
      ipHash: typeof r.ipHash === "string" && r.ipHash ? r.ipHash : null,
      ipSource,
    };

    if (typeof r.field === "string" && r.field) {
      entry.field = r.field;
    }
    if (typeof r.previousValue === "string") {
      entry.previousValue = r.previousValue;
    }
    if (typeof r.value === "string") {
      entry.value = r.value;
    }
    if (r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)) {
      entry.metadata = r.metadata as Record<string, string | number | boolean>;
    }

    valid.push(entry);
  }

  return valid;
}

/** Persist the full entry list. */
function saveEntries(entries: FormAuditLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FORM_AUDIT_LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage quota exceeded or private browsing — fail silently
  }
}

/** Case-insensitive free-text match across the searchable entry fields. */
function matchesQuery(entry: FormAuditLogEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    entry.id,
    entry.formId,
    entry.formType,
    entry.actor,
    entry.action,
    entry.field ?? "",
    entry.previousValue ?? "",
    entry.value ?? "",
    entry.ipAddress ?? "",
    entry.ipHash ?? "",
    ...Object.values(entry.metadata ?? {}).map((v) => String(v)),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

/**
 * Redact a Stellar public key or generic identifier: show first 5 and last 5
 * characters only. Values shorter than 11 chars are returned as-is.
 */
function redactIdentifier(value: string): string {
  if (value.length <= 10) return value;
  return `${value.slice(0, 5)}...${value.slice(-5)}`;
}

/** Redact the host portion of an IP: `203.0.x.x` / `2001:db8::x`. */
export function redactIpAddress(ip: string): string {
  if (!ip || ip === "unknown") return ip;
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.length > 2 ? `${parts.slice(0, 2).join(":")}::x` : ip;
  }
  const octets = ip.split(".");
  if (octets.length === 4) return `${octets[0]}.${octets[1]}.x.x`;
  return ip;
}

/**
 * Escape a value for CSV output. Wraps in double-quotes if the value contains a
 * comma, double-quote, or newline.
 */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const formAuditLogService = {
  // ── Write ────────────────────────────────────────────────────────────────

  /**
   * Append a new form audit entry.
   * This is the ONLY write path; entries are never modified or deleted.
   * Returns the created entry.
   */
  record(params: AppendFormAuditLogParams): FormAuditLogEntry {
    const entry: FormAuditLogEntry = {
      id: generateId(),
      formId: params.formId,
      formType: params.formType,
      actor: params.actor,
      action: params.action,
      timestamp: new Date().toISOString(),
      ipAddress: params.ipAddress ?? null,
      ipHash: params.ipHash ?? null,
      ipSource: params.ipSource ?? "unavailable",
    };

    if (params.field?.trim()) {
      entry.field = params.field.trim();
    }
    if (params.previousValue !== undefined) {
      entry.previousValue = capValue(params.previousValue);
    }
    if (params.value !== undefined) {
      entry.value = capValue(params.value);
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
  list(filter?: FormAuditLogFilter): FormAuditLogEntry[] {
    let entries = loadEntries();

    if (filter?.formId) {
      entries = entries.filter((e) => e.formId === filter.formId);
    }
    if (filter?.formType) {
      entries = entries.filter((e) => e.formType === filter.formType);
    }
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
    if (filter?.query) {
      entries = entries.filter((e) => matchesQuery(e, filter.query as string));
    }

    // Newest first
    entries = entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (filter?.limit !== undefined && filter.limit >= 0) {
      entries = entries.slice(0, filter.limit);
    }

    return entries;
  },

  /**
   * Free-text search over the audit log (newest-first).
   * Convenience wrapper around `list({ query })`.
   */
  search(query: string, filter?: Omit<FormAuditLogFilter, "query">): FormAuditLogEntry[] {
    return this.list({ ...filter, query });
  },

  /** Return a single entry by ID, or null if not found. */
  getById(id: string): FormAuditLogEntry | null {
    return loadEntries().find((e) => e.id === id) ?? null;
  },

  /** Total count of stored entries (unfiltered). */
  count(): number {
    return loadEntries().length;
  },

  // ── Compliance / sharing ─────────────────────────────────────────────────

  /**
   * Return entries with the acting identity and IP address partially redacted.
   * Safe for display in dashboards and for sharing outside the audit team.
   */
  redactedList(filter?: FormAuditLogFilter): FormAuditLogEntry[] {
    return this.list(filter).map((entry) => ({
      ...entry,
      actor: redactIdentifier(entry.actor),
      ipAddress: entry.ipAddress ? redactIpAddress(entry.ipAddress) : null,
    }));
  },

  /**
   * Export filtered entries as a CSV string for external audit tools.
   * Columns: id, formId, formType, actor, action, field, previousValue, value,
   * timestamp, ipAddress, ipHash.
   */
  exportCsv(filter?: FormAuditLogFilter): string {
    const entries = this.list(filter);
    const header =
      "id,formId,formType,actor,action,field,previousValue,value,timestamp,ipAddress,ipHash";
    const rows = entries.map((e) =>
      [
        csvEscape(e.id),
        csvEscape(e.formId),
        csvEscape(e.formType),
        csvEscape(e.actor),
        csvEscape(e.action),
        csvEscape(e.field ?? ""),
        csvEscape(e.previousValue ?? ""),
        csvEscape(e.value ?? ""),
        csvEscape(e.timestamp),
        csvEscape(e.ipAddress ?? ""),
        csvEscape(e.ipHash ?? ""),
      ].join(","),
    );
    return [header, ...rows].join("\n");
  },

  /**
   * Remove entries older than the retention period (1 year).
   * Returns the number of entries pruned.
   */
  pruneOldEntries(): number {
    const entries = loadEntries();
    const cutoff = Date.now() - FORM_AUDIT_LOG_RETENTION_MS;
    const kept = entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    const pruned = entries.length - kept.length;
    if (pruned > 0) {
      saveEntries(kept);
    }
    return pruned;
  },

  // ── Test helpers ─────────────────────────────────────────────────────────

  /**
   * Wipe all entries from storage.
   * Only intended for use in test environments.
   */
  _clearForTesting(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(FORM_AUDIT_LOG_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  },
};
