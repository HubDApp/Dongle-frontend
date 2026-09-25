/**
 * Anomaly Management Service
 * Handles flagging, storing, and learning from form submission anomalies
 */

import type {
  FlaggedSubmission,
  FormSubmissionMetrics,
  AnomalyScore,
  LearningFeedback,
  AnomalyDetectionConfig,
} from "./types";
import { AnomalyDetector } from "./detector";
import { DEFAULT_CONFIG } from "./config";

export class AnomalyManager {
  private detector: AnomalyDetector;
  private flaggedSubmissions: Map<string, FlaggedSubmission> = new Map();
  private learningFeedback: LearningFeedback[] = [];
  private config: AnomalyDetectionConfig;
  private historicalData: FormSubmissionMetrics[] = [];
  private lastModelUpdate: number = Date.now();

  constructor(config: AnomalyDetectionConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.detector = new AnomalyDetector(config);
  }

  /**
   * Process a form submission and flag if anomalous
   */
  public processSubmission(
    submission: FormSubmissionMetrics,
    formType: string,
    userId?: string,
    walletFingerprint?: string
  ): FlaggedSubmission | null {
    // Add to historical data for learning
    this.historicalData.push(submission);

    // Update statistical models if needed
    this.updateModelsIfNeeded();

    // Analyze submission
    const result = this.detector.analyzeSubmission(
      submission,
      this.historicalData
    );

    // Store all submissions in history (for learning)
    // Only flag if score is above threshold
    if (result.shouldFlag) {
      const flagId = this.generateFlagId();
      const flaggedSubmission: FlaggedSubmission = {
        id: flagId,
        metrics: submission,
        anomalyScore: result.score,
        formType,
        userId,
        walletFingerprint,
        flaggedAt: Date.now(),
        reviewStatus: "pending",
        feedbackUsedForLearning: false,
      };

      this.flaggedSubmissions.set(flagId, flaggedSubmission);
      return flaggedSubmission;
    }

    return null;
  }

  /**
   * Get all flagged submissions pending review
   */
  public getPendingReviews(
    formType?: string,
    severity?: string,
    limit: number = 50
  ): FlaggedSubmission[] {
    let submissions = Array.from(this.flaggedSubmissions.values()).filter(
      (s) => s.reviewStatus === "pending"
    );

    if (formType) {
      submissions = submissions.filter((s) => s.formType === formType);
    }

    if (severity) {
      submissions = submissions.filter((s) => s.anomalyScore.severity === severity);
    }

    // Sort by anomaly score (highest first) and timestamp
    submissions.sort((a, b) => {
      const scoreDiff = b.anomalyScore.overallScore - a.anomalyScore.overallScore;
      if (scoreDiff !== 0) return scoreDiff;
      return b.flaggedAt - a.flaggedAt;
    });

    return submissions.slice(0, limit);
  }

  /**
   * Get statistics about flagged submissions
   */
  public getStats(): {
    totalFlagged: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    averageAnomalyScore: number;
    submissionsProcessed: number;
  } {
    const submissions = Array.from(this.flaggedSubmissions.values());

    const byStatus: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      investigating: 0,
    };

    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalScore = 0;

    submissions.forEach((s) => {
      byStatus[s.reviewStatus]++;
      bySeverity[s.anomalyScore.severity]++;
      totalScore += s.anomalyScore.overallScore;
    });

