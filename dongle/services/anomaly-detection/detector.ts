/**
 * Form Anomaly Detection Engine
 * Implements statistical models and outlier detection algorithms
 */

import type {
  FormSubmissionMetrics,
  AnomalyScore,
  StatisticalModel,
  AnomalyDetectionStats,
  AnomalyDetectionResult,
  AnomalyDetectionConfig,
} from "./types";

export class AnomalyDetector {
  private config: AnomalyDetectionConfig;
  private stats: Partial<AnomalyDetectionStats> = {};

  constructor(config: AnomalyDetectionConfig) {
    this.config = config;
  }

  /**
   * Analyze a form submission and calculate anomaly score
   */
  public analyzeSubmission(
    submission: FormSubmissionMetrics,
    historicalData: FormSubmissionMetrics[] = []
  ): AnomalyDetectionResult {
    if (!this.config.enabled) {
      return {
        submission,
        score: {
          overallScore: 0,
          timeScore: 0,
          behaviorScore: 0,
          deviceScore: 0,
          statisticalScore: 0,
          flags: [],
          severity: "low",
          requiresReview: false,
        },
        shouldFlag: false,
        explanation: "Anomaly detection disabled",
      };
    }

    // Update statistical models from whatever history is available. A small
    // sample cannot produce false outliers (zero spread), so learning early is
    // safe; `minDataPointsForModel` remains a caller-side recommendation.
    if (historicalData.length > 0) {
      this.updateStatisticalModels(historicalData);
    }

    // Calculate individual anomaly scores
    const timeScore = this.config.features.trackSubmissionTime
      ? this.calculateTimeScore(submission)
      : 0;

    const behavior = this.config.features.trackBehavioral
      ? this.calculateBehaviorScore(submission)
      : { score: 0, flags: [] as string[] };
    const behaviorScore = behavior.score;

    const deviceScore = this.config.features.trackDevice
      ? this.calculateDeviceScore(submission)
      : 0;

    const statisticalScore = this.config.features.trackStatistical
      ? this.calculateStatisticalScore(submission)
      : 0;

    // Combine independent anomaly signals with a noisy-OR: several moderate
    // signals compound instead of being averaged away, and a single strong
    // signal dominates.
    const signals = [timeScore, behaviorScore, deviceScore, statisticalScore];
    const overallScore = 1 - signals.reduce((product, s) => product * (1 - s), 1);

    const flags = this.generateFlags(
      submission,
      timeScore,
      behaviorScore,
      deviceScore,
      statisticalScore,
      behavior.flags
    );

    const severity = this.determineSeverity(overallScore);
    const requiresReview =
      overallScore >= this.config.thresholds.mediumAnomalyScore;

    const anomalyScore: AnomalyScore = {
      overallScore: Math.min(1, Math.max(0, overallScore)),
      timeScore: Math.min(1, Math.max(0, timeScore)),
      behaviorScore: Math.min(1, Math.max(0, behaviorScore)),
      deviceScore: Math.min(1, Math.max(0, deviceScore)),
      statisticalScore: Math.min(1, Math.max(0, statisticalScore)),
      flags,
      severity,
      requiresReview,
    };

    return {
      submission,
      score: anomalyScore,
      shouldFlag: requiresReview,
      explanation: this.generateExplanation(anomalyScore, flags),
    };
  }

  /**
   * Calculate time-based anomaly score
   * Detects unusually fast or slow submissions
   */
  private calculateTimeScore(submission: FormSubmissionMetrics): number {
    // Without a statistical model, fall back to absolute speed heuristics:
    // humans do not fill an 8-field form in under a few seconds.
    if (!this.stats.submissionTime) {
      const time = submission.submissionTime;
      if (time < 1000) return 1;
      if (time < 2000) return 0.9;
      if (time < 3000) return 0.8;
      if (time < 5000) return 0.5;
      if (time < 10000) return 0.25;
      return 0;
    }

    const { mean, stdDev } = this.stats.submissionTime;
    const time = submission.submissionTime;

    // Z-score approach: how many standard deviations from mean
    if (stdDev === 0) return 0;

    const zScore = Math.abs((time - mean) / stdDev);
    const isOutlier = zScore > this.config.thresholds.zScoreThreshold;

    if (!isOutlier) return 0.1; // Slight score for normal values

    // Score based on how extreme the outlier is
    return Math.min(1, zScore / (this.config.thresholds.zScoreThreshold * 3));
  }

