/**
 * Form Recommendation Store
 * Reads and writes the on-device recommendation profile.
 *
 * The profile never leaves the browser: there is no network call anywhere in
 * this module, and learning only happens once the user has explicitly opted in.
 */

import { PROFILE_VERSION, STORAGE_KEY } from "./config";
import type { FieldProfile, RecommendationProfile } from "./types";

/** Key under which a field's values are stored. */
export function fieldKey(formType: string, fieldName: string): string {
  return `${formType}::${fieldName}`;
}

function emptyProfile(): RecommendationProfile {
  const now = Date.now();
  return {
    version: PROFILE_VERSION,
    consentGranted: false,
    createdAt: now,
    updatedAt: now,
    fields: {},
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Load the profile from localStorage.
 *
 * Returns a fresh empty profile when storage is unavailable (SSR, private
 * mode, storage disabled), when nothing is stored yet, or when the stored data
 * is corrupt or from an older schema version.
 */
export function loadProfile(): RecommendationProfile {
  if (!isBrowser()) return emptyProfile();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile();

    const parsed = JSON.parse(raw) as Partial<RecommendationProfile>;
    if (parsed?.version !== PROFILE_VERSION || typeof parsed.fields !== "object") {
      return emptyProfile();
    }

    return {
      version: PROFILE_VERSION,
      consentGranted: parsed.consentGranted === true,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      fields: (parsed.fields ?? {}) as Record<string, FieldProfile>,
    };
  } catch {
    // Corrupt JSON or a storage access error — start clean rather than throw
    // inside a form render.
    return emptyProfile();
  }
}

/** Persist the profile. Silently no-ops when storage is unavailable or full. */
export function saveProfile(profile: RecommendationProfile): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...profile, updatedAt: Date.now() }),
    );
  } catch {
    // Quota exceeded or storage disabled mid-session. Recommendations are a
    // convenience, so losing a write must never break a submission.
  }
}

/** Record the user's consent decision, clearing learned data on withdrawal. */
export function setConsent(granted: boolean): RecommendationProfile {
  const profile = loadProfile();
  const next: RecommendationProfile = granted
    ? { ...profile, consentGranted: true }
    : { ...emptyProfile(), consentGranted: false };

  saveProfile(next);
  return next;
}

/** True when the user has opted in to local learning. */
export function hasConsent(): boolean {
  return loadProfile().consentGranted;
}

/** Delete everything learned, keeping the current consent decision. */
export function clearLearnedData(): RecommendationProfile {
  const { consentGranted } = loadProfile();
  const next = { ...emptyProfile(), consentGranted };
  saveProfile(next);
  return next;
}

/** Delete the profile outright, including the consent decision. */
export function clearProfile(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do if removal fails.
  }
}

/** Read one field's learned values, or `null` when nothing is known. */
export function getFieldProfile(
  profile: RecommendationProfile,
  formType: string,
  fieldName: string,
): FieldProfile | null {
  return profile.fields[fieldKey(formType, fieldName)] ?? null;
}

/** Return a copy of `profile` with `field` written into it. */
export function withFieldProfile(
  profile: RecommendationProfile,
  field: FieldProfile,
): RecommendationProfile {
  return {
    ...profile,
    fields: {
      ...profile.fields,
      [fieldKey(field.formType, field.fieldName)]: field,
    },
  };
}
