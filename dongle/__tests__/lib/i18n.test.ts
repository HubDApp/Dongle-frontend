import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_LOCALE,
  applyDocumentLocale,
  findAllMissingTranslationKeys,
  getDocumentDirection,
  isRtlLocale,
  isSupportedLocale,
  persistLocale,
  readStoredLocale,
  resolveLocale,
  setLocale,
  t,
} from "@/lib/i18n";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/locales";

describe("i18n locales", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale("en");
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("accepts English, Spanish, and Portuguese", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("es")).toBe(true);
    expect(isSupportedLocale("pt")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });

  it("resolves URL lang over stored language", () => {
    const resolved = resolveLocale({ urlLang: "pt", storedLang: "es" });
    expect(resolved).toEqual({ locale: "pt", source: "url", invalidUrlLang: false });
  });

  it("uses stored language when URL is absent", () => {
    const resolved = resolveLocale({ urlLang: null, storedLang: "es" });
    expect(resolved.locale).toBe("es");
    expect(resolved.source).toBe("stored");
  });

  it("falls back safely for invalid ?lang values", () => {
    const resolved = resolveLocale({ urlLang: "zz", storedLang: "es" });
    expect(resolved.locale).toBe("es");
    expect(resolved.invalidUrlLang).toBe(true);

    const noStore = resolveLocale({ urlLang: "nope", storedLang: "nope" });
    expect(noStore.locale).toBe(DEFAULT_LOCALE);
    expect(noStore.source).toBe("default");
  });

  it("persists the selected language in localStorage", () => {
    persistLocale("es");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("es");
    expect(readStoredLocale()).toBe("es");
  });

  it("sets document direction for RTL infrastructure", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("he-IL")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
    expect(getDocumentDirection("ar")).toBe("rtl");
    applyDocumentLocale("en", "ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    applyDocumentLocale("es");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("es");
  });

  it("has no missing Spanish or Portuguese keys", () => {
    expect(findAllMissingTranslationKeys()).toEqual({ en: [], es: [], pt: [] });
  });

  it("renders translated strings after setLocale", () => {
    expect(t("nav.discover")).toBe("Discover");
    setLocale("es");
    expect(t("nav.discover")).toBe("Descubrir");
    setLocale("pt");
    expect(t("nav.discover")).toBe("Descobrir");
  });
});
