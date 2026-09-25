/**
 * Form Anomaly Detection Hook
 * Tracks form interaction metrics and detects anomalies
 * Integrates with the anomaly detection API
 */

import { useEffect, useRef, useCallback } from "react";
import type { FormSubmissionMetrics } from "@/services/anomaly-detection";

interface FormTrackingOptions {
  formId: string;
  formType: string; // e.g., "project-submission", "review-submission"
  userId?: string;
  walletFingerprint?: string;
  enableTracking?: boolean;
}

interface FormMetricsCollector {
  startTime: number;
  fieldStartTimes: Map<string, number>;
  focusLosses: number;
  tabSwitches: number;
  pasteEvents: number;
  autoFillUsed: boolean;
  totalCharacters: number;
  correctionEvents: Map<string, number>;
  lastFieldValue: Map<string, string>;
}

/**
 * Hook for tracking form interactions and detecting anomalies
 * Usage: useFormAnomalyDetection({ formId: "my-form", formType: "project-submission" })
 */
export function useFormAnomalyDetection(options: FormTrackingOptions) {
  const { formId, formType, userId, walletFingerprint, enableTracking = true } = options;

  const metricsRef = useRef<FormMetricsCollector>({
    startTime: Date.now(),
    fieldStartTimes: new Map(),
    focusLosses: 0,
    tabSwitches: 0,
    pasteEvents: 0,
    autoFillUsed: false,
    totalCharacters: 0,
    correctionEvents: new Map(),
    lastFieldValue: new Map(),
  });

  const deviceFingerprintRef = useRef<string>("");
  const ipHashRef = useRef<string>("");
  const sessionStartTimeRef = useRef<number>(Date.now());

  /**
   * Generate device fingerprint (hashed)
   */
  const generateDeviceFingerprint = useCallback((): string => {
    if (typeof window === "undefined") return "unknown";

    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen?.width,
      screen?.height,
      navigator.hardwareConcurrency,
    ]
      .filter(Boolean)
      .join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      const char = components.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `fp_${Math.abs(hash).toString(16).substring(0, 8)}`;
  }, []);

  /**
   * Fetch IP hash from API (privacy-preserving)
   */
  const getIpHash = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch("/api/anomaly-detection/ip-hash");
      const data = await response.json();
      return data.ipHash || "ip_unknown";
    } catch {
      return "ip_unknown";
    }
  }, []);

  /**
   * Initialize fingerprints on mount
   */
  useEffect(() => {
    if (!enableTracking) return;

    deviceFingerprintRef.current = generateDeviceFingerprint();
    getIpHash().then((hash) => {
      ipHashRef.current = hash;
    });
  }, [enableTracking, generateDeviceFingerprint, getIpHash]);

  /**
   * Track focus loss
   */
  const handleFormBlur = useCallback(() => {
    if (!enableTracking) return;
    metricsRef.current.focusLosses++;
  }, [enableTracking]);

  /**
   * Track focus regain
   */
  const handleFormFocus = useCallback(() => {
    if (!enableTracking) return;
    // Could track refocus events
  }, [enableTracking]);

  /**
   * Track tab visibility changes
   */
  const handleVisibilityChange = useCallback(() => {
    if (!enableTracking) return;
    if (document.hidden) {
      metricsRef.current.tabSwitches++;
    }
  }, [enableTracking]);

  /**
   * Track paste events
   */
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!enableTracking) return;
    metricsRef.current.pasteEvents++;
    
    // Check if pasted content is particularly large
    const pastedText = e.clipboardData?.getData("text") || "";
    metricsRef.current.totalCharacters += pastedText.length;
  }, [enableTracking]);

  /**
   * Track individual field changes
   */
  const trackFieldChange = useCallback(
    (fieldName: string, value: string) => {
      if (!enableTracking) return;

      const metrics = metricsRef.current;
      const lastValue = metrics.lastFieldValue.get(fieldName) || "";

      // Track character count
      metrics.totalCharacters += value.length;

      // Track corrections (significant changes to same field)
      if (lastValue && lastValue !== value && Math.abs(value.length - lastValue.length) > 3) {
        const corrections = metrics.correctionEvents.get(fieldName) || 0;
        metrics.correctionEvents.set(fieldName, corrections + 1);
      }

      // Check for autofill (rapid field fills)
      if (!metrics.fieldStartTimes.has(fieldName)) {
        metrics.fieldStartTimes.set(fieldName, Date.now());
      } else {
        const startTime = metrics.fieldStartTimes.get(fieldName) || 0;
        const timeTaken = Date.now() - startTime;
        
        // If field was filled very quickly (< 100ms per 5 chars), likely autofill
        if (timeTaken < (value.length / 5) * 100) {
          metrics.autoFillUsed = true;
        }
      }

      metrics.lastFieldValue.set(fieldName, value);
    },
    [enableTracking]
  );

  /**
   * Track form submission and send to anomaly detection API
   */
  const trackSubmission = useCallback(async () => {
    if (!enableTracking) return null;

    const metrics = metricsRef.current;
    const submissionTime = Date.now() - metrics.startTime;
    const fieldCount = metrics.fieldStartTimes.size;
    const correctionCount = Array.from(metrics.correctionEvents.values()).reduce(
      (a, b) => a + b,
      0
    );

    const formElement = document.getElementById(formId) as HTMLFormElement | null;
    const completionRate = fieldCount > 0 ? fieldCount / Math.max(fieldCount, 1) : 1.0;

    const submissionMetrics: FormSubmissionMetrics = {
      submissionTime,
      fieldCount,
      characterCount: metrics.totalCharacters,
      pasteEventCount: metrics.pasteEvents,
      autoFillDetected: metrics.autoFillUsed,
      deviceFingerprint: deviceFingerprintRef.current,
      ipHash: ipHashRef.current,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      sessionDuration: Date.now() - sessionStartTimeRef.current,
      completionRate,
      correctionCount,
      tabSwitchCount: metrics.tabSwitches,
      focusLossCount: metrics.focusLosses,
    };

    // Send to anomaly detection API
    try {
      const response = await fetch("/api/anomaly-detection/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission: submissionMetrics,
          formType,
          userId,
          walletFingerprint,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("[useFormAnomalyDetection] Failed to analyze submission:", error);
      return null;
    }
  }, [enableTracking, formId, formType, userId, walletFingerprint]);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    if (!enableTracking) return;

    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("blur", handleFormBlur, true);
    form.addEventListener("focus", handleFormFocus, true);
    form.addEventListener("paste", handlePaste, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      form?.removeEventListener("blur", handleFormBlur, true);
      form?.removeEventListener("focus", handleFormFocus, true);
      form?.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enableTracking, formId, handleFormBlur, handleFormFocus, handlePaste, handleVisibilityChange]);

  return {
    trackFieldChange,
    trackSubmission,
    getMetrics: () => metricsRef.current,
  };
}
