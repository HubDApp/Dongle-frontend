"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SUPPORTED_LOCALES, type LocaleCode } from "@/lib/i18n/locales";

const LOCALE_NATIVE: Record<LocaleCode, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};

/**
 * Accessible language selector. Min-width is sized for the longest native
 * language name so swapping EN/ES/PT does not shift the navbar.
 */
export default function LanguageSelector() {
  const { t, locale } = useTranslation();
  const { setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex min-w-[8.5rem] items-center justify-between gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("language.select")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{LOCALE_NATIVE[locale]}</span>
        </span>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("language.label")}
          className="absolute end-0 z-50 mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {SUPPORTED_LOCALES.map((code) => {
            const selected = code === locale;
            return (
              <li key={code} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                >
                  <span>{LOCALE_NATIVE[code]}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
