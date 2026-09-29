/**
 * Anomaly Detection Types
 * Defines data structures for form submission analysis and outlier detection
 */

export interface FormSubmissionMetrics {
  submissionTime: number; // Milliseconds to submit form
  fieldCount: number; // Number of fields filled
  characterCount: number; // Total characters entered
  pasteEventCount: number; // Number of paste events detected
  autoFillDetected: boolean; // Whether autofill was used
  deviceFingerprint: string; // Hashed device identifier
  ipHash: string; // Hashed IP address
  timestamp: number; // Unix timestamp of submission
  userAgent: string; // Browser user agent
  sessionDuration: number; // Duration in session before submission
  completionRate: number; // Percentage of fields completed
  correctionCount: number; // Number of field corrections/edits
  tabSwitchCount: number; // Number of tab switches during filling
  focusLossCount: number; // Number of times form lost focus
}

export interface AnomalyScore {
  overallScore: number; // 0-1 scale, higher = more anomalous
  timeScore: number; // Unusual submission speed
  behaviorScore: number; // Unusual behavioral patterns
  deviceScore: number; // Device fingerprint mismatch
  statisticalScore: number; // Statistical outlier score
  flags: string[]; // List of specific anomalies detected
  severity: "low" | "medium" | "high" | "critical";
  requiresReview: boolean;
}

export interface StatisticalModel {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number; // First quartile
  q3: number; // Third quartile
  iqr: number; // Interquartile range
  count: number; // Number of data points
}

export interface AnomalyDetectionStats {
  submissionTime: StatisticalModel;
  fieldCount: StatisticalModel;
  characterCount: StatisticalModel;
  sessionDuration: StatisticalModel;
  completionRate: StatisticalModel;
  correctionCount: StatisticalModel;
}

export interface FlaggedSubmission {
  id: string;
  metrics: FormSubmissionMetrics;
  anomalyScore: AnomalyScore;
  formType: string; // e.g., "project-submission", "review-submission"
  userId?: string;
  walletFingerprint?: string;
  flaggedAt: number;
  reviewStatus: "pending" | "approved" | "rejected" | "investigating";
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
  feedbackUsedForLearning: boolean;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  thresholds: {
    criticalAnomalyScore: number; // 0.85-1.0
    highAnomalyScore: number; // 0.70-0.84
    mediumAnomalyScore: number; // 0.50-0.69
    lowAnomalyScore: number; // 0.30-0.49
    zScoreThreshold: number; // Standard deviations for outlier (default: 2.5)
    iqrMultiplier: number; // IQR multiplier for outliers (default: 1.5)
  };
  features: {
    trackSubmissionTime: boolean;
    trackBehavioral: boolean;
    trackDevice: boolean;
    trackStatistical: boolean;
  };
  learningConfig: {
    minDataPointsForModel: number; // Minimum submissions before anomaly detection
    modelUpdateFrequency: number; // Hours between model recalculation
    decayFactor: number; // Weight recent data more (0-1, 1 = no decay)
  };
  ignoreLists: {
    ignoredIPs: string[];
    ignoredDeviceFingerprints: string[];
    ignoredWallets: string[];
  };
}

export interface LearningFeedback {
  submissionId: string;
  isAnomaly: boolean;
  feedback: string;
  correctedMetrics?: Partial<FormSubmissionMetrics>;
  timestamp: number;
}

export interface AnomalyDetectionResult {
  submission: FormSubmissionMetrics;
  score: AnomalyScore;
  shouldFlag: boolean;
  explanation: string;
}
