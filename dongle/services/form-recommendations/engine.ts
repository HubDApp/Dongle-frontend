/**
 * Form Recommendation Engine
 * Learns field values from past submissions and ranks them as suggestions.
 *
 * Ranking blends three signals:
 *   - frequency: how often the value has been submitted
 *   - recency:   exponential decay against a configurable half-life
 *   - feedback:  the accept/reject record of previous suggestions
 *
 * Feedback is what makes suggestions improve over time — an accepted value
 * climbs, a repeatedly rejected one is suppressed entirely.
 */

import {
  DEFAULT_CONFIG,
  isSensitiveField,
  isSensitiveValue,
} from "./config";
import {
  getFieldProfile,
  loadProfile,
  saveProfile,
  withFieldProfile,
} from "./store";
import type {
  FieldProfile,
  LearnedValue,
  Recommendation,
  RecommendationConfig,
  RecommendationFeedback,
  RecommendationProfile,
} from "./types";

/** Normalise a submitted value for storage and comparison. */
function normaliseValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** True when a value is worth learning at all. */
function isLearnableValue(value: string, config: RecommendationConfig): boolean {
  const normalised = normaliseValue(value);
  return (
    normalised.length >= config.minValueLength &&
    normalised.length <= config.maxValueLength &&
    !isSensitiveValue(normalised)
  );
}

/**
 * Recency component in the 0-1 range, halving every `recencyHalfLifeMs`.
 */
export function recencyScore(
  lastUsedAt: number,
  now: number,
  config: RecommendationConfig,
): number {
  const age = Math.max(0, now - lastUsedAt);
  return Math.pow(2, -age / config.recencyHalfLifeMs);
}

/**
 * Frequency component in the 0-1 range, relative to the most-used value of the
 * same field. Using the field maximum rather than an absolute count keeps the
 * score meaningful whether the user has submitted a form twice or fifty times.
 */
export function frequencyScore(occurrences: number, maxOccurrences: number): number {
  if (maxOccurrences <= 0) return 0;
  return Math.min(1, occurrences / maxOccurrences);
}

/**
 * Feedback component in the 0-1 range. A value with no history sits at the
 * neutral 0.5 so it is neither promoted nor punished before the user has
 * reacted to it.
 */
export function feedbackScore(accepted: number, rejected: number): number {
  const total = accepted + rejected;
  if (total === 0) return 0.5;
  return accepted / total;
}

/** True when a value has been rejected enough to stop offering it. */
export function isSuppressed(
  value: LearnedValue,
  config: RecommendationConfig,
): boolean {
  return value.rejected - value.accepted >= config.rejectionSuppressionMargin;
}

/** Combined 0-1 score for one learned value. */
export function scoreValue(
  value: LearnedValue,
  maxOccurrences: number,
  now: number,
  config: RecommendationConfig,
): number {
  const weightSum =
    config.frequencyWeight + config.recencyWeight + config.feedbackWeight;
  if (weightSum <= 0) return 0;

  const weighted =
    frequencyScore(value.occurrences, maxOccurrences) * config.frequencyWeight +
    recencyScore(value.lastUsedAt, now, config) * config.recencyWeight +
    feedbackScore(value.accepted, value.rejected) * config.feedbackWeight;

  return weighted / weightSum;
}

/** Why a value is being suggested, for display alongside it. */
function reasonFor(
  value: LearnedValue,
  maxOccurrences: number,
  now: number,
  config: RecommendationConfig,
): Recommendation["reason"] {
  if (value.accepted > value.rejected) return "accepted";
  if (frequencyScore(value.occurrences, maxOccurrences) >= 0.75) return "frequent";
  if (recencyScore(value.lastUsedAt, now, config) >= 0.5) return "recent";
  return "frequent";
}

/** Drop values whose TTL has elapsed. */
function pruneExpired(
  values: LearnedValue[],
  now: number,
  config: RecommendationConfig,
): LearnedValue[] {
  return values.filter((value) => now - value.lastUsedAt <= config.valueTtlMs);
}

/**
 * Keep the profile bounded: when a field exceeds `maxValuesPerField`, evict the
 * lowest-scoring entries rather than the oldest, so a rarely-but-deliberately
 * reused value is not lost to a burst of one-off entries.
 */
function evictWeakest(
  values: LearnedValue[],
  now: number,
  config: RecommendationConfig,
): LearnedValue[] {
  if (values.length <= config.maxValuesPerField) return values;

  const maxOccurrences = Math.max(...values.map((v) => v.occurrences), 0);
  return [...values]
    .sort(
      (a, b) =>
        scoreValue(b, maxOccurrences, now, config) -
        scoreValue(a, maxOccurrences, now, config),
    )
    .slice(0, config.maxValuesPerField);
}

/**
 * Learn one field value from a submission.
 *
 * No-op when the user has not opted in, when the field name or the value looks
 * sensitive, or when the value is too short or too long to be reusable.
 */
