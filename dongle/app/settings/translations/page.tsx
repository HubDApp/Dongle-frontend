"use client";

import { useState } from "react";
import { getCatalog, SUPPORTED_LOCALES, type LocaleCode } from "@/lib/i18n";

const ISSUE_URL = "https://github.com/HubDApp/Dongle-frontend/issues/new";

function lookup(locale: LocaleCode, key: string): string {
  let value: unknown = getCatalog(locale);
  for (const part of key.split(".")) {
    if (!value || typeof value !== "object") return "";
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "string" ? value : "";
}

/** Builds a pre-filled GitHub issue so maintainers can review, approve or reject the suggestion. */
function buildSuggestionUrl(input: {
  locale: string;
  key: string;
  current: string;
  suggested: string;
  reason: string;
}): string {
  const body = [
    `**Locale:** ${input.locale}`,
    `**Key:** \`${input.key}\``,
    `**Current text:** ${input.current || "(missing)"}`,
    `**Suggested text:** ${input.suggested}`,
    `**Reason:** ${input.reason || "-"}`,
  ].join("\n");
  const params = new URLSearchParams({
    title: `Translation suggestion (${input.locale}): ${input.key}`,
    body,
    labels: "translation",
  });
  return `${ISSUE_URL}?${params.toString()}`;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export default function TranslationSuggestionPage() {
  const [locale, setLocale] = useState<LocaleCode>("es");
  const [key, setKey] = useState("");
  const [suggested, setSuggested] = useState("");
  const [reason, setReason] = useState("");
  const current = key ? lookup(locale, key) : "";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 pb-24 pt-28 dark:bg-zinc-950">
      <section
        className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        aria-labelledby="translation-title"
      >
        <h1 id="translation-title" className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Suggest a better translation
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Keep the meaning of the English text, match the app&apos;s tone, and keep placeholders such as{" "}
          <code>{"{count}"}</code> unchanged. Suggestions open as a GitHub issue that maintainers
          review; approved ones are merged into the locale files and you are credited as the author.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            window.open(
              buildSuggestionUrl({ locale, key, current, suggested, reason }),
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Locale
            <select
              className={inputClass}
              value={locale}
              onChange={(e) => setLocale(e.target.value as LocaleCode)}
            >
              {SUPPORTED_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Key
            <input
              className={inputClass}
              value={key}
              onChange={(e) => setKey(e.target.value.trim())}
              placeholder="e.g. language.select"
              required
            />
          </label>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Current text: {current || "—"}
          </p>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Suggested text
            <textarea
              className={inputClass}
              value={suggested}
              onChange={(e) => setSuggested(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Reason
            <textarea className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Submit suggestion
          </button>
        </form>
      </section>
    </div>
  );
}
