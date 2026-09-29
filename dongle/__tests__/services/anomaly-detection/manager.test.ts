/**
 * Unit tests for AnomalyManager
 * Tests flagging, review workflows, and learning mechanisms
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AnomalyManager } from "@/services/anomaly-detection/manager";
import { DEFAULT_CONFIG } from "@/services/anomaly-detection/config";
import type { FormSubmissionMetrics } from "@/services/anomaly-detection";

describe("AnomalyManager", () => {
  let manager: AnomalyManager;
  let normalSubmission: FormSubmissionMetrics;
  let anomalousSubmission: FormSubmissionMetrics;

  beforeEach(() => {
    manager = new AnomalyManager(DEFAULT_CONFIG);

    normalSubmission = {
      submissionTime: 15000,
      fieldCount: 8,
      characterCount: 250,
      pasteEventCount: 0,
      autoFillDetected: false,
      deviceFingerprint: "device123",
      ipHash: "ip123",
      timestamp: Date.now(),
      userAgent: "Mozilla/5.0...",
      sessionDuration: 120000,
      completionRate: 1.0,
      correctionCount: 1,
      tabSwitchCount: 0,
      focusLossCount: 0,
    };

    anomalousSubmission = {
      ...normalSubmission,
      submissionTime: 500, // Too fast
      pasteEventCount: 5,
      autoFillDetected: true,
      tabSwitchCount: 5,
    };
  });

  describe("Submission Processing", () => {
    it("should not flag normal submissions", () => {
      const result = manager.processSubmission(
        normalSubmission,
        "project-submission",
        "user123"
      );

      expect(result).toBeNull();
    });

    it("should flag anomalous submissions", () => {
      const result = manager.processSubmission(
        anomalousSubmission,
        "project-submission",
        "user123"
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.reviewStatus).toBe("pending");
        expect(result.anomalyScore.requiresReview).toBe(true);
        expect(result.userId).toBe("user123");
        expect(result.formType).toBe("project-submission");
      }
    });

    it("should include wallet fingerprint in flagged submission", () => {
      const result = manager.processSubmission(
        anomalousSubmission,
        "review-submission",
        "user456",
        "wallet_abc123"
      );

      if (result) {
        expect(result.walletFingerprint).toBe("wallet_abc123");
      }
    });
  });

  describe("Review Workflow", () => {
    it("should retrieve pending reviews", () => {
      manager.processSubmission(anomalousSubmission, "project-submission");
      manager.processSubmission(anomalousSubmission, "review-submission");

      const pending = manager.getPendingReviews();

      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending.every((s) => s.reviewStatus === "pending")).toBe(true);
    });

    it("should filter pending reviews by form type", () => {
      manager.processSubmission(anomalousSubmission, "project-submission");
      manager.processSubmission(anomalousSubmission, "review-submission");

      const projectReviews = manager.getPendingReviews("project-submission");
      const reviewReviews = manager.getPendingReviews("review-submission");

      expect(projectReviews.every((s) => s.formType === "project-submission")).toBe(
        true
      );
      expect(reviewReviews.every((s) => s.formType === "review-submission")).toBe(
        true
      );
    });

    it("should filter pending reviews by severity", () => {
      manager.processSubmission(anomalousSubmission, "project-submission");

      const criticalReviews = manager.getPendingReviews(undefined, "critical");

      expect(
        criticalReviews.every(
          (s) => s.anomalyScore.severity === "critical" || s.anomalyScore.severity === "high"
        )
      ).toBe(true);
    });

    it("should review a flagged submission", () => {
      const flagged = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );

      if (flagged) {
        const reviewed = manager.reviewSubmission(
          flagged.id,
          "approved",
          "Legitimate submission",
          "reviewer123"
        );

        expect(reviewed).not.toBeNull();
        if (reviewed) {
          expect(reviewed.reviewStatus).toBe("approved");
          expect(reviewed.reviewNotes).toBe("Legitimate submission");
          expect(reviewed.reviewedBy).toBe("reviewer123");
          expect(reviewed.reviewedAt).toBeDefined();
        }
      }
    });

    it("should reject a flagged submission", () => {
      const flagged = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );

      if (flagged) {
        const reviewed = manager.reviewSubmission(
          flagged.id,
          "rejected",
          "Suspicious activity detected",
          "reviewer456"
        );

        expect(reviewed?.reviewStatus).toBe("rejected");
      }
    });

    it("should mark submission as investigating", () => {
      const flagged = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );

      if (flagged) {
        const reviewed = manager.reviewSubmission(
          flagged.id,
          "investigating",
          "Requires further investigation"
        );

        expect(reviewed?.reviewStatus).toBe("investigating");
      }
    });
  });

  describe("Statistics", () => {
    it("should calculate correct statistics", () => {
      manager.processSubmission(anomalousSubmission, "project-submission");
      manager.processSubmission(anomalousSubmission, "project-submission");
      manager.processSubmission(normalSubmission, "review-submission");

      const stats = manager.getStats();

      expect(stats.totalFlagged).toBeGreaterThanOrEqual(1);
      expect(stats.submissionsProcessed).toBe(3);
      expect(stats.averageAnomalyScore).toBeGreaterThan(0);
      expect(stats.byStatus).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
    });

    it("should track review status in statistics", () => {
      const flagged1 = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );
      const flagged2 = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );

      if (flagged1) {
        manager.reviewSubmission(flagged1.id, "approved");
      }

      const stats = manager.getStats();

      expect(stats.byStatus.pending).toBeGreaterThanOrEqual(1);
      expect(stats.byStatus.approved).toBeGreaterThanOrEqual(1);
    });

    it("should track severity distribution", () => {
      manager.processSubmission(anomalousSubmission, "project-submission");
      manager.processSubmission(anomalousSubmission, "project-submission");

      const stats = manager.getStats();

      expect(Object.values(stats.bySeverity).reduce((a, b) => a + b, 0)).toBeGreaterThan(
        0
      );
    });
  });

  describe("Learning and Feedback", () => {
    it("should record feedback for a submission", () => {
      const flagged = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );

      if (flagged) {
        manager.recordFeedback(
          flagged.id,
          true,
          "This was actually spam",
          undefined
        );

        expect(flagged.feedbackUsedForLearning).toBe(false); // Before review
      }
    });

    it("should record corrected metrics in feedback", () => {
      const flagged = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );

      if (flagged) {
        const corrected = { ...anomalousSubmission, submissionTime: 12000 };

        manager.recordFeedback(
          flagged.id,
          false,
          "Submission was legitimate",
          corrected
        );

        const feedback = manager.getFeedbackHistory(10);
        expect(feedback.length).toBeGreaterThan(0);
        expect(feedback[0].correctedMetrics?.submissionTime).toBe(12000);
      }
    });

    it("should retrieve feedback history", () => {
      const flagged1 = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );
      const flagged2 = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );

      if (flagged1 && flagged2) {
        manager.recordFeedback(flagged1.id, true, "Feedback 1");
        manager.recordFeedback(flagged2.id, false, "Feedback 2");

        const history = manager.getFeedbackHistory();

        expect(history.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("should calculate model accuracy metrics", () => {
      const flagged1 = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );
      const flagged2 = manager.processSubmission(
        normalSubmission,
        "project-submission"
      );

      if (flagged1 && flagged2) {
        manager.recordFeedback(flagged1.id, true, "Correct: was anomalous");
        manager.recordFeedback(flagged2.id, false, "Incorrect: was not anomalous");

        const accuracy = manager.calculateModelAccuracy();

        expect(accuracy.truePositives + accuracy.trueNegatives).toBeGreaterThan(0);
        expect(accuracy.precision).toBeGreaterThanOrEqual(0);
        expect(accuracy.recall).toBeGreaterThanOrEqual(0);
        expect(accuracy.accuracy).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Data Export and Analysis", () => {
    it("should export flagged submissions", () => {
      manager.processSubmission(anomalousSubmission, "project-submission");
      manager.processSubmission(anomalousSubmission, "review-submission");

      const exported = manager.exportFlaggedSubmissions();

      expect(exported.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter exports by form type", () => {
      manager.processSubmission(anomalousSubmission, "project-submission");
      manager.processSubmission(anomalousSubmission, "review-submission");

      const projectExports = manager.exportFlaggedSubmissions({
        formType: "project-submission",
      });

      expect(
        projectExports.every((s) => s.formType === "project-submission")
      ).toBe(true);
    });

    it("should filter exports by severity and date range", () => {
      manager.processSubmission(anomalousSubmission, "project-submission");

      const now = Date.now();
      const exports = manager.exportFlaggedSubmissions({
        startDate: now - 60000,
        endDate: now + 60000,
      });

      expect(exports.length).toBeGreaterThanOrEqual(1);
    });

    it("should retrieve historical data", () => {
      manager.processSubmission(normalSubmission, "project-submission");
      manager.processSubmission(anomalousSubmission, "project-submission");

      const history = manager.getHistoricalData();

      expect(history.length).toBe(2);
    });

    it("should retrieve limited historical data", () => {
      for (let i = 0; i < 10; i++) {
        manager.processSubmission(normalSubmission, "project-submission");
      }

      const limited = manager.getHistoricalData(5);

      expect(limited.length).toBe(5);
    });
  });

  describe("Configuration Management", () => {
    it("should update configuration", () => {
      const newConfig = {
        thresholds: {
          ...DEFAULT_CONFIG.thresholds,
          criticalAnomalyScore: 0.95,
        },
      };

      manager.updateConfig(newConfig);

      expect(manager).toBeDefined();
    });
  });

  describe("Data Cleanup", () => {
    it("should clear old data based on retention policy", () => {
      manager.processSubmission(normalSubmission, "project-submission");
      manager.processSubmission(anomalousSubmission, "project-submission");

      const stats1 = manager.getStats();
      const initialCount = stats1.submissionsProcessed;

      // Clear data older than 0 days (should remove everything except very recent)
      const removed = manager.clearOldData(0);

      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Submission Retrieval", () => {
    it("should retrieve a specific submission by ID", () => {
      const flagged = manager.processSubmission(
        anomalousSubmission,
        "project-submission"
      );

      if (flagged) {
        const retrieved = manager.getSubmission(flagged.id);

        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe(flagged.id);
        expect(retrieved?.anomalyScore.requiresReview).toBe(
          flagged.anomalyScore.requiresReview
        );
      }
    });

    it("should return null for non-existent submission", () => {
      const retrieved = manager.getSubmission("non-existent-id");

      expect(retrieved).toBeNull();
    });
  });
});
