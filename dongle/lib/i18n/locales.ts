/**
 * Supported UI locales and RTL infrastructure.
 *
 * Resolution order (highest priority first):
 *  1. URL query param `?lang=`
 *  2. Persisted localStorage preference
 *  3. Configured default locale
 *
 * Invalid or unknown values always fall back to DEFAULT_LOCALE.
 */

export const DEFAULT_LOCALE = "en" as const;

export const SUPPORTED_LOCALES = ["en", "es", "pt"] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = "dongle_locale";

export const LANG_QUERY_PARAM = "lang";

/**
 * Locales that should render right-to-left when translations are added.
 * Arabic and Hebrew are listed for layout/dir infrastructure only —
 * they are not in SUPPORTED_LOCALES and must not be selectable until
 * complete catalogs exist.
 */
export const RTL_LOCALES = ["ar", "he"] as const;

export type RtlLocaleCode = (typeof RTL_LOCALES)[number];

export const LOCALE_LABEL_KEYS = {
  en: "language.en",
  es: "language.es",
  pt: "language.pt",
} as const;

export function isSupportedLocale(value: unknown): value is LocaleCode {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export function isRtlLocale(value: string | null | undefined): boolean {
  if (!value) return false;
  const base = value.toLowerCase().split("-")[0];
  return (RTL_LOCALES as readonly string[]).includes(base);
}

export function getDocumentDirection(locale: string): "rtl" | "ltr" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

/**
 * Resolve the active locale from optional URL, stored, and default sources.
 * Invalid `lang` values are ignored rather than throwing.
 */
export function resolveLocale(options: {
  urlLang?: string | null;
  storedLang?: string | null;
  defaultLocale?: LocaleCode;
}): { locale: LocaleCode; source: "url" | "stored" | "default"; invalidUrlLang: boolean } {
  const fallback = options.defaultLocale ?? DEFAULT_LOCALE;

  if (options.urlLang != null && options.urlLang !== "") {
    if (isSupportedLocale(options.urlLang)) {
      return { locale: options.urlLang, source: "url", invalidUrlLang: false };
    }
    if (isSupportedLocale(options.storedLang)) {
      return { locale: options.storedLang, source: "stored", invalidUrlLang: true };
    }
    return { locale: fallback, source: "default", invalidUrlLang: true };
  }

  if (isSupportedLocale(options.storedLang)) {
    return { locale: options.storedLang, source: "stored", invalidUrlLang: false };
  }

  return { locale: fallback, source: "default", invalidUrlLang: false };
}

export function readStoredLocale(): LocaleCode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistLocale(locale: LocaleCode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Quota / private mode — language still applies for this session.
  }
}

export function applyDocumentLocale(locale: LocaleCode, htmlLang?: string): void {
  if (typeof document === "undefined") return;
  const lang = htmlLang ?? locale;
  document.documentElement.lang = lang;
  document.documentElement.dir = getDocumentDirection(lang);
  document.documentElement.dataset.locale = locale;
}
