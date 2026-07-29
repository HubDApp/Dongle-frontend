import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { reviewReportService } from "@/services/review/review-report.service";
import { reviewService } from "@/services/review/review.service";
import { setIdGenerator, resetIdGenerator } from "@/lib/id-generator";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Review Report Service", () => {
  beforeEach(async () => {
    localStorage.clear();
    setIdGenerator(() => "test-id-123");
  });

  afterEach(() => {
    localStorage.clear();
    resetIdGenerator();
  });

  describe("createReport", () => {
    beforeEach(async () => {
      // Seed a review to report
      await reviewService.addReview(
        {
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: "GABC1234",
          rating: 5,
          comment: "This is a great project with excellent features",
        },
        "GABC1234"
      );
    });

    it("should create a report successfully", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      const result = await reviewReportService.createReport(
        {
          reviewId: review.id,
          reason: "spam",
          explanation: "This review looks like spam content",
        },
        "GUSER5678"
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe("pending");
      expect(result.data?.reason).toBe("spam");
      expect(result.data?.reporterAddress).toBe("GUSER5678");
      expect(result.data?.reviewId).toBe(review.id);
    });

    it("should reject report with invalid reason", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      const result = await reviewReportService.createReport(
        {
          reviewId: review.id,
          reason: "invalid-reason",
          explanation: "Some explanation",
        },
        "GUSER5678"
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe("reason");
    });

    it("should reject report with explanation exceeding max length", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      const result = await reviewReportService.createReport(
        {
          reviewId: review.id,
          reason: "abusive",
          explanation: "x".repeat(2001),
        },
        "GUSER5678"
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe("explanation");
    });

    it("should reject self-reporting (review author cannot report own review)", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      const result = await reviewReportService.createReport(
        {
          reviewId: review.id,
          reason: "spam",
          explanation: "This is my own review",
        },
        "GABC1234" // Same as review author
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain("cannot report your own review");
    });

    it("should reject duplicate report from same user on same review", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      // First report
      const result1 = await reviewReportService.createReport(
        {
          reviewId: review.id,
          reason: "spam",
          explanation: "Spam content",
        },
        "GUSER5678"
      );
      expect(result1.success).toBe(true);

      // Second report (duplicate)
      const result2 = await reviewReportService.createReport(
        {
          reviewId: review.id,
          reason: "abusive",
          explanation: "Also abusive",
        },
        "GUSER5678"
      );
      expect(result2.success).toBe(false);
      expect(result2.errors?.[0].message).toContain("already reported");
    });

    it("should allow different users to report the same review", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      const result1 = await reviewReportService.createReport(
        {
          reviewId: review.id,
          reason: "spam",
          explanation: "Spam",
        },
        "GUSER5678"
      );
      expect(result1.success).toBe(true);

      const result2 = await reviewReportService.createReport(
        {
          reviewId: review.id,
          reason: "abusive",
          explanation: "Abusive content",
        },
        "GANOTHER99"
      );
      expect(result2.success).toBe(true);
    });

    it("should reject report for non-existent review", async () => {
      const result = await reviewReportService.createReport(
        {
          reviewId: "nonexistent-review-id",
          reason: "spam",
          explanation: "Spam content",
        },
        "GUSER5678"
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain("not found");
    });
  });

  describe("getReports", () => {
    beforeEach(async () => {
      await reviewService.addReview(
        {
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: "GABC1234",
          rating: 5,
          comment: "This is a great project with excellent features",
        },
        "GABC1234"
      );
    });

    it("should return empty array when no reports exist", async () => {
      const reports = reviewReportService.getReports();
      expect(reports).toEqual([]);
    });

    it("should return all reports", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      await reviewReportService.createReport(
        { reviewId: review.id, reason: "spam", explanation: "Spam" },
        "GUSER5678"
      );
      await reviewReportService.createReport(
        { reviewId: review.id, reason: "abusive", explanation: "Abusive" },
        "GANOTHER99"
      );

      const reports = reviewReportService.getReports();
      expect(reports).toHaveLength(2);
    });

    it("should handle corrupt JSON gracefully", async () => {
      localStorage.setItem("dongle_review_reports", "corrupt json");
      const reports = reviewReportService.getReports();
      expect(reports).toEqual([]);
    });

    it("should handle non-array stored data", async () => {
      localStorage.setItem("dongle_review_reports", JSON.stringify({ notAnArray: true }));
      const reports = reviewReportService.getReports();
      expect(reports).toEqual([]);
    });
  });

  describe("getPendingReports", () => {
    beforeEach(async () => {
      await reviewService.addReview(
        {
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: "GABC1234",
          rating: 5,
          comment: "This is a great project with excellent features",
        },
        "GABC1234"
      );
    });

    it("should return only pending reports", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      await reviewReportService.createReport(
        { reviewId: review.id, reason: "spam", explanation: "Spam" },
        "GUSER5678"
      );

      const reports = reviewReportService.getReports();
      reviewReportService.resolveReport(reports[0].id, "GADMIN000", "Resolved");

      await reviewReportService.createReport(
        { reviewId: review.id, reason: "abusive", explanation: "Abusive" },
        "GANOTHER99"
      );

      const pending = reviewReportService.getPendingReports();
      expect(pending).toHaveLength(1);
      expect(pending[0].reason).toBe("abusive");
    });
  });

  describe("hasUserReportedReview", () => {
    beforeEach(async () => {
      await reviewService.addReview(
        {
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: "GABC1234",
          rating: 5,
          comment: "This is a great project with excellent features",
        },
        "GABC1234"
      );
    });

    it("should return true if user has reported the review", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      await reviewReportService.createReport(
        { reviewId: review.id, reason: "spam", explanation: "Spam" },
        "GUSER5678"
      );

      expect(reviewReportService.hasUserReportedReview(review.id, "GUSER5678")).toBe(true);
    });

    it("should return false if user has not reported the review", async () => {
      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      expect(reviewReportService.hasUserReportedReview(review.id, "GUSER5678")).toBe(false);
    });
  });

  describe("Moderation Actions", () => {
    let reportId: string;

    beforeEach(async () => {
      await reviewService.addReview(
        {
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: "GABC1234",
          rating: 5,
          comment: "This is a great project with excellent features",
        },
        "GABC1234"
      );

      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      const result = await reviewReportService.createReport(
        { reviewId: review.id, reason: "spam", explanation: "Spam content" },
        "GUSER5678"
      );
      reportId = result.data?.id || "";
    });

    describe("resolveReport", () => {
      it("should resolve a pending report", async () => {
        const result = reviewReportService.resolveReport(
          reportId,
          "GADMIN000",
          "Review content complies with guidelines"
        );

        expect(result.success).toBe(true);

        const report = reviewReportService.getReportById(reportId);
        expect(report?.status).toBe("resolved");
      });

      it("should record audit trail on resolve", async () => {
        reviewReportService.resolveReport(reportId, "GADMIN000", "Resolved - no violation");

        const log = reviewReportService.getModerationLogByReport(reportId);
        expect(log).toHaveLength(1);
        expect(log[0].action).toBe("resolved");
        expect(log[0].moderatorAddress).toBe("GADMIN000");
        expect(log[0].reason).toBe("Resolved - no violation");
        expect(log[0].timestamp).toBeDefined();
      });

      it("should reject resolving an already resolved report", async () => {
        reviewReportService.resolveReport(reportId, "GADMIN000", "Resolved");

        const result = reviewReportService.resolveReport(
          reportId,
          "GADMIN000",
          "Try again"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("already been moderated");
      });

      it("should reject resolving a non-existent report", async () => {
        const result = reviewReportService.resolveReport(
          "nonexistent",
          "GADMIN000",
          "Reason"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
      });
    });

    describe("dismissReport", () => {
      it("should dismiss a pending report", async () => {
        const result = reviewReportService.dismissReport(
          reportId,
          "GADMIN000",
          "Report does not violate guidelines"
        );

        expect(result.success).toBe(true);

        const report = reviewReportService.getReportById(reportId);
        expect(report?.status).toBe("dismissed");
      });

      it("should record audit trail on dismiss", async () => {
        reviewReportService.dismissReport(reportId, "GADMIN000", "No violation found");

        const log = reviewReportService.getModerationLogByReport(reportId);
        expect(log).toHaveLength(1);
        expect(log[0].action).toBe("dismissed");
        expect(log[0].moderatorAddress).toBe("GADMIN000");
        expect(log[0].reason).toBe("No violation found");
      });

      it("should reject dismissing an already dismissed report", async () => {
        reviewReportService.dismissReport(reportId, "GADMIN000", "Dismissed");

        const result = reviewReportService.dismissReport(
          reportId,
          "GADMIN000",
          "Try again"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("already been moderated");
      });
    });
  });

  describe("Audit Trail", () => {
    it("should return empty moderation log when no actions taken", async () => {
      const log = reviewReportService.getModerationLog();
      expect(log).toEqual([]);
    });

    it("should return all moderation actions", async () => {
      await reviewService.addReview(
        {
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: "GABC1234",
          rating: 5,
          comment: "This is a great project with excellent features",
        },
        "GABC1234"
      );

      const reviews = await reviewService.getReviews();
      const review = reviews[0];

      const result = await reviewReportService.createReport(
        { reviewId: review.id, reason: "spam", explanation: "Spam" },
        "GUSER5678"
      );
      const reportId = result.data?.id || "";

      reviewReportService.resolveReport(reportId, "GADMIN000", "Resolved");

      const log = reviewReportService.getModerationLog();
      expect(log).toHaveLength(1);
      expect(log[0].reportId).toBe(reportId);
      expect(log[0].moderatorAddress).toBe("GADMIN000");
      expect(log[0].action).toBe("resolved");
    });

    it("should handle corrupt moderation log JSON gracefully", async () => {
      localStorage.setItem("dongle_review_moderation_log", "corrupt json");
      const log = reviewReportService.getModerationLog();
      expect(log).toEqual([]);
    });
  });
});