export function recordFieldValue(
  formType: string,
  fieldName: string,
  rawValue: string,
  config: RecommendationConfig = DEFAULT_CONFIG,
  now: number = Date.now(),
): RecommendationProfile {
  const profile = loadProfile();

  if (!config.enabled || !profile.consentGranted) return profile;
  if (isSensitiveField(fieldName)) return profile;
  if (typeof rawValue !== "string" || !isLearnableValue(rawValue, config)) return profile;

  const value = normaliseValue(rawValue);
  const existing = getFieldProfile(profile, formType, fieldName);
  const values = pruneExpired(existing?.values ?? [], now, config);

  const index = values.findIndex((entry) => entry.value === value);
  const updated: LearnedValue[] =
    index >= 0
      ? values.map((entry, i) =>
          i === index
            ? { ...entry, occurrences: entry.occurrences + 1, lastUsedAt: now }
            : entry,
        )
      : [...values, { value, occurrences: 1, lastUsedAt: now, accepted: 0, rejected: 0 }];

  const field: FieldProfile = {
    formType,
    fieldName,
    values: evictWeakest(updated, now, config),
  };

  const next = withFieldProfile(profile, field);
  saveProfile(next);
  return next;
}

/**
 * Learn every eligible field of a submitted form.
 *
 * Non-string values are skipped: the engine suggests text a user would
 * otherwise retype, not structured data.
 */
export function recordSubmission(
  formType: string,
  values: Record<string, unknown>,
  config: RecommendationConfig = DEFAULT_CONFIG,
  now: number = Date.now(),
): RecommendationProfile {
  let profile = loadProfile();
  if (!config.enabled || !profile.consentGranted) return profile;

  for (const [fieldName, value] of Object.entries(values)) {
    if (typeof value !== "string") continue;
    profile = recordFieldValue(formType, fieldName, value, config, now);
  }

  return profile;
}

/**
 * Rank suggestions for one field, strongest first.
 *
 * Returns an empty list when the user has not opted in, when the field is
 * sensitive, or when nothing clears `minScoreToSuggest`.
 */
export function getRecommendations(
  formType: string,
  fieldName: string,
  config: RecommendationConfig = DEFAULT_CONFIG,
  now: number = Date.now(),
): Recommendation[] {
  const profile = loadProfile();

  if (!config.enabled || !profile.consentGranted) return [];
  if (isSensitiveField(fieldName)) return [];

  const field = getFieldProfile(profile, formType, fieldName);
  if (!field) return [];

  const values = pruneExpired(field.values, now, config).filter(
    (value) => !isSuppressed(value, config),
  );
  if (values.length === 0) return [];

  const maxOccurrences = Math.max(...values.map((v) => v.occurrences));

  return values
    .map((value) => ({
      value: value.value,
      score: scoreValue(value, maxOccurrences, now, config),
      reason: reasonFor(value, maxOccurrences, now, config),
    }))
    .filter((recommendation) => recommendation.score >= config.minScoreToSuggest)
    .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value))
    .slice(0, config.maxSuggestionsPerField);
}

/**
 * Record that the user accepted or rejected a suggestion.
 *
 * This is the feedback loop: accepting lifts a value's score on the next
 * render, and rejecting it enough times removes it from the suggestions
 * altogether without the user having to open a settings screen.
 */
export function recordFeedback(
  formType: string,
  fieldName: string,
  value: string,
  feedback: RecommendationFeedback,
  config: RecommendationConfig = DEFAULT_CONFIG,
  now: number = Date.now(),
): RecommendationProfile {
  const profile = loadProfile();
  if (!config.enabled || !profile.consentGranted) return profile;

  const field = getFieldProfile(profile, formType, fieldName);
  if (!field) return profile;

  const normalised = normaliseValue(value);
  if (!field.values.some((entry) => entry.value === normalised)) return profile;

  const values = field.values.map((entry) =>
    entry.value === normalised
      ? {
          ...entry,
          accepted: feedback === "accepted" ? entry.accepted + 1 : entry.accepted,
          rejected: feedback === "rejected" ? entry.rejected + 1 : entry.rejected,
          // An accepted suggestion is a use of the value; a rejection is not.
          lastUsedAt: feedback === "accepted" ? now : entry.lastUsedAt,
        }
      : entry,
  );

  const next = withFieldProfile(profile, { ...field, values });
  saveProfile(next);
  return next;
}

/** Stop suggesting one specific value for a field, permanently. */
export function forgetValue(
  formType: string,
  fieldName: string,
  value: string,
): RecommendationProfile {
  const profile = loadProfile();
  const field = getFieldProfile(profile, formType, fieldName);
  if (!field) return profile;

  const normalised = normaliseValue(value);
  const next = withFieldProfile(profile, {
    ...field,
    values: field.values.filter((entry) => entry.value !== normalised),
  });

  saveProfile(next);
  return next;
}
