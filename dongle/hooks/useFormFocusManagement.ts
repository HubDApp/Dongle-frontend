"use client";

/**
 * useFormFocusManagement — Issue #528
 *
 * Provides programmatic focus management for forms:
 *   • focusFirstField()  — move focus to the first focusable field
 *   • focusField(id)     — move focus to a specific field by its input id
 *   • focusNextError()   — move focus to the first field that has an error
 *   • announceToSR(msg)  — politely announce a message to screen readers
 *
 * Works alongside useModalFocusTrap (already in the repo) for modal scenarios.
 *
 * Usage:
 * ```tsx
 * const formRef = useRef<HTMLFormElement>(null);
 * const focus = useFormFocusManagement(formRef);
 *
 * // After validation fails, move focus to first invalid field:
 * focus.focusNextError();
 *
 * // Announce submission success to screen readers:
 * focus.announceToSR('Form submitted successfully.');
 * ```
 */

import { useCallback, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      el.getAttribute("aria-hidden") !== "true" && el.offsetParent !== null,
  );
}

export interface UseFormFocusManagementReturn {
  /** Move focus to the first focusable element in the form. */
  focusFirstField: () => void;
  /**
   * Move focus to the element with the given id.
   * Returns true if the element was found and focused, false otherwise.
   */
  focusField: (fieldId: string) => boolean;
  /**
   * Move focus to the first element that has role="alert" or an error
   * descendant.  Falls back to the first invalid input when no alert is
   * present in the DOM yet.
   */
  focusNextError: () => void;
  /**
   * Announce a message to screen readers using a polite live region.
   * The message is cleared after 5 seconds.
   */
  announceToSR: (message: string, priority?: "polite" | "assertive") => void;
}

export function useFormFocusManagement(
  formRef: React.RefObject<HTMLElement | null>,
): UseFormFocusManagementReturn {
  // Hidden live region for screen reader announcements
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const assertiveLiveRef = useRef<HTMLDivElement | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Create polite live region
    const polite = document.createElement("div");
    polite.setAttribute("aria-live", "polite");
    polite.setAttribute("aria-atomic", "true");
    polite.setAttribute("aria-relevant", "additions text");
    polite.className = "sr-only";
    polite.id = "form-live-region-polite";
    document.body.appendChild(polite);
    liveRegionRef.current = polite;

    // Create assertive live region
    const assertive = document.createElement("div");
    assertive.setAttribute("aria-live", "assertive");
    assertive.setAttribute("aria-atomic", "true");
    assertive.className = "sr-only";
    assertive.id = "form-live-region-assertive";
    document.body.appendChild(assertive);
    assertiveLiveRef.current = assertive;

    return () => {
      polite.remove();
      assertive.remove();
      if (clearTimerRef.current != null) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const focusFirstField = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const focusable = getFocusableElements(form);
    if (focusable.length > 0) {
      focusable[0].focus({ preventScroll: false });
    }
  }, [formRef]);

  const focusField = useCallback(
    (fieldId: string): boolean => {
      const el = document.getElementById(fieldId) as HTMLElement | null;
      if (!el) return false;
      el.focus({ preventScroll: false });
      // Scroll into view with some offset for sticky headers
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return true;
    },
    [],
  );

  const focusNextError = useCallback(() => {
    const form = formRef.current;
    if (!form) return;

    // Prefer elements with role="alert" — the error message is already visible
    const alerts = form.querySelectorAll<HTMLElement>('[role="alert"]');
    for (const alert of alerts) {
      if (alert.textContent?.trim()) {
        // Find the associated control via aria-describedby back-reference
        const alertId = alert.id;
        if (alertId) {
          const control = form.querySelector<HTMLElement>(
            `[aria-describedby~="${alertId}"]`,
          );
          if (control) {
            control.focus({ preventScroll: false });
            control.scrollIntoView({ behavior: "smooth", block: "nearest" });
            return;
          }
        }
        // Fallback: focus the alert itself so screen reader reads it
        alert.setAttribute("tabindex", "-1");
        alert.focus({ preventScroll: false });
        alert.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
    }

    // Fallback: focus the first input with aria-invalid="true"
    const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) {
      invalid.focus({ preventScroll: false });
      invalid.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [formRef]);

  const announceToSR = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const region =
        priority === "assertive"
          ? assertiveLiveRef.current
          : liveRegionRef.current;
      if (!region) return;

      // Clear previous content then set new message (two-step for reliability)
      region.textContent = "";
      if (clearTimerRef.current != null) clearTimeout(clearTimerRef.current);

      requestAnimationFrame(() => {
        region.textContent = message;
        clearTimerRef.current = setTimeout(() => {
          region.textContent = "";
        }, 5000);
      });
    },
    [],
  );

  return { focusFirstField, focusField, focusNextError, announceToSR };
}
