"use client";

/**
 * useKeyboardShortcuts — Issue #659
 *
 * Application-wide keyboard shortcut manager.
 *
 * Shortcuts:
 *   /  or  Cmd/Ctrl+K  → focus search bar
 *   Cmd/Ctrl+B          → toggle bookmarks (watchlist)
 *   C                   → open comparison tray
 *   N                   → navigate to new project form (if authenticated)
 *   ?                   → show keyboard shortcut help modal
 *   Esc                 → close active modal/drawer
 *   Arrow keys          → navigate project grid (focus management)
 *
 * Shortcuts are suppressed when focus is inside any interactive input element.
 */

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface KeyboardShortcutHandlers {
  /** Focus the primary search bar */
  onFocusSearch?: () => void;
  /** Toggle bookmarks / watchlist panel */
  onToggleBookmarks?: () => void;
  /** Open the comparison tray */
  onOpenComparison?: () => void;
  /** Navigate to the new project form; called only when the user is authenticated */
  onNewProject?: () => void;
  /** Show the keyboard shortcut help modal */
  onShowHelp?: () => void;
  /** Close the currently open modal or drawer */
  onClose?: () => void;
  /** Whether the user is authenticated (gates the N shortcut) */
  isAuthenticated?: boolean;
}

/** Returns true if the keyboard event originated from a text-entry element. */
function isTypingContext(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;

      // Cmd/Ctrl+K → focus search (fires even when typing)
      if (meta && event.key === "k") {
        event.preventDefault();
        handlers.onFocusSearch?.();
        return;
      }

      // All remaining shortcuts are suppressed while typing
      if (isTypingContext(event)) return;

      // Cmd/Ctrl+B → toggle bookmarks
      if (meta && event.key === "b") {
        event.preventDefault();
        handlers.onToggleBookmarks?.();
        return;
      }

      switch (event.key) {
        case "/":
          event.preventDefault();
          handlers.onFocusSearch?.();
          break;

        case "c":
        case "C":
          handlers.onOpenComparison?.();
          break;

        case "n":
        case "N":
          if (handlers.isAuthenticated) {
            router.push("/projects/new");
            handlers.onNewProject?.();
          }
          break;

        case "?":
          event.preventDefault();
          handlers.onShowHelp?.();
          break;

        case "Escape":
          handlers.onClose?.();
          break;

        default:
          break;
      }
    },
    [handlers, router],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

// ─── Arrow-key project grid navigation ───────────────────────────────────────

/**
 * useProjectGridNavigation
 *
 * Attaches arrow-key navigation to a grid container so keyboard-only users
 * can move between project cards.  The hook reads the live grid geometry at
 * key-press time so it works regardless of how many columns the CSS grid
 * renders.
 */
export function useProjectGridNavigation(
  gridRef: React.RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const CARD_SELECTOR = '[data-grid-card]';

    function getCards(): HTMLElement[] {
      return Array.from(grid!.querySelectorAll<HTMLElement>(CARD_SELECTOR));
    }

    /** Compute the number of columns by comparing the top offsets of cards. */
    function getColumnCount(cards: HTMLElement[]): number {
      if (cards.length < 2) return 1;
      const firstTop = cards[0].getBoundingClientRect().top;
      let count = 1;
      for (let i = 1; i < cards.length; i++) {
        if (Math.abs(cards[i].getBoundingClientRect().top - firstTop) < 4) {
          count++;
        } else {
          break;
        }
      }
      return count;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const cards = getCards();
      if (!cards.length) return;

      const active = document.activeElement as HTMLElement | null;
      const currentIndex = active ? cards.indexOf(active) : -1;
      if (currentIndex === -1) return;

      const cols = getColumnCount(cards);
      let nextIndex = -1;

      if (event.key === "ArrowRight") {
        nextIndex = currentIndex + 1;
      } else if (event.key === "ArrowLeft") {
        nextIndex = currentIndex - 1;
      } else if (event.key === "ArrowDown") {
        nextIndex = currentIndex + cols;
      } else if (event.key === "ArrowUp") {
        nextIndex = currentIndex - cols;
      } else {
        return;
      }

      if (nextIndex >= 0 && nextIndex < cards.length) {
        event.preventDefault();
        cards[nextIndex].focus();
      }
    }

    grid.addEventListener("keydown", handleKeyDown);
    return () => {
      grid.removeEventListener("keydown", handleKeyDown);
    };
  }, [gridRef]);
}
