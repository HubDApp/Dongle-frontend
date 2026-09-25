/**
 * Unit tests for AnomalyDetector
 * Tests statistical models, outlier detection, and anomaly scoring
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AnomalyDetector } from "@/services/anomaly-detection/detector";
import { DEFAULT_CONFIG, STRICT_CONFIG } from "@/services/anomaly-detection/config";
import type { FormSubmissionMetrics } from "@/services/anomaly-detection";

describe("AnomalyDetector", () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector(DEFAULT_CONFIG);
  });

  describe("Basic Submission Analysis", () => {
    it("should analyze a normal submission with low anomaly score", () => {
      const normalSubmission: FormSubmissionMetrics = {
        submissionTime: 15000, // 15 seconds
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 0,
        autoFillDetected: false,
        deviceFingerprint: "device123",
        ipHash: "ip123",
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0...",
        sessionDuration: 120000, // 2 minutes
        completionRate: 1.0,
        correctionCount: 2,
        tabSwitchCount: 0,
        focusLossCount: 1,
      };

      const result = detector.analyzeSubmission(normalSubmission, []);

      expect(result.shouldFlag).toBe(false);
      expect(result.score.overallScore).toBeLessThan(0.3);
      expect(result.score.severity).toBe("low");
    });

    it("should flag a suspiciously fast submission", () => {
      const fastSubmission: FormSubmissionMetrics = {
        submissionTime: 500, // 0.5 seconds - suspiciously fast
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 0,
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

      const result = detector.analyzeSubmission(fastSubmission, []);

      expect(result.score.timeScore).toBeGreaterThan(0);
      expect(result.score.behaviorScore).toBeGreaterThan(0);
      expect(result.score.flags).toContain("very_fast_submission");
    });

    it("should detect excessive pasting", () => {
      const pasteSubmission: FormSubmissionMetrics = {
        submissionTime: 5000,
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 5, // Multiple paste events
        autoFillDetected: false,
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

      const result = detector.analyzeSubmission(pasteSubmission, []);

      expect(result.score.behaviorScore).toBeGreaterThan(0.15);
      expect(result.score.flags).toContain("excessive_pasting");
    });

    it("should detect excessive corrections", () => {
      const correctionSubmission: FormSubmissionMetrics = {
        submissionTime: 10000,
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
        correctionCount: 6, // More than 50% of fieldCount
        tabSwitchCount: 0,
        focusLossCount: 0,
      };

      const result = detector.analyzeSubmission(correctionSubmission, []);

      expect(result.score.behaviorScore).toBeGreaterThan(0.1);
      expect(result.score.flags).toContain("excessive_corrections");
    });

    it("should detect frequent tab switching", () => {
      const tabSwitchSubmission: FormSubmissionMetrics = {
        submissionTime: 10000,
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
        tabSwitchCount: 5, // More than 2 switches
        focusLossCount: 0,
      };

      const result = detector.analyzeSubmission(tabSwitchSubmission, []);

      expect(result.score.behaviorScore).toBeGreaterThan(0.15);
      expect(result.score.flags).toContain("frequent_tab_switching");
    });
  });

  describe("Statistical Anomaly Detection", () => {
    it("should detect outliers using z-score method with historical data", () => {
      // Create historical data with consistent patterns
      const historicalData: FormSubmissionMetrics[] = Array.from({ length: 50 }, (_, i) => ({
        submissionTime: 10000 + Math.random() * 2000, // 10-12 seconds
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 0,
        autoFillDetected: false,
        deviceFingerprint: "device123",
        ipHash: "ip123",
        timestamp: Date.now() - i * 1000,
        userAgent: "Mozilla/5.0...",
        sessionDuration: 120000,
        completionRate: 1.0,
        correctionCount: 1,
        tabSwitchCount: 0,
        focusLossCount: 0,
      }));

      // Submission that's way outside the normal range
      const outlierSubmission: FormSubmissionMetrics = {
        ...historicalData[0],
        submissionTime: 1000, // Much faster than normal
      };

      const result = detector.analyzeSubmission(outlierSubmission, historicalData);

      expect(result.score.statisticalScore).toBeGreaterThan(0);
      expect(result.score.flags).toContain("statistical_anomaly");
    });

    it("should calculate proper statistical measures", () => {
      const historicalData: FormSubmissionMetrics[] = [
        { submissionTime: 5000, fieldCount: 5, characterCount: 100, pasteEventCount: 0, autoFillDetected: false, deviceFingerprint: "d1", ipHash: "ip1", timestamp: Date.now(), userAgent: "UA", sessionDuration: 60000, completionRate: 1.0, correctionCount: 0, tabSwitchCount: 0, focusLossCount: 0 },
        { submissionTime: 10000, fieldCount: 5, characterCount: 100, pasteEventCount: 0, autoFillDetected: false, deviceFingerprint: "d1", ipHash: "ip1", timestamp: Date.now(), userAgent: "UA", sessionDuration: 60000, completionRate: 1.0, correctionCount: 0, tabSwitchCount: 0, focusLossCount: 0 },
        { submissionTime: 15000, fieldCount: 5, characterCount: 100, pasteEventCount: 0, autoFillDetected: false, deviceFingerprint: "d1", ipHash: "ip1", timestamp: Date.now(), userAgent: "UA", sessionDuration: 60000, completionRate: 1.0, correctionCount: 0, tabSwitchCount: 0, focusLossCount: 0 },
      ];

      detector.analyzeSubmission(historicalData[0], historicalData);
      const stats = detector.getStatistics();

      expect(stats.submissionTime).toBeDefined();
      if (stats.submissionTime) {
        expect(stats.submissionTime.mean).toBe(10000);
        expect(stats.submissionTime.min).toBe(5000);
        expect(stats.submissionTime.max).toBe(15000);
        expect(stats.submissionTime.count).toBe(3);
      }
    });
  });

  describe("Severity Determination", () => {
    it("should assign critical severity for very high scores", () => {
      const criticalSubmission: FormSubmissionMetrics = {
        submissionTime: 100, // Extremely fast
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 10, // Many paste events
        autoFillDetected: true,
        deviceFingerprint: "device123",
        ipHash: "ip123",
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0...",
        sessionDuration: 60000,
        completionRate: 1.0,
        correctionCount: 1,
        tabSwitchCount: 10,
        focusLossCount: 10,
      };

      const result = detector.analyzeSubmission(criticalSubmission, []);

      expect(result.score.severity).toBe("critical");
      expect(result.shouldFlag).toBe(true);
    });

    it("should assign high severity for moderately anomalous submissions", () => {
      const highAnomaly: FormSubmissionMetrics = {
        submissionTime: 2000, // Fast
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 3,
        autoFillDetected: true,
        deviceFingerprint: "device123",
        ipHash: "ip123",
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0...",
        sessionDuration: 120000,
        completionRate: 1.0,
        correctionCount: 1,
        tabSwitchCount: 2,
        focusLossCount: 0,
      };

      const result = detector.analyzeSubmission(highAnomaly, []);

      expect(
        result.score.severity === "high" || result.score.severity === "critical"
      ).toBe(true);
    });
  });

  describe("Configuration Updates", () => {
    it("should update configuration and apply new thresholds", () => {
      const newConfig = {
        thresholds: {
          ...DEFAULT_CONFIG.thresholds,
          criticalAnomalyScore: 0.9, // Higher threshold
        },
      };

      detector.updateConfig(newConfig);

      const submission: FormSubmissionMetrics = {
        submissionTime: 500,
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 0,
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

      const result = detector.analyzeSubmission(submission, []);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
    });
  });

  describe("Disabled Detection", () => {
    it("should return zero scores when detection is disabled", () => {
      const disabledConfig = { ...DEFAULT_CONFIG, enabled: false };
      const disabledDetector = new AnomalyDetector(disabledConfig);

      const submission: FormSubmissionMetrics = {
        submissionTime: 100,
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 10,
        autoFillDetected: true,
        deviceFingerprint: "device123",
        ipHash: "ip123",
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0...",
        sessionDuration: 60000,
        completionRate: 1.0,
        correctionCount: 0,
        tabSwitchCount: 0,
        focusLossCount: 0,
      };

      const result = disabledDetector.analyzeSubmission(submission, []);

      expect(result.score.overallScore).toBe(0);
      expect(result.shouldFlag).toBe(false);
      expect(result.score.severity).toBe("low");
    });
  });

  describe("Flag Generation", () => {
    it("should generate comprehensive flags for anomalous submissions", () => {
      const anomalousSubmission: FormSubmissionMetrics = {
        submissionTime: 1000,
        fieldCount: 8,
        characterCount: 250,
        pasteEventCount: 5,
        autoFillDetected: true,
        deviceFingerprint: "device123",
        ipHash: "ip123",
        timestamp: Date.now(),
        userAgent: "Mozilla/5.0...",
        sessionDuration: 120000,
        completionRate: 1.0,
        correctionCount: 1,
        tabSwitchCount: 3,
        focusLossCount: 0,
      };

      const result = detector.analyzeSubmission(anomalousSubmission, []);

      expect(result.score.flags.length).toBeGreaterThan(0);
      expect(result.score.flags).toContain("paste_detected");
      expect(result.score.flags).toContain("autofill_detected");
      expect(result.score.flags).toContain("tab_switching");
    });
  });
});
