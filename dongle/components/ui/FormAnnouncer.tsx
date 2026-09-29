"use client";

/**
 * FormAnnouncer — ARIA live region manager for form status updates.
 *
 * Issue #529 — Create form announcement for screen readers
 *
 * Provides two live regions:
 *   - "polite"   — validation hints, field-level messages, progress info
 *   - "assertive" — critical errors, submit failures that need immediate attention
 *
 * Duplicate suppression: consecutive identical messages are deduplicated via
 * a zero-delay toggle that forces re-read even when the message hasn't changed.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnnouncePriority = "polite" | "assertive";

export interface AnnounceOptions {
  /** "polite" (default) for field hints/validation; "assertive" for errors. */
  priority?: AnnouncePriority;
}

export interface FormAnnouncerContextValue {
  /**
   * Announce a message to screen readers.
   * @param message  Text to announce.
   * @param options  Priority and other options.
   */
  announce: (message: string, options?: AnnounceOptions) => void;
  /** Convenience helper — always uses "assertive". */
  announceError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const FormAnnouncerContext = createContext<FormAnnouncerContextValue | null>(
  null,
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface FormAnnouncerProviderProps {
  children: React.ReactNode;
}

/**
 * Wrap a form (or the whole app) with this provider so any nested component
 * can call `useFormAnnouncer()` to push messages to the live regions.
 */
export function FormAnnouncerProvider({
  children,
}: FormAnnouncerProviderProps) {
  // We keep TWO message slots per region.  When we toggle between slot A and
  // slot B, the browser sees a DOM change and re-reads the text even if the
  // content is identical to the previous announcement.
  const [politeA, setPoliteA] = useState("");
  const [politeB, setPoliteB] = useState("");
  const [assertiveA, setAssertiveA] = useState("");
  const [assertiveB, setAssertiveB] = useState("");

  // Track which slot is "active" so we can rotate.
  const politeSlot = useRef<"a" | "b">("a");
  const assertiveSlot = useRef<"a" | "b">("a");

  const announce = useCallback(
    (message: string, { priority = "polite" }: AnnounceOptions = {}) => {
      if (!message) return;

      if (priority === "assertive") {
        if (assertiveSlot.current === "a") {
          setAssertiveA("");
          // Blank → message on next tick prevents deduplication issue.
          setTimeout(() => {
            setAssertiveA(message);
            setAssertiveB("");
          }, 0);
          assertiveSlot.current = "b";
        } else {
          setAssertiveB("");
          setTimeout(() => {
            setAssertiveB(message);
            setAssertiveA("");
          }, 0);
          assertiveSlot.current = "a";
        }
      } else {
        if (politeSlot.current === "a") {
          setPoliteA("");
          setTimeout(() => {
            setPoliteA(message);
            setPoliteB("");
          }, 0);
          politeSlot.current = "b";
        } else {
          setPoliteB("");
          setTimeout(() => {
            setPoliteB(message);
            setPoliteA("");
          }, 0);
          politeSlot.current = "a";
        }
      }
    },
    [],
  );

  const announceError = useCallback(
    (message: string) => announce(message, { priority: "assertive" }),
    [announce],
  );

  return (
    <FormAnnouncerContext.Provider value={{ announce, announceError }}>
      {children}

      {/*
       * Visually-hidden live regions.
       * They must always be present in the DOM (not conditionally rendered)
       * so the browser registers them before they first receive content.
       */}

      {/* Polite region — slot A */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions text"
        className="sr-only"
      >
        {politeA}
      </div>

      {/* Polite region — slot B (rotation twin) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions text"
        className="sr-only"
      >
        {politeB}
      </div>

      {/* Assertive region — slot A */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        aria-relevant="additions text"
        className="sr-only"
      >
        {assertiveA}
      </div>

      {/* Assertive region — slot B (rotation twin) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        aria-relevant="additions text"
        className="sr-only"
      >
        {assertiveB}
      </div>
    </FormAnnouncerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the announcer helpers from the nearest `FormAnnouncerProvider`.
 * Throws if used outside of a provider.
 */
export function useFormAnnouncer(): FormAnnouncerContextValue {
  const ctx = useContext(FormAnnouncerContext);
  if (!ctx) {
    throw new Error(
      "useFormAnnouncer must be used inside a <FormAnnouncerProvider>.",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Standalone component (self-contained, no context needed)
// ---------------------------------------------------------------------------

export interface FormAnnouncerProps {
  /** Text for the polite live region. */
  politeMessage?: string;
  /** Text for the assertive live region. */
  assertiveMessage?: string;
  /** Additional CSS class names. */
  className?: string;
}

/**
 * Drop-in `<FormAnnouncer>` component — useful when you just need to render
 * live regions without the context/hook pattern.
 *
 * @example
 * ```tsx
 * <FormAnnouncer
 *   politeMessage={submitting ? "Submitting your form…" : ""}
 *   assertiveMessage={submitError ?? ""}
 * />
 * ```
 */
export function FormAnnouncer({
  politeMessage = "",
  assertiveMessage = "",
  className,
}: FormAnnouncerProps) {
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions text"
        className={className ?? "sr-only"}
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        aria-relevant="additions text"
        className={className ?? "sr-only"}
      >
        {assertiveMessage}
      </div>
    </>
  );
}
