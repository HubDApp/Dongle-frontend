/**
 * React hook for using translations in components.
 * Subscribes to locale changes so switching language re-renders consumers.
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  t,
  getMessages,
  getLocale,
  subscribeLocale,
  type Messages,
  type MessageKey,
} from "./index";
import * as format from "./format";
import type { LocaleCode } from "./locales";

interface UseTranslationReturn {
  t: typeof t;
  messages: Messages;
  format: typeof format;
  locale: LocaleCode;
}

function subscribe(onStoreChange: () => void) {
  return subscribeLocale(onStoreChange);
}

function getSnapshot(): LocaleCode {
  return getLocale();
}

export function useTranslation(): UseTranslationReturn {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const messages = getMessages();

  const translate = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => t(key, params),
    [locale],
  );

  return {
    t: translate,
    messages,
    format,
    locale,
  };
}
