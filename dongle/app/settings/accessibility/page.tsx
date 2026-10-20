"use client";

import { useTheme } from "@/providers/ThemeProvider";

export default function AccessibilitySettingsPage() {
  const { highContrast, setHighContrast } = useTheme();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 pb-24 pt-28 dark:bg-zinc-950">
      <section
        className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        aria-labelledby="accessibility-settings-title"
      >
        <h1
          id="accessibility-settings-title"
          className="text-2xl font-bold text-zinc-900 dark:text-zinc-100"
        >
          Accessibility settings
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Adjust the display to improve readability and keyboard navigation.
        </p>

        <div className="mt-6 flex items-start justify-between gap-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              High contrast
            </h2>
            <p id="high-contrast-description" className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Use black text on white backgrounds, visible button borders, and
              bold keyboard focus indicators.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={highContrast}
            aria-describedby="high-contrast-description"
            aria-label="High contrast mode"
            onClick={() => setHighContrast(!highContrast)}
            className="shrink-0 rounded-lg border-2 border-zinc-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-400 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {highContrast ? "On" : "Off"}
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          High contrast mode is {highContrast ? "on" : "off"}.
        </p>
      </section>
    </main>
  );
}
