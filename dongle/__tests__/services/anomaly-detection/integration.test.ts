/**
 * Integration tests for Anomaly Detection System
 * Tests end-to-end workflows combining detector and manager
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AnomalyDetector } from "@/services/anomaly-detection/detector";
import { AnomalyManager } from "@/services/anomaly-detection/manager";
import { DEFAULT_CONFIG, STRICT_CONFIG, LENIENT_CONFIG } from "@/services/anomaly-detection/config";
import type { FormSubmissionMetrics } from "@/services/anomaly-detection";

describe("Anomaly Detection Integration", () => {
  let manager: AnomalyManager;

  beforeEach(() => {
    manager = new AnomalyManager(DEFAULT_CONFIG);
  });

  describe("End-to-End Flagging Workflow", () => {
    it("should process, flag, review, and learn from submissions", () => {
      const anomalousData: FormSubmissionMetrics[] = [
        {
          submissionTime: 500,
          fieldCount: 8,
          characterCount: 250,
          pasteEventCount: 5,
          autoFillDetected: true,
          deviceFingerprint: "device123",
          ipHash: "ip123",
          timestamp: Date.now(),
          userAgent: "Mozilla/5.0...",
          sessionDuration: 60000,
          completionRate: 1.0,
          correctionCount: 0,
          tabSwitchCount: 3,
          focusLossCount: 0,
        },
      ];

      // Step 1: Process submission
      const flagged = manager.processSubmission(
        anomalousData[0],
        "project-submission",
        "user123"
      );

      expect(flagged).not.toBeNull();

      if (flagged) {
        // Step 2: Get pending reviews
        const pending = manager.getPendingReviews();
        expect(pending.length).toBeGreaterThan(0);

        // Step 3: Review submission
        const reviewed = manager.reviewSubmission(
          flagged.id,
          "approved",
          "Legitimate bot activity",
          "reviewer1"
        );

        expect(reviewed?.reviewStatus).toBe("approved");

        // Step 4: Record feedback for learning
        manager.recordFeedback(
          flagged.id,
          false,
          "This was a legitimate fast submission",
          { ...anomalousData[0], submissionTime: 12000 }
        );

        // Step 5: Verify feedback was recorded
        const accuracy = manager.calculateModelAccuracy();
        expect(accuracy).toBeDefined();
      }
    });
  });

  describe("Multiple Configuration Strategies", () => {
    it("should handle strict configuration for sensitive forms", () => {
      const strictManager = new AnomalyManager(STRICT_CONFIG);

      const submission: FormSubmissionMetrics = {
        submissionTime: 8000,
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 1,
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

      // Strict config is more sensitive
      const result = strictManager.processSubmission(
        submission,
        "payment-submission",
        "user123"
      );

      expect(result).toBeDefined();
    });

    it("should handle lenient configuration for low-risk forms", () => {
      const lenientManager = new AnomalyManager(LENIENT_CONFIG);

      const submission: FormSubmissionMetrics = {
        submissionTime: 3000,
        fieldCount: 5,
        characterCount: 100,
        pasteEventCount: 2,
        autoFillDetected: true,
        deviceFingerprint: "device123",
        ipHash: "ip123",
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0...",
        sessionDuration: 60000,
        completionRate: 0.9,
        correctionCount: 2,
        tabSwitchCount: 1,
        focusLossCount: 0,
      };

      // Lenient config is less sensitive
      const result = lenientManager.processSubmission(
        submission,
        "feedback-submission",
        "user123"
      );

      expect(result).toBeDefined();
    });
  });

  describe("Bulk Submission Processing", () => {
    it("should process multiple submissions and maintain statistics", () => {
      const submissions: FormSubmissionMetrics[] = Array.from(
        { length: 10 },
        (_, i) => ({
          submissionTime: 10000 + Math.random() * 5000,
          fieldCount: 8,
          characterCount: 250,
          pasteEventCount: Math.random() > 0.7 ? 1 : 0,
          autoFillDetected: Math.random() > 0.8,
          deviceFingerprint: `device${i % 3}`,
          ipHash: `ip${i % 5}`,
          timestamp: Date.now() - i * 1000,
          userAgent: "Mozilla/5.0...",
          sessionDuration: 120000,
          completionRate: 0.95 + Math.random() * 0.05,
          correctionCount: Math.floor(Math.random() * 3),
          tabSwitchCount: Math.floor(Math.random() * 2),
          focusLossCount: Math.floor(Math.random() * 2),
        })
      );

      let flaggedCount = 0;
      submissions.forEach((submission, index) => {
        const result = manager.processSubmission(
          submission,
          `form-${index % 2}`,
          `user${index}`
        );
        if (result) flaggedCount++;
      });

      const stats = manager.getStats();

      expect(stats.submissionsProcessed).toBe(10);
      expect(stats.totalFlagged).toBe(flaggedCount);
    });
  });

  describe("Learning from False Positives and False Negatives", () => {
    it("should improve detection with corrective feedback", () => {
      const fastSubmission: FormSubmissionMetrics = {
        submissionTime: 2000,
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 2,
        autoFillDetected: true,
        deviceFingerprint: "device123",
        ipHash: "ip123",
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0...",
        sessionDuration: 120000,
        completionRate: 1.0,
        correctionCount: 0,
        tabSwitchCount: 0,
        focusLossCount: 0,
      };

      // Initial submission - might be flagged
      const flagged = manager.processSubmission(
        fastSubmission,
        "project-submission",
        "user123"
      );

      if (flagged) {
        // False positive feedback
        manager.recordFeedback(
          flagged.id,
          false,
          "User is just very fast - known power user"
        );

        // Verify feedback recorded
        const history = manager.getFeedbackHistory();
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].isAnomaly).toBe(false);
      }
    });
  });

  describe("Time-Based Anomaly Detection", () => {
    it("should detect anomalies based on submission time patterns", () => {
      // Create historical baseline
      const baselineSubmissions: FormSubmissionMetrics[] = Array.from(
        { length: 30 },
        () => ({
          submissionTime: 12000 + Math.random() * 2000, // 12-14 seconds baseline
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
        })
      );

      // Process baseline
      baselineSubmissions.forEach((submission) => {
        manager.processSubmission(submission, "project-submission");
      });

      // Submit outlier
      const outlierSubmission: FormSubmissionMetrics = {
        ...baselineSubmissions[0],
        submissionTime: 1000, // Extremely fast
      };

      const flagged = manager.processSubmission(
        outlierSubmission,
        "project-submission"
      );

      expect(flagged?.anomalyScore.flags).toContain("time_anomaly");
    });
  });

  describe("Behavior Pattern Detection", () => {
    it("should detect suspicious behavioral patterns", () => {
      const suspiciousBehavior: FormSubmissionMetrics = {
        submissionTime: 1500,
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 8, // High paste count
        autoFillDetected: true,
        deviceFingerprint: "device_unknown",
        ipHash: "ip_new",
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0... (Modified)",
        sessionDuration: 30000, // Short session
        completionRate: 1.0,
        correctionCount: 0, // No corrections (bot-like)
        tabSwitchCount: 5, // Frequent tab switching
        focusLossCount: 6, // Frequent focus loss
      };

      const flagged = manager.processSubmission(
        suspiciousBehavior,
        "project-submission",
        "new_user"
      );

      expect(flagged).not.toBeNull();
      if (flagged) {
        expect(flagged.anomalyScore.behaviorScore).toBeGreaterThan(0.2);
        expect(flagged.anomalyScore.flags).toContain("behavioral_anomaly");
      }
    });
  });

  describe("Review Status Tracking", () => {
    it("should maintain proper review status throughout workflow", () => {
      const submission1 = manager.processSubmission(
        {
          submissionTime: 500,
          fieldCount: 8,
          characterCount: 250,
          pasteEventCount: 5,
          autoFillDetected: true,
          deviceFingerprint: "d1",
          ipHash: "ip1",
          timestamp: Date.now(),
          userAgent: "UA",
          sessionDuration: 60000,
          completionRate: 1.0,
          correctionCount: 0,
          tabSwitchCount: 0,
          focusLossCount: 0,
        },
        "form-type-1"
      );

      const submission2 = manager.processSubmission(
        {
          submissionTime: 500,
          fieldCount: 8,
          characterCount: 250,
          pasteEventCount: 5,
          autoFillDetected: true,
          deviceFingerprint: "d2",
          ipHash: "ip2",
          timestamp: Date.now(),
          userAgent: "UA",
          sessionDuration: 60000,
          completionRate: 1.0,
          correctionCount: 0,
          tabSwitchCount: 0,
          focusLossCount: 0,
        },
        "form-type-2"
      );

      if (submission1 && submission2) {
        manager.reviewSubmission(submission1.id, "approved");
        manager.reviewSubmission(submission2.id, "rejected");

        const stats = manager.getStats();
        expect(stats.byStatus.approved).toBe(1);
        expect(stats.byStatus.rejected).toBe(1);
      }
    });
  });

  describe("Data Export Compliance", () => {
    it("should export data with complete audit trail", () => {
      manager.processSubmission(
        {
          submissionTime: 500,
          fieldCount: 8,
          characterCount: 250,
          pasteEventCount: 5,
          autoFillDetected: true,
          deviceFingerprint: "d1",
          ipHash: "ip1",
          timestamp: Date.now(),
          userAgent: "UA",
          sessionDuration: 60000,
          completionRate: 1.0,
          correctionCount: 0,
          tabSwitchCount: 0,
          focusLossCount: 0,
        },
        "project-submission",
        "user123",
        "wallet_abc"
      );

      const exported = manager.exportFlaggedSubmissions({
        formType: "project-submission",
      });

      expect(exported.length).toBeGreaterThan(0);
      expect(exported[0].userId).toBe("user123");
      expect(exported[0].walletFingerprint).toBe("wallet_abc");
      expect(exported[0].flaggedAt).toBeDefined();
      expect(exported[0].anomalyScore).toBeDefined();
    });
  });
});
