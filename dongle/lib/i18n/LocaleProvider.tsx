"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LANG_QUERY_PARAM,
  applyDocumentLocale,
  persistLocale,
  readStoredLocale,
  resolveLocale,
  type LocaleCode,
} from "./locales";
import { getLocale, setLocale as setEngineLocale } from "./index";

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

function LocaleEffects({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const appliedUrlRef = useRef<string | null>(null);

  const urlLang = searchParams.get(LANG_QUERY_PARAM);
  const resolved = resolveLocale({
    urlLang,
    storedLang: readStoredLocale(),
  });

  const setLocale = useCallback(
    (next: LocaleCode) => {
      setEngineLocale(next);
      persistLocale(next);
      applyDocumentLocale(next);

      const params = new URLSearchParams(searchParams.toString());
      params.set(LANG_QUERY_PARAM, next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const key = `${urlLang ?? ""}:${resolved.locale}`;
    if (appliedUrlRef.current === key && getLocale() === resolved.locale) {
      return;
    }
    appliedUrlRef.current = key;
    setEngineLocale(resolved.locale);
    persistLocale(resolved.locale);
    applyDocumentLocale(resolved.locale);

    if (resolved.invalidUrlLang) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(LANG_QUERY_PARAM, resolved.locale);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [pathname, resolved.invalidUrlLang, resolved.locale, router, searchParams, urlLang]);

  const value = useMemo(
    () => ({ locale: resolved.locale, setLocale }),
    [resolved.locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <LocaleEffects>{children}</LocaleEffects>
    </Suspense>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
