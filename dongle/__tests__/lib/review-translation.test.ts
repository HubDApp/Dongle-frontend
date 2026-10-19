import { beforeEach, describe, expect, it } from "vitest";
import {
  getCachedReviewTranslation,
  persistReviewTranslation,
  readReviewTranslationCache,
} from "@/lib/review-translation";

describe("review translation cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and reads translations in localStorage for the active session locale", () => {
    persistReviewTranslation({
      reviewId: "review-123",
      targetLocale: "es",
      originalText: "Hola mundo",
      translatedText: "Hello world",
      detectedLanguage: "es",
      createdAt: new Date().toISOString(),
    });

    expect(readReviewTranslationCache()).toHaveLength(1);
    expect(getCachedReviewTranslation("review-123", "es")?.translatedText).toBe("Hello world");
  });

  it("returns null for expired cached translations", () => {
    persistReviewTranslation({
      reviewId: "review-456",
      targetLocale: "pt",
      originalText: "Bom dia",
      translatedText: "Good morning",
      detectedLanguage: "pt",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25 * 2).toISOString(),
    });

    expect(getCachedReviewTranslation("review-456", "pt")).toBeNull();
  });
});
