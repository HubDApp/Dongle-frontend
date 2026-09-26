/**
 * Form Recommendations Hook
 * Surfaces learned field values as suggestions and feeds the user's
 * accept/reject decisions back into the ranking.
 *
 * All state is local to the browser — see `services/form-recommendations`.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONFIG,
  clearLearnedData,
  forgetValue,
  getRecommendations,
  hasConsent,
  recordFeedback,
  recordSubmission,
  setConsent,
} from "@/services/form-recommendations";
import type {
  Recommendation,
  RecommendationConfig,
} from "@/services/form-recommendations";

interface UseFormRecommendationsOptions {
  /** Form type the suggestions belong to, e.g. "project-submission". */
  formType: string;
  /** Field names to offer suggestions for. */
  fields: string[];
  /** Overrides for the default ranking and retention settings. */
  config?: Partial<RecommendationConfig>;
}

interface UseFormRecommendationsResult {
  /** Whether the user has opted in to local learning. */
  consentGranted: boolean;
  /** Suggestions per field name, strongest first. */
  suggestions: Record<string, Recommendation[]>;
  /** Opt in or out. Opting out erases everything learned so far. */
  updateConsent: (granted: boolean) => void;
  /** Record that the user took a suggestion. */
  acceptSuggestion: (fieldName: string, value: string) => void;
  /** Record that the user dismissed a suggestion. */
  rejectSuggestion: (fieldName: string, value: string) => void;
  /** Stop offering one value for a field, permanently. */
  forgetSuggestion: (fieldName: string, value: string) => void;
  /** Learn from a completed submission. */
  learnFromSubmission: (values: Record<string, unknown>) => void;
  /** Erase everything learned, keeping the consent decision. */
  clearAll: () => void;
}

export function useFormRecommendations(
  options: UseFormRecommendationsOptions,
): UseFormRecommendationsResult {
  const { formType, fields, config: configOverrides } = options;

  const config = useMemo<RecommendationConfig>(
    () => ({ ...DEFAULT_CONFIG, ...configOverrides }),
    [configOverrides],
  );

  // Serialised so a caller passing a fresh array literal each render does not
  // retrigger the effect below.
  const fieldsKey = fields.join("|");

  const [consentGranted, setConsentGranted] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, Recommendation[]>>({});

  const refresh = useCallback(() => {
    const granted = hasConsent();
    setConsentGranted(granted);

    if (!granted) {
      setSuggestions({});
      return;
    }

    const next: Record<string, Recommendation[]> = {};
    for (const fieldName of fieldsKey ? fieldsKey.split("|") : []) {
      next[fieldName] = getRecommendations(formType, fieldName, config);
    }
    setSuggestions(next);
  }, [formType, fieldsKey, config]);

  // Reads localStorage, so it must run after mount rather than during render.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateConsent = useCallback(
    (granted: boolean) => {
      setConsent(granted);
      refresh();
    },
    [refresh],
  );

  const acceptSuggestion = useCallback(
    (fieldName: string, value: string) => {
      recordFeedback(formType, fieldName, value, "accepted", config);
      refresh();
    },
    [formType, config, refresh],
  );

  const rejectSuggestion = useCallback(
    (fieldName: string, value: string) => {
      recordFeedback(formType, fieldName, value, "rejected", config);
      refresh();
    },
    [formType, config, refresh],
  );

  const forgetSuggestion = useCallback(
    (fieldName: string, value: string) => {
      forgetValue(formType, fieldName, value);
      refresh();
    },
    [formType, refresh],
  );

  const learnFromSubmission = useCallback(
    (values: Record<string, unknown>) => {
      recordSubmission(formType, values, config);
      refresh();
    },
    [formType, config, refresh],
  );

  const clearAll = useCallback(() => {
    clearLearnedData();
    refresh();
  }, [refresh]);

  return {
    consentGranted,
    suggestions,
    updateConsent,
    acceptSuggestion,
    rejectSuggestion,
    forgetSuggestion,
    learnFromSubmission,
    clearAll,
  };
}
