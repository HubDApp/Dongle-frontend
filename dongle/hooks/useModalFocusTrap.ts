import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute("aria-hidden") !== "true" && element.offsetParent !== null,
  );
}

export function useModalFocusTrap(
  isOpen: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
  onClose?: () => void,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusInitialElement = () => {
      const initialElement = initialFocusRef?.current;
      const focusable = dialogRef.current ? getFocusableElements(dialogRef.current) : [];
      (initialElement && !initialElement.hasAttribute("disabled") ? initialElement : focusable[0])?.focus();
    };

    const focusTimer = window.setTimeout(focusInitialElement, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);

      if (currentIndex === -1 || currentIndex === 0 || currentIndex === focusable.length - 1) {
        event.preventDefault();
        focusable[nextIndex]?.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        focusInitialElement();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      if (trigger?.isConnected) trigger.focus();
    };
  }, [dialogRef, initialFocusRef, isOpen]);
}
