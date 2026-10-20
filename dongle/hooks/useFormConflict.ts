/**
 * useFormConflict
 *
 * Manages the state of a form-data conflict between a local draft and a
 * server version.  Surfaces:
 * - Whether a conflict is currently active.
 * - The two conflicting versions.
 * - Actions to trigger, resolve, or dismiss the conflict.
 *
 * Designed to slot in between an auto-save / optimistic-update flow and the
 * FormConflictResolution component.
 *
 * Issue #520 – Create form comparison view for conflicts
 */

"use client";

import { useCallback, useState } from "react";
import type { FormVersion } from "@/components/ui/FormConflictResolution";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseFormConflictOptions {
  /**
   * Called after the user resolves the conflict with the merged values they
   * chose.  The caller should update their form state and/or persist the result.
   */
  onResolved?: (mergedValues: Record<string, unknown>) => void;
  /**
   * Called when the user cancels without resolving.
   */
  onCancelled?: () => void;
}

export interface UseFormConflictResult {
  /** Whether a conflict is currently being shown. */
  isConflicting: boolean;
  /** The local (browser) version of the data. */
  localVersion: FormVersion | null;
  /** The remote (server) version of the data. */
  serverVersion: FormVersion | null;
  /**
   * Trigger a conflict by providing both versions.
   * Pass the user's current unsaved values as `local` and the server-side
   * saved state as `server`.
   */
  triggerConflict: (local: FormVersion, server: FormVersion) => void;
  /**
   * Resolve the conflict with the merged values the user chose.
   * Clears the conflict state and fires `onResolved`.
   */
  resolveConflict: (mergedValues: Record<string, unknown>) => void;
  /**
   * Dismiss the conflict panel without applying changes.
   * Fires `onCancelled`.
   */
  dismissConflict: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFormConflict(
  options: UseFormConflictOptions = {}
): UseFormConflictResult {
  const { onResolved, onCancelled } = options;

  const [localVersion, setLocalVersion] = useState<FormVersion | null>(null);
  const [serverVersion, setServerVersion] = useState<FormVersion | null>(null);

  const isConflicting = localVersion !== null && serverVersion !== null;

  const triggerConflict = useCallback((local: FormVersion, server: FormVersion) => {
    setLocalVersion(local);
    setServerVersion(server);
  }, []);

  const resolveConflict = useCallback(
    (mergedValues: Record<string, unknown>) => {
      setLocalVersion(null);
      setServerVersion(null);
      onResolved?.(mergedValues);
    },
    [onResolved]
  );

  const dismissConflict = useCallback(() => {
    setLocalVersion(null);
    setServerVersion(null);
    onCancelled?.();
  }, [onCancelled]);

  return {
    isConflicting,
    localVersion,
    serverVersion,
    triggerConflict,
    resolveConflict,
    dismissConflict,
  };
}
