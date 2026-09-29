/**
 * Form Backup & Recovery Service
 *
 * Manages automatic backups of form data with:
 *   • Configurable backup interval
 *   • Retention policy (max backups, max age)
 *   • Automated archival of old backups for compliance
 *   • Configurable archive policy
 *   • Searchable archived data
 *   • Restore from any backup point (including archived)
 *   • Analytics integration
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormBackup {
  id: string;
  formType: string;
  formId: string;
  data: Record<string, unknown>;
  createdAt: string; // ISO timestamp
  restoredAt?: string; // ISO timestamp when restored
}

export interface ArchivedBackup extends FormBackup {
  archivedAt: string; // ISO timestamp when archived
  archivedBy: string; // reason for archival (e.g. "retention_policy", "manual")
}

export interface FormBackupConfig {
  /** How often to create a backup (in milliseconds). Default 30s. */
  backupIntervalMs: number;
  /** Maximum number of backups to keep per form type + formId combo. Default 10. */
  maxBackups: number;
  /** Maximum age of backups to keep (in milliseconds). Default 7 days. */
  maxBackupAgeMs: number;
}

export interface ArchivePolicy {
  /** Backups older than this are eligible for archival (in ms). Default 1 day. */
  archiveAfterMs: number;
  /** Maximum number of archived backups to keep per form type + formId combo. Default 50. */
  maxArchivedBackups: number;
  /** Maximum age of archived backups before deletion (in ms). Default 90 days. */
  maxArchivedAgeMs: number;
  /** Whether automated archival is enabled. Default true. */
  automatedArchivalEnabled: boolean;
}

const DEFAULT_CONFIG: FormBackupConfig = {
  backupIntervalMs: 30_000,
  maxBackups: 10,
  maxBackupAgeMs: 7 * 24 * 60 * 60 * 1000,
};

const DEFAULT_ARCHIVE_POLICY: ArchivePolicy = {
  archiveAfterMs: 24 * 60 * 60 * 1000, // 1 day
  maxArchivedBackups: 50,
  maxArchivedAgeMs: 90 * 24 * 60 * 60 * 1000, // 90 days
  automatedArchivalEnabled: true,
};

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const BACKUP_STORAGE_PREFIX = "dongle_form_backup_";

function getStorageKey(formType: string, formId: string): string {
  return `${BACKUP_STORAGE_PREFIX}${formType}_${formId}`;
}

function generateBackupId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// FormBackupService
// ---------------------------------------------------------------------------

export class FormBackupService {
  private config: FormBackupConfig;
  private archivePolicy: ArchivePolicy;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isRunning: Map<string, boolean> = new Map();

  constructor(config?: Partial<FormBackupConfig>, archivePolicy?: Partial<ArchivePolicy>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.archivePolicy = { ...DEFAULT_ARCHIVE_POLICY, ...archivePolicy };
  }

  // ── Config ──────────────────────────────────────────────────────