    return {
      totalFlagged: submissions.length,
      byStatus,
      bySeverity,
      averageAnomalyScore:
        submissions.length > 0 ? totalScore / submissions.length : 0,
      submissionsProcessed: this.historicalData.length,
    };
  }

  /**
   * Review a flagged submission
   */
  public reviewSubmission(
    flagId: string,
    status: "approved" | "rejected" | "investigating",
    reviewNotes?: string,
    reviewedBy?: string,
    isAnomaly?: boolean
  ): FlaggedSubmission | null {
    const submission = this.flaggedSubmissions.get(flagId);
    if (!submission) return null;

    submission.reviewStatus = status;
    submission.reviewedAt = Date.now();
    submission.reviewedBy = reviewedBy;
    submission.reviewNotes = reviewNotes;

    // Record feedback for learning
    if (isAnomaly !== undefined) {
      this.recordFeedback(flagId, isAnomaly, reviewNotes || "");
    }

    this.flaggedSubmissions.set(flagId, submission);
    return submission;
  }

  /**
   * Record human feedback for model learning
   */
  public recordFeedback(
    submissionId: string,
    isAnomaly: boolean,
    feedback: string,
    correctedMetrics?: Partial<FormSubmissionMetrics>
  ): void {
    const learningEntry: LearningFeedback = {
      submissionId,
      isAnomaly,
      feedback,
      correctedMetrics,
      timestamp: Date.now(),
    };

    this.learningFeedback.push(learningEntry);

    const submission = this.flaggedSubmissions.get(submissionId);
    if (submission) {
      submission.feedbackUsedForLearning = true;
      this.flaggedSubmissions.set(submissionId, submission);
    }

    // Optionally retrain model with new feedback
    this.updateModelsIfNeeded(true);
  }

  /**
   * Get a flagged submission by ID
   */
  public getSubmission(flagId: string): FlaggedSubmission | null {
    return this.flaggedSubmissions.get(flagId) || null;
  }

  /**
   * Get feedback history for analysis
   */
  public getFeedbackHistory(limit: number = 100): LearningFeedback[] {
    return this.learningFeedback.slice(-limit);
  }

  /**
   * Calculate model accuracy based on feedback
   */
  public calculateModelAccuracy(): {
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    accuracy: number;
  } {
    let tp = 0; // Flagged as anomaly, confirmed anomaly
    let tn = 0; // Not flagged, confirmed normal
    let fp = 0; // Flagged as anomaly, confirmed normal
    let fn = 0; // Not flagged, confirmed anomaly

    this.learningFeedback.forEach((feedback) => {
      const submission = this.flaggedSubmissions.get(feedback.submissionId);
      if (!submission) return;

      const wasFlagged = submission.anomalyScore.requiresReview;
      const isAnomaly = feedback.isAnomaly;

      if (wasFlagged && isAnomaly) tp++;
      else if (!wasFlagged && !isAnomaly) tn++;
      else if (wasFlagged && !isAnomaly) fp++;
      else if (!wasFlagged && isAnomaly) fn++;
    });

    const total = tp + tn + fp + fn;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const accuracy = total > 0 ? (tp + tn) / total : 0;

    return {
      truePositives: tp,
      trueNegatives: tn,
      falsePositives: fp,
      falseNegatives: fn,
      precision,
      recall,
      accuracy,
    };
  }

  /**
   * Export flagged submissions for external analysis
   */
  public exportFlaggedSubmissions(
    filters?: {
      formType?: string;
      severity?: string;
      reviewStatus?: string;
      startDate?: number;
      endDate?: number;
    }
  ): FlaggedSubmission[] {
    let submissions = Array.from(this.flaggedSubmissions.values());

    if (filters?.formType) {
      submissions = submissions.filter((s) => s.formType === filters.formType);
    }
    if (filters?.severity) {
      submissions = submissions.filter(
        (s) => s.anomalyScore.severity === filters.severity
      );
    }
    if (filters?.reviewStatus) {
      submissions = submissions.filter((s) => s.reviewStatus === filters.reviewStatus);
    }
    if (filters?.startDate) {
      submissions = submissions.filter((s) => s.flaggedAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      submissions = submissions.filter((s) => s.flaggedAt <= filters.endDate!);
    }

    return submissions;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AnomalyDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.detector.updateConfig(this.config);
  }

  /**
   * Update statistical models if needed
   */
  private updateModelsIfNeeded(forceUpdate: boolean = false): void {
    const now = Date.now();
    const hoursSinceUpdate = (now - this.lastModelUpdate) / (1000 * 60 * 60);

    if (
      forceUpdate ||
      hoursSinceUpdate >= this.config.learningConfig.modelUpdateFrequency
    ) {
      this.detector["updateStatisticalModels"](this.historicalData);
      this.lastModelUpdate = now;
    }
  }

  /**
   * Generate unique flag ID
   */
  private generateFlagId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get historical submission data for analysis
   */
  public getHistoricalData(limit?: number): FormSubmissionMetrics[] {
    if (limit) {
      return this.historicalData.slice(-limit);
    }
    return this.historicalData;
  }

  /**
   * Clear old data (implement data retention policy)
   */
  public clearOldData(daysToKeep: number = 90): number {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const initialCount = this.historicalData.length;

    this.historicalData = this.historicalData.filter(
      (d) => d.timestamp > cutoffTime
    );

    // Also clear old flagged submissions
    const flagsToDelete: string[] = [];
    this.flaggedSubmissions.forEach((submission, flagId) => {
      if (submission.flaggedAt < cutoffTime) {
        flagsToDelete.push(flagId);
      }
    });

    flagsToDelete.forEach((flagId) => {
      this.flaggedSubmissions.delete(flagId);
    });

    return initialCount - this.historicalData.length;
  }
}
