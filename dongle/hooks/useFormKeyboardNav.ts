"use client";

/**
 * useFormKeyboardNav — Issue #527
 *
 * Enhances keyboard navigation through a form container:
 *   • Tab / Shift+Tab — moves focus to next/previous focusable field
 *     (native browser behaviour is preserved; this hook supplements it)
 *   • Arrow keys on <select> elements — handled natively by the browser
 *   • Enter on a non-submit button or link inside the form — moves focus to
 *     the next field (allows quick keyboard-only filling)
 *   • Enter on the last field — focuses and activates the submit button
 *   • Escape — calls the optional onCancel callback (e.g. to reset/close form)
 *
 * The hook attaches a single keydown listener to the form container and uses
 * event delegation, keeping the implementation efficient regardless of field count.
 *
 * Usage:
 * ```tsx
 * const formRef = useRef<HTMLFormElement>(null);
 * useFormKeyboardNav(formRef, { onCancel: () => router.back() });
 * ```
 */

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function getFocusableFields(form: HTMLElement): HTMLElement[] {
  return Array.from(form.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      el.getAttribute("aria-hidden") !== "true" &&
      el.offsetParent !== null, // visible
  );
}

export interface UseFormKeyboardNavOptions {
  /**
   * Called when the user presses Escape inside the form.
   * Typically used to reset or dismiss/close the form.
   */
  onCancel?: () => void;
  /**
   * When true, pressing Enter on any field (not just the last one) will
   * submit the form immediately instead of advancing to the next field.
   * Defaults to false.
   */
  enterAlwaysSubmits?: boolean;
}

export function useFormKeyboardNav(
  formRef: React.RefObject<HTMLElement | null>,
  options: UseFormKeyboardNavOptions = {},
): void {
  // Keep options in a ref so we never need to re-attach the listener
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    function handleKeyDown(event: KeyboardEvent) {
      const form = formRef.current;
      if (!form) return;

      const target = event.target as HTMLElement;

      // ---- Escape — cancel / close ----------------------------------------
      if (event.key === "Escape") {
        optionsRef.current.onCancel?.();
        return;
      }

      // ---- Enter on form controls -----------------------------------------
      if (event.key === "Enter") {
        const tag = target.tagName.toLowerCase();

        // Native behaviour for submit buttons, links, and checkboxes
        if (
          (tag === "button" && target.getAttribute("type") !== "button") ||
          tag === "a" ||
          (tag === "input" &&
            (target.getAttribute("type") === "checkbox" ||
              target.getAttribute("type") === "radio" ||
              target.getAttribute("type") === "submit"))
        ) {
          return; // let default run
        }

        // Textarea — allow natural newline
        if (tag === "textarea") return;

        if (optionsRef.current.enterAlwaysSubmits) {
          // Let the form's own submit handler run
          return;
        }

        // For text/email/number/select fields: advance to next focusable element
        event.preventDefault();
        const focusable = getFocusableFields(form);
        const currentIndex = focusable.indexOf(target);

        if (currentIndex === -1) return;

        const submitBtn = focusable.find(
          (el) =>
            el.tagName.toLowerCase() === "button" &&
            (el.getAttribute("type") === "submit" || !el.getAttribute("type")),
        );

        const nextIndex = currentIndex + 1;
        if (nextIndex < focusable.length) {
          focusable[nextIndex].focus();
        } else if (submitBtn) {
          // Last field — focus the submit button so one more Enter submits
          submitBtn.focus();
        }
        return;
      }

      // ---- Tab / Shift+Tab ------------------------------------------------
      // Browser handles Tab natively. We only intervene to ensure select
      // elements that have custom styling still participate correctly.
      // (No action needed — native behaviour is sufficient.)
    }

    form.addEventListener("keydown", handleKeyDown);
    return () => {
      form.removeEventListener("keydown", handleKeyDown);
    };
  }, [formRef]);
}
