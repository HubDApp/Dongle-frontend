import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { gdprService, GDPRService } from "@/services/gdpr/gdpr.service";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("GDPRService", () => {
  describe("Consent Tracking", () => {
    it("tracks consent for a form", () => {
      const record = gdprService.trackConsent(
        "project",
        "proj-1",
        "user-1",
        ["form_submission", "data_processing"],
      );

      expect(record.formType).toBe("project");
      expect(record.formId).toBe("proj-1");
      expect(record.userId).toBe("user-1");
      expect(record.consentGiven).toBe(true);
      expect(record.purposes).toEqual(["form_submission", "data_processing"]);
      expect(record.consentVersion).toBe("1.0.0");
      expect(record.consentTimestamp).toBeDefined();
    });

    it("tracks consent withdrawal", () => {
      gdprService.trackConsent("project", "proj-1", "user-1", ["form_submission"]);
      const record = gdprService.trackConsent(
        "project",
        "proj-1",
        "user-1",
        ["form_submission"],
        false,
      );

      expect(record.consentGiven).toBe(false);
    });

    it("retrieves consent status", () => {
      gdprService.trackConsent("project", "proj-1", "user-1", ["form_submission"]);
      const status = gdprService.getConsentStatus("project", "proj-1", "user-1");

      expect(status).not.toBeNull();
      expect(status!.consentGiven).toBe(true);
    });

    it("returns null for consent status when no record exists", () => {
      const status = gdprService.getConsentStatus("project", "proj-1", "user-1");
      expect(status).toBeNull();
    });

    it("deletes consent records", () => {
      gdprService.trackConsent("project", "proj-1", "user-1", ["form_submission"]);
      const deleted = gdprService.deleteConsentRecords("project", "proj-1", "user-1");

      expect(deleted).toBe(1);
      expect(gdprService.getConsentStatus("project", "proj-1", "user-1")).toBeNull();
    });

    it("has consent returns true when consent given", () => {
      gdprService.trackConsent("project", "proj-1", "user-1", ["form_submission"]);
      expect(gdprService.hasConsent("project", "proj-1", "user-1")).toBe(true);
    });

    it("has consent returns false when no consent", () => {
      expect(gdprService.hasConsent("project", "proj-1", "user-1")).toBe(false);
    });
  });

  describe("Data Export", () => {
    it("exports user data", () => {
      const result = gdprService.exportUserData("project", "proj-1", "user-1", {
        name: "Test Project",
      });

      expect(result.formType).toBe("project");
      expect(result.formId).toBe("proj-1");
      expect(result.userId).toBe("user-1");
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({ name: "Test Project" });
    });

    it("records export in localStorage", () => {
      gdprService.exportUserData("project", "proj-1", "user-1", { name: "Test" });
      const exports = gdprService.getExportRecords();

      expect(exports).toHaveLength(1);
      expect(exports[0].formType).toBe("project");
    });

    it("download export creates a blob URL", () => {
      const result = gdprService.exportUserData("project", "proj-1", "user-1", { name: "Test" });

      // Mock URL.createObjectURL and document.createElement
      const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
      const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation(() => {});
      const removeChild = vi.spyOn(document.body, "removeChild").mockImplementation(() => {});
      const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      gdprService.downloadExport(result);

      expect(createObjectURL).toHaveBeenCalled();
      expect(appendChild).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();

      createObjectURL.mockRestore();
      appendChild.mockRestore();
      removeChild.mockRestore();
      revokeObjectURL.mockRestore();
    });
  });

  describe("Data Deletion", () => {
    it("deletes user data", () => {
      gdprService.trackConsent("project", "proj-1", "user-1", ["form_submission"]);
      const result = gdprService.deleteUserData("project", "proj-1", "user-1");

      expect(result.formType).toBe("project");
      expect(result.formId).toBe("proj-1");
      expect(result.userId).toBe("user-1");
      expect(result.consentRecordsDeleted).toBe(1);
    });

    it("records deletion in localStorage", () => {
      gdprService.deleteUserData("project", "proj-1", "user-1");
      const deletions = gdprService.getDeletionRecords();

      expect(deletions).toHaveLength(1);
      expect(deletions[0].formType).toBe("project");
    });
  });

  describe("Data Retention Policy", () => {
    it("returns default retention policy", () => {
      const policy = gdprService.getRetentionPolicy();

      expect(policy.maxBackupAgeMs).toBe(30 * 24 * 60 * 60 * 1000);
      expect(policy.maxBackups).toBe(10);
      expect(policy.maxArchiveAgeMs).toBe(90 * 24 * 60 * 60 * 1000);
      expect(policy.maxArchivedBackups).toBe(50);
      expect(policy.consentRetentionMs).toBe(365 * 24 * 60 * 60 * 1000);
      expect(policy.exportEnabled).toBe(true);
      expect(policy.deletionEnabled).toBe(true);
    });

    it("updates retention policy", () => {
      gdprService.updateRetentionPolicy({ maxBackupAgeMs: 7 * 24 * 60 * 60 * 1000 });
      const policy = gdprService.getRetentionPolicy();

      expect(policy.maxBackupAgeMs).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("loads retention policy from localStorage", () => {
      localStorage.setItem(
        "dongle_gdpr_retention_policy",
        JSON.stringify({ maxBackupAgeMs: 60 * 24 * 60 * 60 * 1000 }),
      );

      const service = new GDPRService();
      service.loadRetentionPolicy();
      const policy = service.getRetentionPolicy();

      expect(policy.maxBackupAgeMs).toBe(60 * 24 * 60 * 60 * 1000);
    });

    it("cleans expired backups", () => {
      const oldBackup = {
        id: "old-1",
        formType: "project",
        formId: "proj-1",
        data: { name: "Old" },
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
      };
      const newBackup = {
        id: "new-1",
        formType: "project",
        formId: "proj-1",
        data: { name: "New" },
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "dongle_form_backup_project_proj-1",
        JSON.stringify([oldBackup, newBackup]),
      );

      const removed = gdprService.cleanExpiredBackups("project", "proj-1");
      expect(removed).toBe(1);
    });
  });
});
