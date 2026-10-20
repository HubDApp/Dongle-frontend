import type { LocaleCode } from "@/lib/i18n/locales";

export interface ReviewTranslationEntry {
  reviewId: string;
  targetLocale: LocaleCode;
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  createdAt: string;
}

const REVIEW_TRANSLATION_CACHE_KEY = "dongle_review_translation_cache";
const MAX_CACHE_ENTRIES = 100;

export function getLocaleLabel(locale: LocaleCode): string {
  const labels: Record<LocaleCode, string> = {
    en: "English",
    es: "Spanish",
    pt: "Português",
  };

  return labels[locale];
}

export function getLocaleNativeLabel(locale: LocaleCode): string {
  const labels: Record<LocaleCode, string> = {
    en: "English",
    es: "Español",
    pt: "Português",
  };

  return labels[locale];
}

export function readReviewTranslationCache(): ReviewTranslationEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(REVIEW_TRANSLATION_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ReviewTranslationEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCachedReviewTranslation(
  reviewId: string,
  targetLocale: LocaleCode,
): ReviewTranslationEntry | null {
  const cache = readReviewTranslationCache();
  const match = cache.find(
    (entry) => entry.reviewId === reviewId && entry.targetLocale === targetLocale,
  );

  if (!match) return null;

  const ageMs = Date.now() - new Date(match.createdAt).getTime();
  if (Number.isNaN(ageMs) || ageMs > 1000 * 60 * 60 * 24) {
    pruneReviewTranslationCache(reviewId, targetLocale);
    return null;
  }

  return match;
}

export function persistReviewTranslation(entry: ReviewTranslationEntry): void {
  if (typeof window === "undefined") return;

  try {
    const cache = readReviewTranslationCache();
    const filtered = cache.filter(
      (item) => item.reviewId !== entry.reviewId || item.targetLocale !== entry.targetLocale,
    );

    filtered.push(entry);
    const trimmed = filtered.slice(-MAX_CACHE_ENTRIES);
    window.localStorage.setItem(REVIEW_TRANSLATION_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore quota/storage failures gracefully.
  }
}

export function pruneReviewTranslationCache(reviewId?: string, targetLocale?: LocaleCode): void {
  if (typeof window === "undefined") return;

  try {
    const cache = readReviewTranslationCache();
    const next = cache.filter((entry) => {
      if (reviewId && targetLocale) {
        return !(entry.reviewId === reviewId && entry.targetLocale === targetLocale);
      }
      return true;
    });

    window.localStorage.setItem(REVIEW_TRANSLATION_CACHE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures gracefully.
  }
}

export function buildCacheKey(reviewId: string, locale: LocaleCode): string {
  return `${reviewId}:${locale}`;
}
