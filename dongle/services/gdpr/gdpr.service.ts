/**
 * GDPR Compliance Service
 *
 * Provides data export, deletion, consent tracking, and retention policy
 * functionality for form data in compliance with GDPR.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsentRecord {
  formType: string;
  formId: string;
  userId: string;
  consentGiven: boolean;
  consentTimestamp: string; // ISO timestamp
  consentVersion: string;
  purposes: string[];
}

export interface DataExportResult {
  exportedAt: string;
  formType: string;
  formId: string;
  userId: string;
  data: Record<string, unknown>[];
  backupCount: number;
  archiveCount: number;
  consentRecords: ConsentRecord[];
}

export interface DataDeletionResult {
  deletedAt: string;
  formType: string;
  formId: string;
  userId: string;
  backupsDeleted: number;
  archivesDeleted: number;
  consentRecordsDeleted: number;
}

export interface DataRetentionPolicy {
  maxBackupAgeMs: number;
  maxBackups: number;
  maxArchiveAgeMs: number;
  maxArchivedBackups: number;
  consentRetentionMs: number;
  exportEnabled: boolean;
  deletionEnabled: boolean;
}

export interface GDPRConsent {
  given: boolean;
  timestamp: string;
  version: string;
  purposes: string[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_RETENTION_POLICY: DataRetentionPolicy = {
  maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxBackups: 10,
  maxArchiveAgeMs: 90 * 24 * 60 * 60 * 1000, // 90 days
  maxArchivedBackups: 50,
  consentRetentionMs: 365 * 24 * 60 * 60 * 1000, // 1 year
  exportEnabled: true,
  deletionEnabled: true,
};

const CONSENT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const STORAGE_KEY_CONSENT = "dongle_gdpr_consent";
const STORAGE_KEY_EXPORT = "dongle_gdpr_export";
const STORAGE_KEY_DELETION = "dongle_gdpr_deletion";

class GDPRService {
  private retentionPolicy: DataRetentionPolicy;

  constructor(retentionPolicy?: Partial<DataRetentionPolicy>) {
    this.retentionPolicy = { ...DEFAULT_RETENTION_POLICY, ...retentionPolicy };
  }

  // ── Consent Tracking ──────────────────────────────

  /**
   * Record user consent for form data processing.
   */
  trackConsent(
    formType: string,
    formId: string,
    userId: string,
    purposes: string[],
    given: boolean = true,
  ): ConsentRecord {
    const record: ConsentRecord = {
      formType,
      formId,
      userId,
      consentGiven: given,
      consentTimestamp: new Date().toISOString(),
      consentVersion: CONSENT_VERSION,
      purposes,
    };

    const existing = this.getConsentRecords(formType, formId, userId);
    const updated = [...existing.filter((r) => !(r.formType === formType && r.formId === formId && r.userId === userId)), record];

    try {
      const all = this.getAllConsentRecords();
      const filtered = all.filter(
        (r) => !(r.formType === formType && r.formId === formId && r.userId === userId),
      );
      filtered.push(record);
      localStorage.setItem(STORAGE_KEY_CONSENT, JSON.stringify(filtered));
    } catch {
      // localStorage unavailable — silently continue
    }

    return record;
  }

  /**
   * Get consent records for a specific form/user.
   */
  getConsentStatus(
    formType: string,
    formId: string,
    userId: string,
  ): ConsentRecord | null {
    const records = this.getConsentRecords(formType, formId, userId);
    return records.length > 0 ? records[records.length - 1] : null;
  }

  /**
   * Get all consent records.
   */
  getAllConsentRecords(): ConsentRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONSENT);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getConsentRecords(
    formType: string,
    formId: string,
    userId: string,
  ): ConsentRecord[] {
    return this.getAllConsentRecords().filter(
      (r) => r.formType === formType && r.formId === formId && r.userId === userId,
    );
  }

  /**
   * Delete consent records for a specific form/user.
   */
  deleteConsentRecords(
    formType: string,
    formId: string,
    userId: string,
  ): number {
    try {
      const all = this.getAllConsentRecords();
      const filtered = all.filter(
        (r) => !(r.formType === formType && r.formId === formId && r.userId === userId),
      );
      const deleted = all.length - filtered.length;
      localStorage.setItem(STORAGE_KEY_CONSENT, JSON.stringify(filtered));
      return deleted;
    } catch {
      return 0;
    }
  }

  // ── Data Export ────────────────────────────────────

  /**
   * Export all form data for a user as a downloadable JSON blob.
   */
  exportUserData(
    formType: string,
    formId: string,
    userId: string,
    formData?: Record<string, unknown>,
  ): DataExportResult {
    const exportResult: DataExportResult = {
      exportedAt: new Date().toISOString(),
      formType,
      formId,
      userId,
      data: formData ? [formData] : [],
      backupCount: 0,
      archiveCount: 0,
      consentRecords: this.getConsentRecords(formType, formId, userId),
    };

    // Include backups if available
    try {
      const backupKey = `dongle_form_backup_${formType}_${formId}`;
      const raw = localStorage.getItem(backupKey);
      if (raw) {
        const backups = JSON.parse(raw) as Record<string, unknown>[];
        exportResult.backupCount = backups.length;
        exportResult.data.push(...backups.map((b) => b.data));
      }
    } catch {
      // ignore
    }

    // Include archived backups if available
    try {
      const archiveKey = `dongle_form_archive_${formType}_${formId}`;
      const raw = localStorage.getItem(archiveKey);
      if (raw) {
        const archives = JSON.parse(raw) as Record<string, unknown>[];
        exportResult.archiveCount = archives.length;
        exportResult.data.push(...archives.map((a) => a.data));
      }
    } catch {
      // ignore
    }

    // Store export record
    try {
      const exports = this.getExportRecords();
      exports.push(exportResult);
      localStorage.setItem(STORAGE_KEY_EXPORT, JSON.stringify(exports));
    } catch {
      // ignore
    }

    return exportResult;
  }

  /**
   * Get all export records.
   */
  getExportRecords(): DataExportResult[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EXPORT);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Trigger a browser download of the exported data.
   */
  downloadExport(exportResult: DataExportResult): void {
    const blob = new Blob([JSON.stringify(exportResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dongle-gdpr-export-${exportResult.formType}-${exportResult.formId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Data Deletion ──────────────────────────────────

  /**
   * Delete all form data for a user, including backups, archives, and consent records.
   */
  deleteUserData(
    formType: string,
    formId: string,
    userId: string,
  ): DataDeletionResult {
    const result: DataDeletionResult = {
      deletedAt: new Date().toISOString(),
      formType,
      formId,
      userId,
      backupsDeleted: 0,
      archivesDeleted: 0,
      consentRecordsDeleted: 0,
    };

    // Delete backups
    try {
      const backupKey = `dongle_form_backup_${formType}_${formId}`;
      const raw = localStorage.getItem(backupKey);
      if (raw) {
        const backups = JSON.parse(raw) as Record<string, unknown>[];
        result.backupsDeleted = backups.length;
        localStorage.removeItem(backupKey);
      }
    } catch {
      // ignore
    }

    // Delete archived backups
    try {
      const archiveKey = `dongle_form_archive_${formType}_${formId}`;
      const raw = localStorage.getItem(archiveKey);
      if (raw) {
        const archives = JSON.parse(raw) as Record<string, unknown>[];
        result.archivesDeleted = archives.length;
        localStorage.removeItem(archiveKey);
      }
    } catch {
      // ignore
    }

    // Delete consent records
    result.consentRecordsDeleted = this.deleteConsentRecords(formType, formId, userId);

    // Store deletion record
    try {
      const deletions = this.getDeletionRecords();
      deletions.push(result);
      localStorage.setItem(STORAGE_KEY_DELETION, JSON.stringify(deletions));
    } catch {
      // ignore
    }

    return result;
  }

  /**
   * Get all deletion records.
   */
  getDeletionRecords(): DataDeletionResult[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DELETION);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // ── Data Retention Policy ──────────────────────────

  /**
   * Get the current data retention policy.
   */
  getRetentionPolicy(): DataRetentionPolicy {
    return { ...this.retentionPolicy };
  }

  /**
   * Update the data retention policy.
   */
  updateRetentionPolicy(policy: Partial<DataRetentionPolicy>): void {
    this.retentionPolicy = { ...this.retentionPolicy, ...policy };
    try {
      localStorage.setItem("dongle_gdpr_retention_policy", JSON.stringify(this.retentionPolicy));
    } catch {
      // ignore
    }
  }

  /**
   * Load the retention policy from localStorage.
   */
  loadRetentionPolicy(): void {
    try {
      const raw = localStorage.getItem("dongle_gdpr_retention_policy");
      if (raw) {
        this.retentionPolicy = { ...DEFAULT_RETENTION_POLICY, ...JSON.parse(raw) };
      }
    } catch {
      // ignore
    }
  }

  /**
   * Clean expired backups based on the retention policy.
   * Returns the number of backups removed.
   */
  cleanExpiredBackups(formType: string, formId: string): number {
    try {
      const backupKey = `dongle_form_backup_${formType}_${formId}`;
      const raw = localStorage.getItem(backupKey);
      if (!raw) return 0;

      const backups = JSON.parse(raw) as FormBackup[];
      const now = Date.now();
      const valid = backups.filter((b) => {
        const age = now - new Date(b.createdAt).getTime();
        return age <= this.retentionPolicy.maxBackupAgeMs;
      });

      const removed = backups.length - valid.length;
      if (removed > 0) {
        localStorage.setItem(backupKey, JSON.stringify(valid));
      }
      return removed;
    } catch {
      return 0;
    }
  }

  /**
   * Check if the user has given consent for a specific form.
   */
  hasConsent(formType: string, formId: string, userId: string): boolean {
    const record = this.getConsentStatus(formType, formId, userId);
    return record?.consentGiven ?? false;
  }
}

// ---------------------------------------------------------------------------
// Singleton & export
// ---------------------------------------------------------------------------

export const gdprService = new GDPRService();
export { GDPRService, DEFAULT_RETENTION_POLICY, CONSENT_VERSION };

// Re-export types
export type {
  ConsentRecord,
  DataExportResult,
  DataDeletionResult,
  DataRetentionPolicy,
  GDPRConsent,
};
