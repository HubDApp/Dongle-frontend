import { describe, it, expect, beforeEach, vi } from "vitest";
import { verificationService } from "@/services/stellar/verification.service";

// Mock localStorage
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage["dongle_verification_requests"] = JSON.stringify([]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    },
  });
});

describe("Verification Service - Persistent Request Management", () => {
  describe("Submit Verification Request", () => {
    it("submits a new verification request successfully", async () => {
      const requestId = await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      expect(requestId).toMatch(/^ver-/);
      expect(requestId).toContain("proj-1");
    });

    it("persists request with correct initial status", async () => {
      const requestId = await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      const request = await verificationService.getVerificationRequest("proj-1");
      
      expect(request).toBeDefined();
      expect(request?.id).toBe(requestId);
      expect(request?.projectId).toBe("proj-1");
      expect(request?.status).toBe("PENDING");
    });

    it("prevents duplicate pending requests", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      await expect(
        verificationService.submitVerificationRequest(
          "proj-1",
          "Test Project",
          "GDEF...XYZ",
        )
      ).rejects.toThrow("already pending");
    });

    it("allows resubmission after rejection", async () => {
      // First submission
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      // Admin rejects
      await verificationService.rejectRequest("proj-1", "admin", "Not ready");

      // Reset verification
      await verificationService.resetVerification("proj-1");

      // Second submission should work
      const requestId = await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      expect(requestId).toBeDefined();
    });

    it("stores submission metadata correctly", async () => {
      const submittedBy = "GABC...XYZ";
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        submittedBy,
      );

      const request = await verificationService.getVerificationRequest("proj-1");
      
      expect(request?.submittedBy).toBe(submittedBy);
      expect(request?.submittedAt).toBeDefined();
      expect(new Date(request!.submittedAt)).toBeInstanceOf(Date);
    });
  });

  describe("Get Verification Status", () => {
    it("returns NONE for projects with no request", async () => {
      const status = await verificationService.getVerificationStatus("unknown-proj");
      
      expect(status).toBe("NONE");
    });

    it("returns PENDING for submitted requests", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      const status = await verificationService.getVerificationStatus("proj-1");
      
      expect(status).toBe("PENDING");
    });

    it("returns VERIFIED after approval", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      await verificationService.approveRequest("proj-1", "admin");

      const status = await verificationService.getVerificationStatus("proj-1");
      
      expect(status).toBe("VERIFIED");
    });

    it("returns REJECTED after rejection", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      await verificationService.rejectRequest("proj-1", "admin", "Reason");

      const status = await verificationService.getVerificationStatus("proj-1");
      
      expect(status).toBe("REJECTED");
    });
  });

  describe("Admin Approval Flow", () => {
    it("admin can approve a pending request", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      const updated = await verificationService.approveRequest("proj-1", "admin-wallet");

      expect(updated.status).toBe("VERIFIED");
      expect(updated.statusUpdatedBy).toBe("admin-wallet");
      expect(updated.statusUpdatedAt).toBeDefined();
    });

    it("approves with correct timestamp", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      const before = new Date();
      await verificationService.approveRequest("proj-1", "admin");
      const after = new Date();

      const request = await verificationService.getVerificationRequest("proj-1");
      const updateTime = new Date(request!.statusUpdatedAt);

      expect(updateTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updateTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("prevents approval of non-pending requests", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      await verificationService.approveRequest("proj-1", "admin");

      await expect(
        verificationService.approveRequest("proj-1", "admin")
      ).rejects.toThrow("Cannot approve");
    });

    it("clears rejection reason on approval", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      await verificationService.rejectRequest("proj-1", "admin", "Invalid");
      await verificationService.resetVerification("proj-1");
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );
      await verificationService.approveRequest("proj-1", "admin");

      const request = await verificationService.getVerificationRequest("proj-1");
      expect(request?.rejectionReason).toBeUndefined();
    });
  });

  describe("Admin Rejection Flow", () => {
    it("admin can reject a pending request", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      const updated = await verificationService.rejectRequest(
        "proj-1",
        "admin-wallet",
        "Does not meet standards",
      );

      expect(updated.status).toBe("REJECTED");
      expect(updated.statusUpdatedBy).toBe("admin-wallet");
      expect(updated.rejectionReason).toBe("Does not meet standards");
    });

    it("stores rejection reason", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      const reason = "Code quality issues detected";
      await verificationService.rejectRequest("proj-1", "admin", reason);

      const request = await verificationService.getVerificationRequest("proj-1");
      expect(request?.rejectionReason).toBe(reason);
    });

    it("prevents rejection of non-pending requests", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      await verificationService.rejectRequest("proj-1", "admin", "Reason");

      await expect(
        verificationService.rejectRequest("proj-1", "admin", "Another reason")
      ).rejects.toThrow("Cannot reject");
    });
  });

  describe("Reset Verification", () => {
    it("resets verification status to allow resubmission", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      await verificationService.rejectRequest("proj-1", "admin", "Try again");
      await verificationService.resetVerification("proj-1");

      const status = await verificationService.getVerificationStatus("proj-1");
      expect(status).toBe("NONE");
    });

    it("allows new request after reset", async () => {
      await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      await verificationService.resetVerification("proj-1");

      const newRequestId = await verificationService.submitVerificationRequest(
        "proj-1",
        "Test Project",
        "GABC...XYZ",
      );

      expect(newRequestId).toBeDefined();
    });
  });

  describe("Get Pending Requests", () => {
    it("returns all pending requests", async () => {
      await verificationService.submitVerificationRequest("proj-1", "Project 1", "GABC...XYZ");
      await verificationService.submitVerificationRequest("proj-2", "Project 2", "GDEF...XYZ");
      await verificationService.submitVerificationRequest("proj-3", "Project 3", "GHIJ...XYZ");

      const pending = await verificationService.getPendingRequests();

      expect(pending.length).toBe(3);
      expect(pending.every((r) => r.status === "PENDING")).toBe(true);
    });

    it("excludes approved and rejected requests", async () => {
      await verificationService.submitVerificationRequest("proj-1", "Project 1", "GABC...XYZ");
      await verificationService.submitVerificationRequest("proj-2", "Project 2", "GDEF...XYZ");
      await verificationService.submitVerificationRequest("proj-3", "Project 3", "GHIJ...XYZ");

      await verificationService.approveRequest("proj-1", "admin");
      await verificationService.rejectRequest("proj-2", "admin", "Reason");

      const pending = await verificationService.getPendingRequests();

      expect(pending.length).toBe(1);
      expect(pending[0].projectId).toBe("proj-3");
    });

    it("sorts by submission date (newest first)", async () => {
      await verificationService.submitVerificationRequest("proj-1", "Project 1", "GABC...XYZ");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await verificationService.submitVerificationRequest("proj-2", "Project 2", "GDEF...XYZ");

      const pending = await verificationService.getPendingRequests();

      expect(pending[0].projectId).toBe("proj-2"); // Newest first
      expect(pending[1].projectId).toBe("proj-1"); // Oldest last
    });
  });

  describe("Statistics", () => {
    it("calculates correct statistics", async () => {
      await verificationService.submitVerificationRequest("proj-1", "Project 1", "GABC...XYZ");
      await verificationService.submitVerificationRequest("proj-2", "Project 2", "GDEF...XYZ");
      await verificationService.submitVerificationRequest("proj-3", "Project 3", "GHIJ...XYZ");

      await verificationService.approveRequest("proj-1", "admin");
      await verificationService.rejectRequest("proj-2", "admin", "Reason");

      const stats = await verificationService.getStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.verified).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });

  describe("Request Status Distinction", () => {
    it("distinguishes between no request and unknown project", async () => {
      // Project with no request
      const result1 = await verificationService.getRequestStatus("proj-no-request");
      expect(result1.projectExists).toBe(true);
      expect(result1.requestExists).toBe(false);
      expect(result1.request).toBeNull();

      // Project with request
      await verificationService.submitVerificationRequest("proj-1", "Project 1", "GABC...XYZ");
      const result2 = await verificationService.getRequestStatus("proj-1");
      expect(result2.projectExists).toBe(true);
      expect(result2.requestExists).toBe(true);
      expect(result2.request).not.toBeNull();
    });
  });

  describe("Persistence", () => {
    it("persists requests across multiple calls", async () => {
      const requestId1 = await verificationService.submitVerificationRequest(
        "proj-1",
        "Project 1",
        "GABC...XYZ",
      );

      // Simulate new service instance
      const request1 = await verificationService.getVerificationRequest("proj-1");

      expect(request1?.id).toBe(requestId1);
      expect(request1?.status).toBe("PENDING");
    });

    it("maintains request history", async () => {
      await verificationService.submitVerificationRequest("proj-1", "Project 1", "GABC...XYZ");
      await verificationService.submitVerificationRequest("proj-2", "Project 2", "GDEF...XYZ");

      const pending = await verificationService.getPendingRequests();

      expect(pending.length).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("handles missing requests gracefully", async () => {
      const request = await verificationService.getVerificationRequest("nonexistent");
      
      expect(request).toBeNull();
    });

    it("handles approval of nonexistent request gracefully", async () => {
      await expect(
        verificationService.approveRequest("nonexistent", "admin")
      ).rejects.toThrow("not found");
    });

    it("handles rejection of nonexistent request gracefully", async () => {
      await expect(
        verificationService.rejectRequest("nonexistent", "admin", "Reason")
      ).rejects.toThrow("not found");
    });
  });
});