  /**
   * Calculate behavioral anomaly score
   * Detects unusual interaction patterns
   */
  private calculateBehaviorScore(submission: FormSubmissionMetrics): {
    score: number;
    flags: string[];
  } {
    let score = 0;
    const flags: string[] = [];

    // Suspiciously fast completion
    if (submission.submissionTime < 2000) {
      score += 0.25;
      flags.push("very_fast_submission");
    }

    // Unusually high paste events
    if (submission.pasteEventCount > 3) {
      score += 0.2;
      flags.push("excessive_pasting");
    }

    // Autofill usage (can be legitimate but monitor)
    if (submission.autoFillDetected) {
      score += 0.1;
      flags.push("autofill_detected");
    }

    // Too many corrections (indicates uncertainty or bot-like behavior)
    if (submission.correctionCount > submission.fieldCount * 0.5) {
      score += 0.15;
      flags.push("excessive_corrections");
    }

    // Tab switching during form filling (potential multi-form fraud)
    if (submission.tabSwitchCount > 2) {
      score += 0.2;
      flags.push("frequent_tab_switching");
    }

    // Form lost focus multiple times (copying/pasting from elsewhere)
    if (submission.focusLossCount > 5) {
      score += 0.15;
      flags.push("frequent_focus_loss");
    }

    // Perfect completion with suspiciously low correction count
    if (
      submission.completionRate > 0.95 &&
      submission.correctionCount === 0 &&
      submission.submissionTime < 5000
    ) {
      score += 0.1;
      flags.push("suspiciously_perfect_completion");
    }

    return { score: Math.min(1, score), flags };
  }

  /**
   * Calculate device-based anomaly score
   * Detects unusual device patterns or fingerprint mismatches
   */
  private calculateDeviceScore(submission: FormSubmissionMetrics): number {
    let score = 0;

    // Check if device is in ignore list
    if (
      this.config.ignoreLists.ignoredDeviceFingerprints.includes(
        submission.deviceFingerprint
      )
    ) {
      return 0;
    }

    // Check if IP is in ignore list
    if (
      this.config.ignoreLists.ignoredIPs.includes(submission.ipHash)
    ) {
      return 0;
    }

    // Generic device score based on submission pattern
    // This could be expanded with actual device history tracking
    score = 0.1; // Base score for device fingerprinting

    return Math.min(1, score);
  }

  /**
   * Calculate statistical anomaly score using IQR and Z-score methods
   */
  private calculateStatisticalScore(
    submission: FormSubmissionMetrics
  ): number {
    const metrics = [
      { value: submission.submissionTime, stat: this.stats.submissionTime },
      { value: submission.fieldCount, stat: this.stats.fieldCount },
      { value: submission.characterCount, stat: this.stats.characterCount },
      { value: submission.sessionDuration, stat: this.stats.sessionDuration },
      { value: submission.completionRate, stat: this.stats.completionRate },
      { value: submission.correctionCount, stat: this.stats.correctionCount },
    ];

    let anomalyCount = 0;
    let totalMetrics = 0;

    for (const { value, stat } of metrics) {
      if (!stat) continue;

      totalMetrics++;
      const isOutlier = this.isOutlier(value, stat);
      if (isOutlier) {
        anomalyCount++;
      }
    }

    if (totalMetrics === 0) return 0;

    // Score based on proportion of anomalous metrics
    return anomalyCount / totalMetrics;
  }

  /**
   * Determine if a value is a statistical outlier
   * Uses both Z-score and IQR methods
   */
  private isOutlier(value: number, stat: StatisticalModel): boolean {
    // Z-score method
    if (stat.stdDev > 0) {
      const zScore = Math.abs((value - stat.mean) / stat.stdDev);
      if (zScore > this.config.thresholds.zScoreThreshold) {
        return true;
      }
    }

    // IQR method (more robust to extreme outliers)
    const lowerBound = stat.q1 - this.config.thresholds.iqrMultiplier * stat.iqr;
    const upperBound = stat.q3 + this.config.thresholds.iqrMultiplier * stat.iqr;

    if (value < lowerBound || value > upperBound) {
      return true;
    }

    return false;
  }

