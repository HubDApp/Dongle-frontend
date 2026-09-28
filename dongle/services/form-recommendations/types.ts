/**
 * Form Recommendation Types
 * Data structures for learning field values from past submissions and
 * suggesting them on new forms.
 */

/** A value the user has previously entered into a given field. */
export interface LearnedValue {
  /** The value as it was submitted. */
  value: string;
  /** How many times this value has been submitted for the field. */
  occurrences: number;
  /** Unix ms of the most recent submission carrying this value. */
  lastUsedAt: number;
  /** How many times a suggestion of this value was accepted. */
  accepted: number;
  /** How many times a suggestion of this value was rejected. */
  rejected: number;
}

/** Everything learned about one field of one form type. */
export interface FieldProfile {
  /** Form type the field belongs to, e.g. "project-submission". */
  formType: string;
  /** Field name within the form, e.g. "websiteUrl". */
  fieldName: string;
  /** Learned values, newest-first is not guaranteed — sort by score instead. */
  values: LearnedValue[];
}

/** The complete on-device profile. Never leaves the browser. */
export interface RecommendationProfile {
  /** Schema version, so a future shape change can discard old data safely. */
  version: number;
  /** Whether the user has opted in to local learning. */
  consentGranted: boolean;
  /** Unix ms the profile was created. */
  createdAt: number;
  /** Unix ms of the last write. */
  updatedAt: number;
  /** Learned field profiles, keyed by `${formType}::${fieldName}`. */
  fields: Record<string, FieldProfile>;
}

/** A single suggestion offered for a field. */
export interface Recommendation {
  /** The suggested value. */
  value: string;
  /** Ranking score in the 0-1 range; higher is a stronger suggestion. */
  score: number;
  /** Why the value is being suggested, for display and debugging. */
  reason: "frequent" | "recent" | "accepted";
}

/** Outcome of the user acting on a suggestion. */
export type RecommendationFeedback = "accepted" | "rejected";

export interface RecommendationConfig {
  /** Master switch. When false the engine records nothing and suggests nothing. */
  enabled: boolean;
  /** Maximum suggestions returned for one field. */
  maxSuggestionsPerField: number;
  /** Maximum distinct values retained per field before the weakest is evicted. */
  maxValuesPerField: number;
  /** Values untouched for longer than this (ms) are dropped. */
  valueTtlMs: number;
  /** Minimum score a value needs before it is offered at all. */
  minScoreToSuggest: number;
  /** Values shorter than this are not worth learning. */
  minValueLength: number;
  /** Values longer than this are free text, not reusable field values. */
  maxValueLength: number;
  /** Relative weight of how often a value was used. */
  frequencyWeight: number;
  /** Relative weight of how recently a value was used. */
  recencyWeight: number;
  /** Relative weight of the accept/reject record. */
  feedbackWeight: number;
  /** Half-life (ms) governing how fast recency decays. */
  recencyHalfLifeMs: number;
  /** A value rejected at least this many more times than accepted is suppressed. */
  rejectionSuppressionMargin: number;
}
