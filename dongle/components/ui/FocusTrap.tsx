"use client";

/**
 * FocusTrap — Issue #528
 *
 * A component wrapper around the existing `useModalFocusTrap` hook.
 * Wrap any modal/dialog content with this to:
 *   • Trap Tab / Shift+Tab focus within the container
 *   • Restore focus to the trigger element on close
 *   • Call onClose when the user presses Escape
 *
 * Screen reader notes:
 *   • The container receives role="dialog" and aria-modal="true" automatically
 *     when `isModal` is true (default).
 *   • Provide `aria-labelledby` or `aria-label` on the FocusTrap (or the
 *     wrapped dialog element) for a proper accessible name.
 *
 * Usage:
 * ```tsx
 * <FocusTrap isOpen={open} onClose={() => setOpen(false)}>
 *   <div role="dialog" aria-labelledby="dialog-title" aria-modal="true">
 *     <h2 id="dialog-title">Confirm action</h2>
 *     <button onClick={() => setOpen(false)}>Close</button>
 *   </div>
 * </FocusTrap>
 * ```
 */

import { useRef } from "react";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";

interface FocusTrapProps {
  /** Whether the trap is active. When false the component renders nothing. */
  isOpen: boolean;
  /** Called when the user presses Escape or clicks outside (if closeOnOutsideClick). */
  onClose?: () => void;
  /** Ref to the element that should receive initial focus. Defaults to first focusable. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Additional CSS class names for the container div. */
  className?: string;
  children: React.ReactNode;
}

export function FocusTrap({
  isOpen,
  onClose,
  initialFocusRef,
  className,
  children,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Activate the focus trap — handles Tab cycling, Escape, and focus restoration
  useModalFocusTrap(isOpen, containerRef, initialFocusRef, onClose);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      // Ensure the container itself is programmatically focusable as a fallback
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
