/**
 * useFieldUndoRedo
 *
 * Provides per-field undo/redo history for form inputs.
 * - Reverts to the previous value with Ctrl+Z (Cmd+Z on macOS).
 * - Re-applies with Ctrl+Y / Ctrl+Shift+Z (Cmd+Y / Cmd+Shift+Z).
 * - Caps history depth to avoid unbounded memory growth.
 * - Works with controlled inputs (value + onChange pattern) as well as
 *   uncontrolled inputs via the exposed imperative helpers.
 *
 * Issue #518 – Add form field undo/redo functionality
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseFieldUndoRedoOptions<T = string> {
  /** Initial value of the field (also the first history entry). */
  initialValue: T;
  /**
   * Maximum number of history snapshots to retain.
   * Older entries are discarded when the limit is reached.
   * @default 50
   */
  maxHistory?: number;
  /**
   * Minimum milliseconds between two distinct history entries.
   * Rapid successive changes within this window are merged into one snapshot
   * so that a single character typed does not create dozens of undo steps.
   * @default 500
   */
  debounceMs?: number;
}

export interface UseFieldUndoRedoResult<T = string> {
  /** Current field value.  Bind to the input's `value` prop. */
  value: T;
  /** Whether there is a previous state to undo to. */
  canUndo: boolean;
  /** Whether there is a future state to redo to. */
  canRedo: boolean;
  /**
   * onChange handler to attach to the input element.
   * Works for both <input> and <textarea>.
   */
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /**
   * onKeyDown handler to attach to the input element.
   * Intercepts Ctrl/Cmd+Z and Ctrl/Cmd+Y / Ctrl/Cmd+Shift+Z.
   */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Programmatic undo (go back one step). */
  undo: () => void;
  /** Programmatic redo (go forward one step). */
  redo: () => void;
  /** Reset history and value back to the initial value. */
  reset: () => void;
  /**
   * Push a new value into the history stack manually.
   * Useful when the value is set programmatically (e.g., from a paste handler).
   */
  push: (newValue: T) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFieldUndoRedo<T = string>(
  options: UseFieldUndoRedoOptions<T>
): UseFieldUndoRedoResult<T> {
  const { initialValue, maxHistory = 50, debounceMs = 500 } = options;

  // history[0] = oldest, history[cursor] = current
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [cursor, setCursor] = useState<number>(0);

  // Ref for debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pending value that will be flushed into history after the debounce delay
  const pendingValue = useRef<T | null>(null);

  const currentValue = history[cursor] as T;

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Flush the pending debounced value into history immediately. */
  const flushPending = useCallback(
    (value: T, prevHistory: T[], prevCursor: number): [T[], number] => {
      // Truncate any redo-future when a new change arrives
      const base = prevHistory.slice(0, prevCursor + 1);
      const next = [...base, value];
      const trimmed = next.length > maxHistory ? next.slice(next.length - maxHistory) : next;
      return [trimmed, trimmed.length - 1];
    },
    [maxHistory]
  );

  // -----------------------------------------------------------------------
  // Push a value (may be debounced)
  // -----------------------------------------------------------------------

  const push = useCallback(
    (newValue: T) => {
      pendingValue.current = newValue;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      // Optimistically update current shown value
      setHistory((prev) => {
        const base = prev.slice(0, cursor + 1);
        const last = base[base.length - 1];
        // Update the last entry while debouncing so the controlled input feels responsive
        if (last === newValue) return prev;
        const updated = [...base.slice(0, -1), newValue];
        return updated.length > maxHistory
          ? updated.slice(updated.length - maxHistory)
          : updated;
      });
      setCursor((prev) => {
        const base = history.slice(0, prev + 1);
        return Math.max(0, base.length - 1);
      });

      debounceTimer.current = setTimeout(() => {
        if (pendingValue.current === null) return;
        const val = pendingValue.current;
        pendingValue.current = null;
        setHistory((prev) => {
          const [next, _] = flushPending(val, prev, cursor);
          return next;
        });
        setCursor((prev) => {
          const base = history.slice(0, prev + 1);
          const trimLen = Math.min(base.length + 1, maxHistory);
          return trimLen - 1;
        });
      }, debounceMs);
    },
    // cursor and history must be stable refs; using setState callbacks above keeps this safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debounceMs, flushPending, maxHistory]
  );

  // -----------------------------------------------------------------------
  // Undo / Redo
  // -----------------------------------------------------------------------

  const undo = useCallback(() => {
    // Flush any pending debounced value first so undo steps are clean
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (pendingValue.current !== null) {
      // Commit the pending change as a real entry before undoing
      const val = pendingValue.current;
      pendingValue.current = null;
      setHistory((prev) => {
        const [next] = flushPending(val, prev, cursor);
        return next;
      });
    }
    setCursor((prev) => Math.max(0, prev - 1));
  }, [cursor, flushPending]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      setCursor((c) => Math.min(prev.length - 1, c + 1));
      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    pendingValue.current = null;
    setHistory([initialValue]);
    setCursor(0);
  }, [initialValue]);

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      push(e.target.value as unknown as T);
    },
    [push]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (!ctrlOrCmd) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z (both are redo)
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
        return;
      }
    },
    [undo, redo]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    value: currentValue,
    canUndo: cursor > 0,
    canRedo: cursor < history.length - 1,
    handleChange,
    handleKeyDown,
    undo,
    redo,
    reset,
    push,
  };
}
