/**
 * I18n infrastructure
 * 
 * This module provides a simple, type-safe i18n system that:
 * - Centralizes all user-facing strings
 * - Supports parameter interpolation
 * - Is ready for future multi-language support
 * - Maintains existing English copy
 */

import { en, type Messages } from "./messages/en";

type LocaleCode = "en";

// Currently only English is supported, but structure allows easy expansion
const messages: Record<LocaleCode, Messages> = {
  en,
};

// Current locale (can be extended to support runtime switching)
let currentLocale: LocaleCode = "en";

/**
 * Get the current locale
 */
export function getLocale(): LocaleCode {
  return currentLocale;
}

/**
 * Set the current locale (for future use)
 */
export function setLocale(locale: LocaleCode): void {
  currentLocale = locale;
}

/**
 * Type helper to get nested keys from messages object
 */
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

type MessageKey = NestedKeyOf<Messages>;

type InterpolationParams = Record<string, string | number>;

/**
 * Get a message by key with optional parameter interpolation
 * 
 * @example
 * t("nav.discover") // "Discover"
 * t("hero.reviewsCount", { count: 2000 }) // "2k+ Reviews"
 * t("profile.submittedAt", { date: "2 days ago" }) // "Submitted 2 days ago"
 */
export function t(key: MessageKey, params?: InterpolationParams): string {
  const locale = getLocale();
  const messageCatalog = messages[locale];

  // Navigate nested object structure
  const keys = key.split(".");
  let value: any = messageCatalog;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      console.warn(`Missing translation key: ${key}`);
      return key;
    }
  }

  if (typeof value !== "string") {
    console.warn(`Translation key ${key} does not resolve to a string`);
    return key;
  }

  // Interpolate parameters
  if (params) {
    return interpolate(value, params);
  }

  return value;
}

/**
 * Interpolate parameters into a message template
 * Supports {paramName} syntax
 */
function interpolate(template: string, params: InterpolationParams): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in params) {
      return String(params[key]);
    }
    return match;
  });
}

/**
 * Get all messages for the current locale
 * Useful for components that need access to multiple related messages
 */
export function getMessages(): Messages {
  return messages[currentLocale];
}

/**
 * Check if a plural form should be used
 * Simple English pluralization helper
 */
export function plural(count: number): "" | "s" {
  return count === 1 ? "" : "s";
}

export { en } from "./messages/en";
export type { Messages, LocaleCode };