  /** Update the backup configuration at runtime. */
  updateConfig(config: Partial<FormBackupConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ── Archive policy ──────────────────────────────────────────────

  /** Update the archive policy at runtime. */
  updateArchivePolicy(policy: Partial<ArchivePolicy>): void {
    this.archivePolicy = { ...this.archivePolicy, ...policy };
  }

  /** Get the current archive policy. */
  getArchivePolicy(): ArchivePolicy {
    return { ...this.archivePolicy };
  }

  // ── Backup lifecycle ────────────────────────────────────────────

  /**
   * Start automatic backups for a form.
   * Creates an initial backup immediately, then schedules periodic backups.
   */
  startBackup(formType: string, formId: string, data: Record<string, unknown>): void {
    const key = getStorageKey(formType, formId);

    // Create initial backup immediately
    this.createBackup(formType, formId, data);

    // Schedule periodic backups
    this.stopBackup(formType, formId);
    const timer = setInterval(() => {
      this.createBackup(formType, formId, data);
    }, this.config.backupIntervalMs);

    this.timers.set(key, timer);
    this.isRunning.set(key, true);
  }

  /** Stop automatic backups for a form. */
  stopBackup(formType: string, formId: string): void {
    const key = getStorageKey(formType, formId);
    const timer = this.timers.get(key);
    if (timer !== undefined) {
      clearInterval(timer);
      this.timers.delete(key);
    }
    this.isRunning.set(key, false);
  }

  /** Stop all running backup timers. */
  stopAllBackups(): void {
    for (const [key, timer] of this.timers) {
      clearInterval(timer);
      this.timers.delete(key);
    }
    this.isRunning.clear();
  }

  /**
   * Create a backup of form data immediately.
   * Returns the backup ID, or null if storage is unavailable.
   */
  createBackup(formType: string, formId: string, data: Record<string, unknown>): string | null {
    if (typeof window === "undefined") return null;

    try {
      const backups = this.getBackups(formType, formId);
      const backup: FormBackup = {
        id: generateBackupId(),
        formType,
        formId,
        data: { ...data },
        createdAt: new Date().toISOString(),
      };

      backups.push(backup);
      this.applyRetentionPolicy(backups);
      this.persistBackups(formType, formId, backups);

      return backup.id;
    } catch (err) {
      console.error("[FormBackupService] Failed to create backup:", err);
      return null;
    }
  }

  // ── Restore ─────────────────────────────────────────────────────

  /**
   * Get all available backups for a form, sorted newest first.
   */
  getBackups(formType: string, formId: string): FormBackup[] {
    if (typeof window === "undefined") return [];

    try {
      const raw = localStorage.getItem(getStorageKey(formType, formId));
      if (!raw) return [];

      const backups = JSON.parse(raw) as FormBackup[];
      // Filter out expired backups
      const now = Date.now();
      const valid = backups.filter((b) => {
        const age = now - new Date(b.createdAt).getTime();
        return age <= this.config.maxBackupAgeMs;
      });

      // If we filtered some out, persist the cleaned list
      if (valid.length !== backups.length) {
        this.persistBackups(formType, formId, valid);
      }

      return valid.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error("[FormBackupService] Failed to read backups:", err);
      return [];
    }
  }

  /**
   * Restore form data from a specific backup.
   * Marks the backup as restored.
   */
  restoreBackup(formType: string, formId: string, backupId: string): Record<string, unknown> | null {
    const backups = this.getBackups(formType, formId);
    const backup = backups.find((b) => b.id === backupId);

    if (!backup) {
      console.warn(`[FormBackupService] Backup ${backupId} not found for ${formType}/${formId}`);
      return null;
    }

    // Mark as restored
    backup.restoredAt = new Date().toISOString();
    this.persistBackups(formType, formId, backups);

    return { ...backup.data };
  }

  // ── Retention policy ────────────────────────────────────────────

  /**
   * Apply the retention policy to a list of backups.
   * Keeps at most maxBackups newest backups, and removes backups older than maxBackupAgeMs.
   */
  applyRetentionPolicy(backups: FormBackup[]): FormBackup[] {
    const now = Date.now();

    // Remove expired backups
    const valid = backups.filter((b) => {
      const age = now - new Date(b.createdAt).getTime();
      return age <= this.config.maxBackupAgeMs;
    });

    // Keep only the newest maxBackups
    valid.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const retained = valid.slice(0, this.config.maxBackups);

    return retained;
  }

  /**
   * Clean expired backups for a form.
   * Returns the number of backups removed.
   */
  cleanExpiredBackups(formType: string, formId: string): number {
    const backups = this.getBackups(formType, formId);
    const before = backups.length;
    const cleaned = this.applyRetentionPolicy(backups);
    const removed = before - cleaned.length;

    if (removed > 0) {
      this.persistBackups(formType, formId, cleaned);
    }

    return removed;
  }

  // ── Delete ──────────────────────────────────────────────────────

  /** Delete a specific backup. */
  deleteBackup(formType: string, formId: string, backupId: string): boolean {
    const backups = this.getBackups(formType, formId);
    const filtered = backups.filter((b) => b.id !== backupId);

    if (filtered.length === backups.length) return false;

    this.persistBackups(formType, formId, filtered);
    return true;
  }

  /** Delete all backups for a form. */
  deleteAllBackups(formType: string, formId: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(getStorageKey(formType, formId));
  }

  // ── Archive ──────────────────────────────────────────────────

  /**
   * Archive eligible backups for a form.
   * Moves backups older than archiveAfterMs to archived storage.
   * Returns the number of backups archived.
   */
  archiveBackups(formType: string, formId: string): number {
    if (typeof window === "undefined") return 0;

    try {
      const backups = this.getBackups(formType, formId);
      const now = Date.now();
      const archived: ArchivedBackup[] = this.getArchivedBackups(formType, formId);

      const eligible = backups.filter((b) => {
        const age = now - new Date(b.createdAt).getTime();
        return age > this.archivePolicy.archiveAfterMs;
      });

      if (eligible.length === 0) return 0;

      for (const backup of eligible) {
        archived.push({
          ...backup,
          archivedAt: new Date().toISOString(),
          archivedBy: "retention_policy",
        });
      }

      // Remove archived backups from active storage
      const remaining = backups.filter((b) => !eligible.includes(b));
      this.persistBackups(formType, formId, remaining);

      // Persist archived backups with retention
      this.applyArchiveRetentionPolicy(archived);
      this.persistArchivedBackups(formType, formId, archived);

      return eligible.length;
    } catch (err) {
      console.error("[FormBackupService] Failed to archive backups:", err);
      return 0;
    }
  }

  /**
   * Get all archived backups for a form, sorted newest first.
   */
  getArchivedBackups(formType: string, formId: string): ArchivedBackup[] {
    if (typeof window === "undefined") return [];

    try {
      const raw = localStorage.getItem(getArchivedStorageKey(formType, formId));
      if (!raw) return [];

      const archived = JSON.parse(raw) as ArchivedBackup[];
      // Filter out expired archived backups
      const now = Date.now();
      const valid = archived.filter((b) => {
        const age = now - new Date(b.archivedAt).getTime();
        return age <= this.archivePolicy.maxArchivedAgeMs;
      });

      if (valid.length !== archived.length) {
        this.persistArchivedBackups(formType, formId, valid);
      }

      return valid.sort(
        (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime(),
      );
    } catch (err) {
      console.error("[FormBackupService] Failed to read archived backups:", err);
      return [];
    }
  }

  /**
   * Search archived backups by form type, form ID, or backup ID.
   * Returns matching archived backups sorted newest first.
   */
  searchArchivedBackups(
    formType: string,
    formId: string,
    query: string,
  ): ArchivedBackup[] {
    const archived = this.getArchivedBackups(formType, formId);
    const lower = query.toLowerCase().trim();

    if (!lower) return archived;

    return archived.filter(
      (b) =>
        b.formType.toLowerCase().includes(lower) ||
        b.formId.toLowerCase().includes(lower) ||
        b.id.toLowerCase().includes(lower),
    );
  }

  /**
   * Restore form data from an archived backup.
   * Marks the archived backup as restored.
   */
  restoreArchivedBackup(
    formType: string,
    formId: string,
    backupId: string,
  ): Record<string, unknown> | null {
    const archived = this.getArchivedBackups(formType, formId);
    const backup = archived.find((b) => b.id === backupId);

    if (!backup) {
      console.warn(
        `[FormBackupService] Archived backup ${backupId} not found for ${formType}/${formId}`,
      );
      return null;
    }

    // Mark as restored
    backup.restoredAt = new Date().toISOString();
    this.persistArchivedBackups(formType, formId, archived);

    return { ...backup.data };
  }

  /**
   * Apply the archive retention policy to a list of archived backups.
   * Keeps at most maxArchivedBackups newest, removes expired ones.
   */
  applyArchiveRetentionPolicy(backups: ArchivedBackup[]): ArchivedBackup[] {
    const now = Date.now();

    // Remove expired archived backups
    const valid = backups.filter((b) => {
      const age = now - new Date(b.archivedAt).getTime();
      return age <= this.archivePolicy.maxArchivedAgeMs;
    });

    // Keep only the newest maxArchivedBackups
    valid.sort(
      (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime(),
    );
    const retained = valid.slice(0, this.archivePolicy.maxArchivedBackups);

    return retained;
  }

  /**
   * Clean expired archived backups for a form.
   * Returns the number of archived backups removed.
   */
  cleanExpiredArchivedBackups(formType: string, formId: string): number {
    const archived = this.getArchivedBackups(formType, formId);
    const before = archived.length;
    const cleaned = this.applyArchiveRetentionPolicy(archived);
    const removed = before - cleaned.length;

    if (removed > 0) {
      this.persistArchivedBackups(formType, formId, cleaned);
    }

    return removed;
  }

  /** Delete a specific archived backup. */
  deleteArchivedBackup(formType: string, formId: string, backupId: string): boolean {
    const archived = this.getArchivedBackups(formType, formId);
    const filtered = archived.filter((b) => b.id !== backupId);

    if (filtered.length === archived.length) return false;

    this.persistArchivedBackups(formType, formId, filtered);
    return true;
  }

  /** Delete all archived backups for a form. */
  deleteAllArchivedBackups(formType: string, formId: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(getArchivedStorageKey(formType, formId));
  }

  /**
   * Run automated archival for all forms.
   * Archives eligible backups and cleans expired archived ones.
   * Returns the total number of backups archived.
   */
  runAutomatedArchival(): number {
    if (typeof window === "undefined" || !this.archivePolicy.automatedArchivalEnabled) {
      return 0;
    }

    let totalArchived = 0;

    // Iterate over all localStorage keys matching the backup prefix
    const prefix = BACKUP_STORAGE_PREFIX;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;

      // Extract formType and formId from key: dongle_form_backup_<formType>_<formId>
      const suffix = key.slice(prefix.length);
      const underscoreIdx = suffix.indexOf("_");
      if (underscoreIdx === -1) continue;

      const formType = suffix.slice(0, underscoreIdx);
      const formId = suffix.slice(underscoreIdx + 1);

      totalArchived += this.archiveBackups(formType, formId);
    }

    return totalArchived;
  }

  // ── Internal ────────────────────────────────────────────────────

  private persistBackups(formType: string, formId: string, backups: FormBackup[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(getStorageKey(formType, formId), JSON.stringify(backups));
    } catch (err) {
      console.error("[FormBackupService] Failed to persist backups:", err);
    }
  }

  private persistArchivedBackups(formType: string, formId: string, backups: ArchivedBackup[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(getArchivedStorageKey(formType, formId), JSON.stringify(backups));
    } catch (err) {
      console.error("[FormBackupService] Failed to persist archived backups:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Storage helpers (archived)
// ---------------------------------------------------------------------------

const ARCHIVED_STORAGE_PREFIX = "dongle_form_archived_";

function getArchivedStorageKey(formType: string, formId: string): string {
  return `${ARCHIVED_STORAGE_PREFIX}${formType}_${formId}`;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const formBackupService = new FormBackupService();
