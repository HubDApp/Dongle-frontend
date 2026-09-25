/**
 * Anomaly Detection Configuration
 * Default thresholds and settings for form anomaly detection
 */

import type { AnomalyDetectionConfig } from "./types";

/**
 * Default production configuration
 * These thresholds are calibrated based on typical form submission patterns
 */
export const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  enabled: true,

  thresholds: {
    // Anomaly score thresholds (0-1 scale)
    // Submissions scoring at or above these thresholds are flagged for review
    criticalAnomalyScore: 0.85, // 85% + anomaly probability
    highAnomalyScore: 0.70, // 70-84% anomaly probability
    mediumAnomalyScore: 0.50, // 50-69% anomaly probability
    lowAnomalyScore: 0.30, // 30-49% anomaly probability

    // Statistical outlier thresholds
    zScoreThreshold: 2.5, // Standard deviations from mean (captures ~1.2% of normal data)
    iqrMultiplier: 1.5, // IQR multiplier for outlier detection (standard Tukey method)
  },

  features: {
    trackSubmissionTime: true, // Track form completion speed
    trackBehavioral: true, // Track user interaction patterns
    trackDevice: true, // Track device fingerprints
    trackStatistical: true, // Track statistical anomalies
  },

  learningConfig: {
    minDataPointsForModel: 100, // Minimum submissions before anomaly detection activates
    modelUpdateFrequency: 24, // Update statistical models every 24 hours
    decayFactor: 0.95, // Weight recent data 5% more than old data (0.95 = standard, 1.0 = no decay)
  },

  ignoreLists: {
    ignoredIPs: [], // IPs to always trust (e.g., internal networks)
    ignoredDeviceFingerprints: [], // Known safe device fingerprints
    ignoredWallets: [], // Wallets that should never trigger anomalies
  },
};

/**
 * Strict configuration for high-security forms (e.g., payment, admin)
 */
export const STRICT_CONFIG: AnomalyDetectionConfig = {
  ...DEFAULT_CONFIG,
  thresholds: {
    criticalAnomalyScore: 0.75,
    highAnomalyScore: 0.60,
    mediumAnomalyScore: 0.40,
    lowAnomalyScore: 0.25,
    zScoreThreshold: 2.0,
    iqrMultiplier: 1.5,
  },
  learningConfig: {
    minDataPointsForModel: 50,
    modelUpdateFrequency: 12,
    decayFactor: 0.90,
  },
};

/**
 * Lenient configuration for low-risk forms
 */
export const LENIENT_CONFIG: AnomalyDetectionConfig = {
  ...DEFAULT_CONFIG,
  thresholds: {
    criticalAnomalyScore: 0.95,
    highAnomalyScore: 0.85,
    mediumAnomalyScore: 0.65,
    lowAnomalyScore: 0.40,
    zScoreThreshold: 3.5,
    iqrMultiplier: 2.0,
  },
  learningConfig: {
    minDataPointsForModel: 200,
    modelUpdateFrequency: 48,
    decayFactor: 1.0,
  },
};

/**
 * Development configuration with all features enabled for testing
 */
export const DEV_CONFIG: AnomalyDetectionConfig = {
  ...DEFAULT_CONFIG,
  enabled: true,
  learningConfig: {
    minDataPointsForModel: 10, // Lower threshold for development
    modelUpdateFrequency: 1,
    decayFactor: 0.95,
  },
};

/**
 * Get configuration based on environment and form type
 */
export function getConfig(
  formType?: string,
  environment?: string
): AnomalyDetectionConfig {
  if (environment === "development") {
    return DEV_CONFIG;
  }

  // Use strict config for sensitive forms
  if (formType === "payment" || formType === "admin" || formType === "auth") {
    return STRICT_CONFIG;
  }

  // Use lenient config for public forms
  if (formType === "feedback" || formType === "comment") {
    return LENIENT_CONFIG;
  }

  // Default configuration for most forms
  return DEFAULT_CONFIG;
}

/**
 * Environment-based configuration override
 */
export function createCustomConfig(
  baseConfig: AnomalyDetectionConfig,
  overrides: Partial<AnomalyDetectionConfig>
): AnomalyDetectionConfig {
  return {
    ...baseConfig,
    ...overrides,
    thresholds: {
      ...baseConfig.thresholds,
      ...(overrides.thresholds || {}),
    },
    features: {
      ...baseConfig.features,
      ...(overrides.features || {}),
    },
    learningConfig: {
      ...baseConfig.learningConfig,
      ...(overrides.learningConfig || {}),
    },
    ignoreLists: {
      ...baseConfig.ignoreLists,
      ...(overrides.ignoreLists || {}),
    },
  };
}
