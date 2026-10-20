/**
 * useFormPasteDetection
 *
 * Detects and handles paste events on form fields.
 * - Fires a configurable onPaste callback with the raw and sanitized text.
 * - Strips common script-injection patterns to prevent XSS via paste.
 * - Can split multi-value pastes (e.g. comma/newline-separated lists).
 * - Tracks cumulative paste statistics for anomaly-detection consumers.
 *
 * Issue #517 – Create form field paste detection
 */

"use client";

import { useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PasteEvent {
  /** Raw text extracted from the clipboard. */
  raw: string;
  /** Sanitized version with script-injection patterns removed. */
  sanitized: string;
  /** Individual values when the paste looks like a multi-value string. */
  values: string[];
  /** True when the raw text contained a dangerous pattern. */
  hadInjectionAttempt: boolean;
  /** ISO timestamp of when the paste happened. */
  timestamp: string;
  /** Name of the field that received the paste (if provided). */
  fieldName?: string;
}

export interface PasteStats {
  totalPastes: number;
  injectionAttempts: number;
  multiValuePastes: number;
}

export interface UseFormPasteDetectionOptions {
  /**
   * Called whenever a paste occurs on an element that is being watched.
   * Receives the enriched PasteEvent so the caller can decide whether to
   * accept, format, or reject the pasted content.
   */
  onPaste?: (event: PasteEvent) => void;
  /**
   * If true (default) the hook prevents the native paste and instead fires
   * onPaste with the sanitized value — the caller is responsible for updating
   * the field value.  Set to false to let the native paste proceed while still
   * getting the callback.
   */
  preventDefaultPaste?: boolean;
  /**
   * Separator characters / strings used to detect multi-value pastes.
   * Defaults to comma and newline.
   */
  multiValueSeparators?: (string | RegExp)[];
  /**
   * Maximum length of text accepted from a single paste.  Excess is truncated
   * and the event is still fired so the caller can warn the user.
   * Defaults to 10 000 characters (no practical limit without a value).
   */
  maxPasteLength?: number;
}

// ---------------------------------------------------------------------------
// Injection-pattern sanitiser
// ---------------------------------------------------------------------------

/** Dangerous patterns we strip from pasted content. */
const INJECTION_PATTERNS: RegExp[] = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<[^>]+on\w+\s*=\s*["'][^"']*["'][^>]*>/gi, // inline event handlers
  /javascript\s*:/gi,
  /data\s*:\s*text\s*\/\s*html/gi,
  /vbscript\s*:/gi,
  /<\s*iframe[^>]*>/gi,
  /<\s*object[^>]*>/gi,
  /<\s*embed[^>]*>/gi,
  /<\s*form[^>]*>/gi,
];

function sanitizePastedText(raw: string): { sanitized: string; hadInjectionAttempt: boolean } {
  let hadInjectionAttempt = false;
  let sanitized = raw;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      hadInjectionAttempt = true;
      sanitized = sanitized.replace(pattern, "");
    }
  }

  // Trim surrounding whitespace after stripping
  sanitized = sanitized.trim();
  return { sanitized, hadInjectionAttempt };
}

// ---------------------------------------------------------------------------
// Multi-value splitter
// ---------------------------------------------------------------------------

const DEFAULT_SEPARATORS: (string | RegExp)[] = [",", "\n"];

function splitMultiValue(text: string, separators: (string | RegExp)[]): string[] {
  // Build a combined regex from all separators
  const parts = separators.map((s) => (s instanceof RegExp ? s.source : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const regex = new RegExp(parts.join("|"));
  const values = text
    .split(regex)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return values.length > 1 ? values : [text.trim()];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseFormPasteDetectionResult {
  /**
   * Attach to the onPaste prop of an <input> or <textarea>.
   * @param fieldName  Optional name used to tag the PasteEvent.
   */
  createPasteHandler: (
    fieldName?: string
  ) => (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Cumulative statistics since the hook was mounted. */
  stats: React.MutableRefObject<PasteStats>;
}

export function useFormPasteDetection(
  options: UseFormPasteDetectionOptions = {}
): UseFormPasteDetectionResult {
  const {
    onPaste,
    preventDefaultPaste = true,
    multiValueSeparators = DEFAULT_SEPARATORS,
    maxPasteLength = 10_000,
  } = options;

  const statsRef = useRef<PasteStats>({
    totalPastes: 0,
    injectionAttempts: 0,
    multiValuePastes: 0,
  });

  const createPasteHandler = useCallback(
    (fieldName?: string) =>
      (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const raw = (e.clipboardData?.getData("text") ?? "").slice(0, maxPasteLength);

        const { sanitized, hadInjectionAttempt } = sanitizePastedText(raw);
        const values = splitMultiValue(sanitized, multiValueSeparators);
        const isMultiValue = values.length > 1;

        // Update stats
        statsRef.current.totalPastes += 1;
        if (hadInjectionAttempt) statsRef.current.injectionAttempts += 1;
        if (isMultiValue) statsRef.current.multiValuePastes += 1;

        const pasteEvent: PasteEvent = {
          raw,
          sanitized,
          values,
          hadInjectionAttempt,
          timestamp: new Date().toISOString(),
          fieldName,
        };

        if (preventDefaultPaste) {
          e.preventDefault();
        }

        onPaste?.(pasteEvent);
      },
    [onPaste, preventDefaultPaste, multiValueSeparators, maxPasteLength]
  );

  return { createPasteHandler, stats: statsRef };
}
