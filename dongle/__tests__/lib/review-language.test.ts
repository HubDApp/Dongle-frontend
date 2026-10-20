import { describe, expect, it } from "vitest";
import {
  detectReviewLanguage,
  normalizeReviewSearchText,
  reviewSearchMatches,
  REVIEW_LANGUAGES,
} from "@/lib/review-language";

describe("review language support", () => {
  it("supports detection metadata for 15 languages", () => {
    expect(Object.keys(REVIEW_LANGUAGES)).toHaveLength(15);
  });

  it.each([
    ["This project is very useful and easy to use", "en"],
    ["Este proyecto es muy bueno y fácil de usar", "es"],
    ["Это очень хороший проект и удобный сервис", "ru"],
    ["هذا مشروع ممتاز وسهل الاستخدام", "ar"],
    ["यह बहुत अच्छा और उपयोगी प्रोजेक्ट है", "hi"],
    ["このプロジェクトはとても便利です", "ja"],
    ["이 프로젝트는 매우 편리하고 좋습니다", "ko"],
    ["这个项目非常好用", "zh"],
  ])("detects language for %s", (comment, language) => {
    expect(detectReviewLanguage(comment)).toBe(language);
  });

  it("folds accents and matches Cyrillic text through transliteration", () => {
    expect(normalizeReviewSearchText("conexión")).toBe("conexion");
    expect(reviewSearchMatches("La conexión es excelente", "conexion")).toBe(true);
    expect(reviewSearchMatches("Это хороший проект", "eto khoroshiy proekt")).toBe(true);
  });
});