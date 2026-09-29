/**
 * I18n infrastructure
 *
 * Type-safe message lookup with parameter interpolation, locale switching,
 * and subscriber notifications so React trees re-render on language change.
 */

import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { pt } from "./messages/pt";
import {
  DEFAULT_LOCALE,
  type LocaleCode,
  isSupportedLocale,
} from "./locales";

const catalogs: Record<LocaleCode, Messages> = {
  en,
  es,
  pt,
};

let currentLocale: LocaleCode = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function getLocale(): LocaleCode {
  return currentLocale;
}

export function setLocale(locale: LocaleCode): void {
  if (!isSupportedLocale(locale)) {
    console.warn(`Invalid locale "${String(locale)}"; keeping ${currentLocale}`);
    return;
  }
  if (locale === currentLocale) return;
  currentLocale = locale;
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

export type MessageKey = NestedKeyOf<Messages>;

type InterpolationParams = Record<string, string | number>;

function lookup(catalog: Messages, key: string): string | undefined {
  const keys = key.split(".");
  let value: unknown = catalog;
  for (const k of keys) {
    if (value && typeof value === "object" && k in (value as object)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * Get a message by key with optional parameter interpolation.
 * Missing keys fall back to English, then to the key itself.
 */
export function t(key: MessageKey, params?: InterpolationParams): string {
  const locale = getLocale();
  const resolved =
    lookup(catalogs[locale], key) ??
    (locale === DEFAULT_LOCALE ? undefined : lookup(catalogs[DEFAULT_LOCALE], key));

  if (resolved === undefined) {
    console.warn(`Missing translation key: ${key}`);
    return key;
  }

  if (params) {
    return interpolate(resolved, params);
  }
  return resolved;
}

function interpolate(template: string, params: InterpolationParams): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (name in params) {
      return String(params[name]);
    }
    return match;
  });
}

export function getMessages(): Messages {
  return catalogs[currentLocale];
}

export function getCatalog(locale: LocaleCode): Messages {
  return catalogs[locale];
}

export function plural(count: number): "" | "s" {
  return count === 1 ? "" : "s";
}

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => {
      const next = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") return [next];
      return flattenKeys(v, next);
    });
  }
  return [];
}

/**
 * Compare a locale catalog against English and return missing leaf keys.
 */
export function findMissingTranslationKeys(locale: LocaleCode): string[] {
  const enKeys = new Set(flattenKeys(catalogs.en));
  const localeKeys = new Set(flattenKeys(catalogs[locale]));
  return [...enKeys].filter((key) => !localeKeys.has(key)).sort();
}

export function findAllMissingTranslationKeys(): Record<LocaleCode, string[]> {
  return {
    en: [],
    es: findMissingTranslationKeys("es"),
    pt: findMissingTranslationKeys("pt"),
  };
}

export { en } from "./messages/en";
export { es } from "./messages/es";
export { pt } from "./messages/pt";
export type { Messages, LocaleCode };
export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  RTL_LOCALES,
  LOCALE_STORAGE_KEY,
  LANG_QUERY_PARAM,
  isSupportedLocale,
  isRtlLocale,
  getDocumentDirection,
  resolveLocale,
  applyDocumentLocale,
  persistLocale,
  readStoredLocale,
} from "./locales";
