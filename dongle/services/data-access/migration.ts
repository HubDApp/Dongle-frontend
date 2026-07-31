/**
 * @module services/data-access/migration
 *
 * Schema versioning and migration strategy for locally persisted records.
 *
 * Problem (issue #263):
 *   Stored data shapes (reviews, drafts, recent-views) will change as models
 *   mature.  Without a migration layer, stale localStorage records silently
 *   produce wrong behaviour or hard-to-debug runtime errors.
 *
 * Solution:
 *   - Every stored record that may be long-lived carries a `_schemaVersion`
 *     integer field.
 *   - `migrateRecord()` detects old shapes and upgrades them to the current
 *     version, returning both the upgraded record and any fields that could
 *     not be recovered.
 *   - `unsupported` data (version > current, or corrupt) is reported cleanly
 *     so callers can show a recovery UI instead of crashing.
 *
 * Adding a new migration:
 *   1. Increment CURRENT_SCHEMA_VERSION.
 *   2. Add a case to the switch inside `migrateRecord()`.
 *   3. Add the corresponding test in __tests__/services/migration.test.ts.
 */

/** The current schema version that all newly created records must carry. */
export const CURRENT_SCHEMA_VERSION = 1;

/** A record that participates in schema versioning. */
export interface VersionedRecord {
  /** Schema version written when the record was created / last migrated. */
  _schemaVersion: number;
  [key: string]: unknown;
}

/** Result returned by migrateRecord(). */
export interface MigrationResult<T extends VersionedRecord> {
  /** The migrated (or already-current) record. */
  record: T;
  /**
   * True when the record was already at CURRENT_SCHEMA_VERSION and no
   * changes were needed.
   */
  wasUpToDate: boolean;
  /**
   * True when the record had an unknown (future) version or was so corrupt
   * that it could not be safely migrated.  Callers should surface a recovery
   * UI rather than silently using a partially-migrated record.
   */
  unsupported: boolean;
  /**
   * Human-readable description of what happened (useful in dev-mode logging).
   */
  message: string;
}

/**
 * Attach `_schemaVersion: CURRENT_SCHEMA_VERSION` to any plain object.
 * Call this when creating a new record so it is already versioned.
 */
export function stamp<T extends object>(record: T): T & VersionedRecord {
  return { ...record, _schemaVersion: CURRENT_SCHEMA_VERSION };
}

/**
 * Migrate a raw stored record to the current schema.
 *
 * @param raw   The parsed-but-not-yet-validated value from storage.
 * @returns     A MigrationResult describing what happened.
 *
 * The switch block intentionally uses fall-through so that a record at v0
 * will be upgraded through v1, v2, … in sequence.
 */
export function migrateRecord<T extends VersionedRecord>(
  raw: unknown,
): MigrationResult<T> {
  // Guard: must be a non-null object
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      record: { _schemaVersion: CURRENT_SCHEMA_VERSION } as T,
      wasUpToDate: false,
      unsupported: true,
      message: "Record is not an object — cannot migrate.",
    };
  }

  const r = raw as Record<string, unknown>;

  // Records that pre-date versioning have no _schemaVersion field.
  // Treat them as version 0.
  const version =
    typeof r._schemaVersion === "number" ? r._schemaVersion : 0;

  // Future version — written by a newer client; we cannot downgrade safely.
  if (version > CURRENT_SCHEMA_VERSION) {
    return {
      record: { ...r, _schemaVersion: version } as unknown as T,
      wasUpToDate: false,
      unsupported: true,
      message: `Record has schema version ${version} which is newer than current (${CURRENT_SCHEMA_VERSION}).`,
    };
  }

  // Already current
  if (version === CURRENT_SCHEMA_VERSION) {
    return {
      record: r as unknown as T,
      wasUpToDate: true,
      unsupported: false,
      message: `Record is already at schema version ${CURRENT_SCHEMA_VERSION}.`,
    };
  }

  // Apply migrations in sequence (fall-through)
  let migrated: Record<string, unknown> = { ...r };
  let currentVersion = version;

  // eslint-disable-next-line no-constant-condition
  while (currentVersion < CURRENT_SCHEMA_VERSION) {
    switch (currentVersion) {
      case 0: {
        /**
         * v0 → v1
         *
         * Pre-versioning records (reviews, drafts, recent-views) had no
         * _schemaVersion field.  Stamping the field is the only change
         * needed; all existing shape fields are retained as-is.
         */
        migrated = { ...migrated, _schemaVersion: 1 };
        currentVersion = 1;
        break;
      }

      // ── Add future migrations here ────────────────────────────────────
      // case 1: {
      //   // v1 → v2: e.g. rename `comment` → `body`
      //   migrated = { ...migrated, body: migrated.comment, _schemaVersion: 2 };
      //   delete migrated.comment;
      //   currentVersion = 2;
      //   break;
      // }

      default: {
        // Should never happen, but guard against infinite loops
        return {
          record: migrated as unknown as T,
          wasUpToDate: false,
          unsupported: true,
          message: `No migration path found from version ${currentVersion}.`,
        };
      }
    }
  }

  return {
    record: migrated as unknown as T,
    wasUpToDate: false,
    unsupported: false,
    message: `Record migrated from v${version} to v${CURRENT_SCHEMA_VERSION}.`,
  };
}

/**
 * Migrate an entire array of raw stored records, discarding any that are
 * unsupported and optionally logging a warning for each.
 *
 * @param items       Raw parsed array from localStorage.
 * @param warnOnSkip  When true, logs a console warning for each skipped record.
 * @returns           Array of successfully migrated records.
 */
export function migrateRecordArray<T extends VersionedRecord>(
  items: unknown[],
  warnOnSkip = false,
): T[] {
  const results: T[] = [];

  for (const item of items) {
    const result = migrateRecord<T>(item);
    if (result.unsupported) {
      if (warnOnSkip) {
        console.warn(
          `[Dongle migration] Skipping unsupported record: ${result.message}`,
          item,
        );
      }
      continue;
    }
    results.push(result.record);
  }

  return results;
}
