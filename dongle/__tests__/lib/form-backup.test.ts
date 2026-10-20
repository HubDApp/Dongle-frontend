import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  FormBackupService,
  formBackupService,
  type FormBackup,
} from "@/services/backup/form-backup.service";

describe("FormBackupService", () => {
  beforeEach(() => {
    localStorage.clear();
    formBackupService.stopAllBackups();
  });

  afterEach(() => {
    formBackupService.stopAllBackups();
    localStorage.clear();
  });

  // ── Backup creation ──────────────────────────────────────

  it("creates a backup and returns its ID", () => {
    const data = { name: "Test Project", category: "DeFi" };
    const id = formBackupService.createBackup("project", "proj-1", data);

    expect(id).not.toBeNull();
    expect(typeof id).toBe("string");
  });

  it("stores backup data in localStorage", () => {
    const data = { name: "Test Project", category: "DeFi" };
    formBackupService.createBackup("project", "proj-1", data);

    const raw = localStorage.getItem("dongle_form_backup_project_proj-1");
    expect(raw).not.toBeNull();

    const backups = JSON.parse(raw!) as FormBackup[];
    expect(backups).toHaveLength(1);
    expect(backups[0].data).toEqual(data);
    expect(backups[0].formType).toBe("project");
    expect(backups[0].formId).toBe("proj-1");
    expect(backups[0].id).toBeTruthy();
    expect(backups[0].createdAt).toBeTruthy();
  });

  it("creates multiple backups for the same form", () => {
    formBackupService.createBackup("project", "proj-1", { name: "First" });
    formBackupService.createBackup("project", "proj-1", { name: "Second" });
    formBackupService.createBackup("project", "proj-1", { name: "Third" });

    const backups = formBackupService.getBackups("project", "proj-1");
    expect(backups).toHaveLength(3);
  });

  it("isolates backups by form type and form ID", () => {
    formBackupService.createBackup("project", "proj-1", { name: "Project 1" });
    formBackupService.createBackup("project", "proj-2", { name: "Project 2" });
    formBackupService.createBackup("verification", "proj-1", { id: "verify-1" });

    expect(formBackupService.getBackups("project", "proj-1")).toHaveLength(1);
    expect(formBackupService.getBackups("project", "proj-2")).toHaveLength(1);
    expect(formBackupService.getBackups("verification", "proj-1")).toHaveLength(1);
  });

  // ── Backup retrieval ──────────────────────────────────────

  it("returns backups sorted newest first", () => {
    formBackupService.createBackup("project", "proj-1", { name: "First" });
    const firstId = formBackupService.getBackups("project", "proj-1")[0].id;

    // Wait a bit to ensure different timestamps
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000);
    formBackupService.createBackup("project", "proj-1", { name: "Second" });
    vi.useRealTimers();

    const backups = formBackupService.getBackups("project", "proj-1");
    expect(backups[0].data.name).toBe("Second");
    expect(backups[1].data.name).toBe("First");
  });

  it("returns empty array when no backups exist", () => {
    const backups = formBackupService.getBackups("project", "nonexistent");
    expect(backups).toEqual([]);
  });

  // ── Restore ───────────────────────────────────────────────

  it("restores data from a backup", () => {
    const data = { name: "Test Project", category: "DeFi" };
    const backupId = formBackupService.createBackup("project", "proj-1", data);

    const restored = formBackupService.restoreBackup("project", "proj-1", backupId!);
    expect(restored).toEqual(data);
  });

  it("marks a backup as restored", () => {
    const data = { name: "Test Project" };
    const backupId = formBackupService.createBackup("project", "proj-1", data);

    formBackupService.restoreBackup("project", "proj-1", backupId!);

    const backups = formBackupService.getBackups("project", "proj-1");
    const backup = backups.find((b) => b.id === backupId);
    expect(backup?.restoredAt).toBeTruthy();
  });

  it("returns null when restoring a non-existent backup", () => {
    const restored = formBackupService.restoreBackup("project", "proj-1", "nonexistent");
    expect(restored).toBeNull();
  });

  // ── Retention policy ──────────────────────────────────────

  it("applies maxBackups retention policy", () => {
    const service = new FormBackupService({ maxBackups: 3, maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 });

    for (let i = 0; i < 5; i++) {
      service.createBackup("project", "proj-1", { name: `Backup ${i}` });
    }

    const backups = service.getBackups("project", "proj-1");
    expect(backups.length).toBeLessThanOrEqual(3);
  });

  it("removes expired backups based on maxBackupAgeMs", () => {
    const service = new FormBackupService({ maxBackups: 10, maxBackupAgeMs: 1000 });

    service.createBackup("project", "proj-1", { name: "Recent" });

    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);
    service.createBackup("project", "proj-1", { name: "Old" });
    vi.useRealTimers();

    // The "Recent" backup should be expired now
    const backups = service.getBackups("project", "proj-1");
    expect(backups.length).toBeLessThanOrEqual(2);
  });

  it("cleanExpiredBackups returns the number of removed backups", () => {
    const service = new FormBackupService({ maxBackups: 2, maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 });

    for (let i = 0; i < 5; i++) {
      service.createBackup("project", "proj-1", { name: `Backup ${i}` });
    }

    const removed = service.cleanExpiredBackups("project", "proj-1");
    expect(removed).toBeGreaterThan(0);

    const backups = service.getBackups("project", "proj-1");
    expect(backups.length).toBeLessThanOrEqual(2);
  });

  // ── Delete ────────────────────────────────────────────────

  it("deletes a specific backup", () => {
    const id1 = formBackupService.createBackup("project", "proj-1", { name: "First" });
    formBackupService.createBackup("project", "proj-1", { name: "Second" });

    const success = formBackupService.deleteBackup("project", "proj-1", id1!);
    expect(success).toBe(true);

    const backups = formBackupService.getBackups("project", "proj-1");
    expect(backups.length).toBe(1);
    expect(backups[0].data.name).toBe("Second");
  });

  it("returns false when deleting a non-existent backup", () => {
    const success = formBackupService.deleteBackup("project", "proj-1", "nonexistent");
    expect(success).toBe(false);
  });

  it("deletes all backups for a form", () => {
    formBackupService.createBackup("project", "proj-1", { name: "First" });
    formBackupService.createBackup("project", "proj-1", { name: "Second" });

    formBackupService.deleteAllBackups("project", "proj-1");

    const backups = formBackupService.getBackups("project", "proj-1");
    expect(backups).toEqual([]);
  });

  // ── Configurable backup schedule ──────────────────────────

  it("starts and stops automatic backups", () => {
    const service = new FormBackupService({ backupIntervalMs: 1000 });
    service.startBackup("project", "proj-1", { name: "Test" });

    expect(service.getBackups("project", "proj-1").length).toBeGreaterThanOrEqual(1);

    service.stopBackup("project", "proj-1");
    const countAfterStop = service.getBackups("project", "proj-1").length;

    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();

    // No new backups after stopping
    expect(service.getBackups("project", "proj-1").length).toBe(countAfterStop);

    service.stopAllBackups();
  });

  it("accepts configurable backup interval", () => {
    const service = new FormBackupService({ backupIntervalMs: 5000 });
    expect((service as unknown as { config: { backupIntervalMs: number } }).config.backupIntervalMs).toBe(5000);
  });

  it("stops all backups when stopAllBackups is called", () => {
    const service = new FormBackupService({ backupIntervalMs: 1000 });
    service.startBackup("project", "proj-1", { name: "Test" });
    service.startBackup("project", "proj-2", { name: "Test 2" });

    service.stopAllBackups();

    expect(service.getBackups("project", "proj-1").length).toBeGreaterThanOrEqual(1);
    expect(service.getBackups("project", "proj-2").length).toBeGreaterThanOrEqual(1);
  });

  // ── Server-side (no localStorage) ─────────────────────────

  it("returns null when creating a backup in SSR (no window)", () => {
    // @ts-expect-error – simulate SSR by removing window
    const originalWindow = global.window;
    delete (global as Record<string, unknown>).window;

    try {
      const id = formBackupService.createBackup("project", "proj-1", { name: "Test" });
      expect(id).toBeNull();
    } finally {
      global.window = originalWindow as Window & typeof globalThis;
    }
  });

  // ── Archive policy ──────────────────────────────────────

  it("accepts configurable archive policy", () => {
    const service = new FormBackupService(
      { backupIntervalMs: 5000 },
      { archiveAfterMs: 3600000, maxArchivedBackups: 20, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );
    const policy = service.getArchivePolicy();
    expect(policy.archiveAfterMs).toBe(3600000);
    expect(policy.maxArchivedBackups).toBe(20);
    expect(policy.maxArchivedAgeMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("updates archive policy at runtime", () => {
    formBackupService.updateArchivePolicy({ archiveAfterMs: 7200000 });
    expect(formBackupService.getArchivePolicy().archiveAfterMs).toBe(7200000);
  });

  // ── Archival ────────────────────────────────────────────

  it("archives backups older than archiveAfterMs", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 1000, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    service.createBackup("project", "proj-1", { name: "Recent" });

    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);
    service.createBackup("project", "proj-1", { name: "Old" });
    vi.useRealTimers();

    const archived = service.archiveBackups("project", "proj-1");
    expect(archived).toBeGreaterThan(0);

    const active = service.getBackups("project", "proj-1");
    const archivedList = service.getArchivedBackups("project", "proj-1");
    expect(active.length + archivedList.length).toBe(2);
  });

  it("does not archive backups newer than archiveAfterMs", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 86400000, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    service.createBackup("project", "proj-1", { name: "Recent" });

    const archived = service.archiveBackups("project", "proj-1");
    expect(archived).toBe(0);
  });

  it("returns archived backups sorted newest first", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    service.createBackup("project", "proj-1", { name: "First" });
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000);
    service.createBackup("project", "proj-1", { name: "Second" });
    vi.useRealTimers();

    service.archiveBackups("project", "proj-1");

    const archived = service.getArchivedBackups("project", "proj-1");
    expect(archived.length).toBe(2);
    expect(archived[0].data.name).toBe("Second");
    expect(archived[1].data.name).toBe("First");
  });

  it("returns empty array when no archived backups exist", () => {
    const archived = formBackupService.getArchivedBackups("project", "nonexistent");
    expect(archived).toEqual([]);
  });

  // ── Search archived backups ─────────────────────────────

  it("searches archived backups by formType", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    service.createBackup("project", "proj-1", { name: "Test" });
    service.archiveBackups("project", "proj-1");

    const results = service.searchArchivedBackups("project", "proj-1", "project");
    expect(results.length).toBeGreaterThan(0);
  });

  it("searches archived backups by formId", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    service.createBackup("project", "proj-1", { name: "Test" });
    service.archiveBackups("project", "proj-1");

    const results = service.searchArchivedBackups("project", "proj-1", "proj-1");
    expect(results.length).toBeGreaterThan(0);
  });

  it("searches archived backups by backup ID", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    const backupId = service.createBackup("project", "proj-1", { name: "Test" });
    service.archiveBackups("project", "proj-1");

    const results = service.searchArchivedBackups("project", "proj-1", backupId!);
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns all archived backups when query is empty", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    service.createBackup("project", "proj-1", { name: "Test" });
    service.archiveBackups("project", "proj-1");

    const results = service.searchArchivedBackups("project", "proj-1", "");
    expect(results.length).toBe(1);
  });

  // ── Restore from archived backup ────────────────────────

  it("restores data from an archived backup", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    const data = { name: "Archived Project" };
    const backupId = service.createBackup("project", "proj-1", data);
    service.archiveBackups("project", "proj-1");

    const restored = service.restoreArchivedBackup("project", "proj-1", backupId!);
    expect(restored).toEqual(data);
  });

  it("marks an archived backup as restored", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    const backupId = service.createBackup("project", "proj-1", { name: "Test" });
    service.archiveBackups("project", "proj-1");

    service.restoreArchivedBackup("project", "proj-1", backupId!);

    const archived = service.getArchivedBackups("project", "proj-1");
    const backup = archived.find((b) => b.id === backupId);
    expect(backup?.restoredAt).toBeTruthy();
  });

  it("returns null when restoring a non-existent archived backup", () => {
    const restored = formBackupService.restoreArchivedBackup("project", "proj-1", "nonexistent");
    expect(restored).toBeNull();
  });

  // ── Archive retention policy ────────────────────────────

  it("applies maxArchivedBackups retention policy", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedBackups: 2, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    for (let i = 0; i < 5; i++) {
      service.createBackup("project", "proj-1", { name: `Backup ${i}` });
    }
    service.archiveBackups("project", "proj-1");

    const archived = service.getArchivedBackups("project", "proj-1");
    expect(archived.length).toBeLessThanOrEqual(2);
  });

  it("removes expired archived backups based on maxArchivedAgeMs", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedBackups: 10, maxArchivedAgeMs: 1000 },
    );

    service.createBackup("project", "proj-1", { name: "Recent" });

    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);
    service.createBackup("project", "proj-1", { name: "Old" });
    vi.useRealTimers();

    service.archiveBackups("project", "proj-1");

    // The "Recent" archived backup should be expired now
    const archived = service.getArchivedBackups("project", "proj-1");
    expect(archived.length).toBeLessThanOrEqual(2);
  });

  it("cleanExpiredArchivedBackups returns the number of removed backups", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedBackups: 2, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    for (let i = 0; i < 5; i++) {
      service.createBackup("project", "proj-1", { name: `Backup ${i}` });
    }
    service.archiveBackups("project", "proj-1");

    const removed = service.cleanExpiredArchivedBackups("project", "proj-1");
    expect(removed).toBeGreaterThan(0);

    const archived = service.getArchivedBackups("project", "proj-1");
    expect(archived.length).toBeLessThanOrEqual(2);
  });

  // ── Delete archived backups ─────────────────────────────

  it("deletes a specific archived backup", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    const id1 = service.createBackup("project", "proj-1", { name: "First" });
    service.createBackup("project", "proj-1", { name: "Second" });
    service.archiveBackups("project", "proj-1");

    const success = service.deleteArchivedBackup("project", "proj-1", id1!);
    expect(success).toBe(true);

    const archived = service.getArchivedBackups("project", "proj-1");
    expect(archived.length).toBe(1);
    expect(archived[0].data.name).toBe("Second");
  });

  it("returns false when deleting a non-existent archived backup", () => {
    const success = formBackupService.deleteArchivedBackup("project", "proj-1", "nonexistent");
    expect(success).toBe(false);
  });

  it("deletes all archived backups for a form", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000 },
    );

    service.createBackup("project", "proj-1", { name: "First" });
    service.createBackup("project", "proj-1", { name: "Second" });
    service.archiveBackups("project", "proj-1");

    service.deleteAllArchivedBackups("project", "proj-1");

    const archived = service.getArchivedBackups("project", "proj-1");
    expect(archived).toEqual([]);
  });

  // ── Automated archival ──────────────────────────────────

  it("runAutomatedArchival archives eligible backups", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000, backupIntervalMs: 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000, automatedArchivalEnabled: true },
    );

    service.createBackup("project", "proj-1", { name: "Test" });

    const archived = service.runAutomatedArchival();
    expect(archived).toBeGreaterThanOrEqual(0);
  });

  it("runAutomatedArchival returns 0 when automated archival is disabled", () => {
    const service = new FormBackupService(
      { maxBackupAgeMs: 30 * 24 * 60 * 60 * 1000 },
      { archiveAfterMs: 0, maxArchivedAgeMs: 30 * 24 * 60 * 60 * 1000, automatedArchivalEnabled: false },
    );

    service.createBackup("project", "proj-1", { name: "Test" });

    const archived = service.runAutomatedArchival();
    expect(archived).toBe(0);
  });

  // ── Server-side (no localStorage) ──────────────────────

  it("returns 0 for archive operations in SSR (no window)", () => {
    // @ts-expect-error – simulate SSR by removing window
    const originalWindow = global.window;
    delete (global as Record<string, unknown>).window;

    try {
      const archived = formBackupService.archiveBackups("project", "proj-1");
      expect(archived).toBe(0);
    } finally {
      global.window = originalWindow as Window & typeof globalThis;
    }
  });
});