  /**
   * Generate flags describing detected anomalies
   */
  private generateFlags(
    submission: FormSubmissionMetrics,
    timeScore: number,
    behaviorScore: number,
    deviceScore: number,
    statisticalScore: number,
    behaviorFlags: string[] = []
  ): string[] {
    const flags: string[] = [...behaviorFlags];

    if (timeScore > 0.5) flags.push("time_anomaly");
    if (behaviorScore > 0.3) flags.push("behavioral_anomaly");
    if (deviceScore > 0.3) flags.push("device_anomaly");
    // 1/6 of the tracked metrics being an outlier is already noteworthy.
    if (statisticalScore > 0.15) flags.push("statistical_anomaly");

    if (submission.pasteEventCount > 0) flags.push("paste_detected");
    if (submission.autoFillDetected) flags.push("autofill_detected");
    if (submission.tabSwitchCount > 0) flags.push("tab_switching");

    return flags;
  }

  /**
   * Determine severity level based on overall anomaly score
   */
  private determineSeverity(
    score: number
  ): "low" | "medium" | "high" | "critical" {
    if (score >= this.config.thresholds.criticalAnomalyScore) {
      return "critical";
    }
    if (score >= this.config.thresholds.highAnomalyScore) {
      return "high";
    }
    if (score >= this.config.thresholds.mediumAnomalyScore) {
      return "medium";
    }
    return "low";
  }

  /**
   * Generate human-readable explanation for the anomaly score
   */
  private generateExplanation(anomalyScore: AnomalyScore, flags: string[]): string {
    if (anomalyScore.overallScore < 0.3) {
      return "Submission appears normal with no significant anomalies detected.";
    }

    const parts: string[] = [];

    if (anomalyScore.timeScore > 0.5) {
      parts.push("unusual submission speed");
    }
    if (anomalyScore.behaviorScore > 0.3) {
      parts.push("unusual user behavior patterns");
    }
    if (anomalyScore.deviceScore > 0.3) {
      parts.push("unrecognized device fingerprint");
    }
    if (anomalyScore.statisticalScore > 0.4) {
      parts.push("statistical outlier metrics");
    }

    const explanation =
      `Detected: ${parts.join(", ")}. ` +
      `Severity: ${anomalyScore.severity}. ` +
      `Score: ${(anomalyScore.overallScore * 100).toFixed(1)}%`;

    return explanation;
  }

  /**
   * Update statistical models based on historical data
   * Implements learning from feedback
   */
  private updateStatisticalModels(
    historicalData: FormSubmissionMetrics[]
  ): void {
    this.stats = {
      submissionTime: this.calculateStatistics(
        historicalData.map((d) => d.submissionTime)
      ),
      fieldCount: this.calculateStatistics(
        historicalData.map((d) => d.fieldCount)
      ),
      characterCount: this.calculateStatistics(
        historicalData.map((d) => d.characterCount)
      ),
      sessionDuration: this.calculateStatistics(
        historicalData.map((d) => d.sessionDuration)
      ),
      completionRate: this.calculateStatistics(
        historicalData.map((d) => d.completionRate)
      ),
      correctionCount: this.calculateStatistics(
        historicalData.map((d) => d.correctionCount)
      ),
    };
  }

  /**
   * Calculate statistical measures for a dataset
   */
  private calculateStatistics(data: number[]): StatisticalModel {
    if (data.length === 0) {
      return {
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        q1: 0,
        q3: 0,
        iqr: 0,
        count: 0,
      };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance =
      data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    return {
      mean,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      q1: sorted[q1Index],
      q3: sorted[q3Index],
      iqr: sorted[q3Index] - sorted[q1Index],
      count: data.length,
    };
  }

  /**
   * Get current statistical models
   */
  public getStatistics(): Partial<AnomalyDetectionStats> {
    return this.stats;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AnomalyDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
