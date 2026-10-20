"use client";

/**
 * KeyboardShortcutsModal — Issue #659
 *
 * Accessible modal that lists all application-wide keyboard shortcuts.
 * Triggered by pressing "?" anywhere in the app.
 */

import React, { useRef } from "react";
import { X, Keyboard } from "lucide-react";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { cn } from "@/lib/utils";

interface ShortcutRow {
  keys: string[];
  description: string;
  requiresAuth?: boolean;
}

const SHORTCUTS: { section: string; items: ShortcutRow[] }[] = [
  {
    section: "Navigation",
    items: [
      { keys: ["/"], description: "Focus search bar" },
      { keys: ["⌘", "K"], description: "Focus search bar (alternative)" },
      { keys: ["N"], description: "New project form", requiresAuth: true },
    ],
  },
  {
    section: "Discovery",
    items: [
      { keys: ["C"], description: "Open comparison tray" },
      { keys: ["⌘", "B"], description: "Toggle bookmarks / watchlist" },
    ],
  },
  {
    section: "General",
    items: [
      { keys: ["?"], description: "Show this help" },
      { keys: ["Esc"], description: "Close modal or drawer" },
    ],
  },
  {
    section: "Project grid",
    items: [
      { keys: ["←", "→"], description: "Move left / right between cards" },
      { keys: ["↑", "↓"], description: "Move up / down between rows" },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  isAuthenticated?: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  isAuthenticated = false,
  onClose,
}: KeyboardShortcutsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useModalFocusTrap(isOpen, dialogRef, closeBtnRef, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className={cn(
          "relative w-full max-w-lg bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl",
          "p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 max-h-[90vh] overflow-y-auto",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-blue-500" aria-hidden="true" />
            </div>
            <h2
              id="shortcuts-modal-title"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut sections */}
        <div className="space-y-6">
          {SHORTCUTS.map(({ section, items }) => (
            <div key={section}>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
                {section}
              </p>
              <div className="space-y-2">
                {items.map(({ keys, description, requiresAuth }) => {
                  const muted = requiresAuth && !isAuthenticated;
                  return (
                    <div
                      key={description}
                      className={cn(
                        "flex items-center justify-between py-2 px-3 rounded-xl",
                        muted
                          ? "opacity-50"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                      )}
                    >
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {description}
                        {requiresAuth && (
                          <span className="ml-2 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                            (requires wallet)
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        {keys.map((key, i) => (
                          <React.Fragment key={i}>
                            <kbd
                              className={cn(
                                "inline-flex items-center justify-center min-w-[28px] h-7 px-2",
                                "text-xs font-mono font-semibold",
                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                                "border border-zinc-200 dark:border-zinc-700",
                                "rounded-lg shadow-[0_1px_0_1px_rgba(0,0,0,0.08)] dark:shadow-none",
                              )}
                            >
                              {key}
                            </kbd>
                            {i < keys.length - 1 && (
                              <span className="text-zinc-300 dark:text-zinc-600 text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500 text-center">
          Shortcuts are disabled while typing in text fields
        </p>
      </div>
    </div>
  );
}
