"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createProgressState,
  isUserRejectionError,
  isNetworkMismatchError,
  type TransactionPhase,
  type TransactionProgressState,
} from "@/lib/transaction-progress";

const IDLE_STATE = createProgressState("idle");

/**
 * Hook for managing on-chain transaction lifecycle with granular progress states.
 *
 * Provides:
 * - Detailed phase tracking (preparing → signing → submitting → confirming → success/failure)
 * - Toast notifications only for terminal states (success, failure)
 * - Non-blocking pending state display via TransactionProgressPanel
 * - Retry support with last action capture
 * - Actionable failure messages with retry guidance
 */
export function useOnChainTransaction() {
  const [progress, setProgress] = useState<TransactionProgressState>(IDLE_STATE);
  const lastActionRef = useRef<(() => Promise<unknown>) | null>(null);

  const handlePhaseChange = useCallback(
    (phase: TransactionPhase, meta?: { txHash?: string; error?: Error }) => {
      setProgress(createProgressState(phase, meta));

      // Only toast for terminal states (success, failure) to reduce notification noise.
      // Intermediate phases (preparing, signing, submitting, confirming) are displayed
      // via the TransactionProgressPanel component for a non-blocking experience.
      if (phase === "success") {
        toast.success("Transaction confirmed on-chain");
      } else if (phase === "failure") {
        const err = meta?.error;
        const message = err?.message ?? "Transaction failed";

        if (isUserRejectionError(err)) {
          toast.error("Signature cancelled", {
            description: "You can edit your details and try again when ready.",
          });
        } else if (isNetworkMismatchError(err)) {
          toast.error("Network mismatch", {
            description: "Switch Freighter to the expected network, then retry.",
          });
        } else {
          toast.error(message, {
            description: "Review the details below and retry when ready.",
          });
        }
      }
    },
    [],
  );

  const run = useCallback(
    async <T,>(
      action: (onPhaseChange: typeof handlePhaseChange) => Promise<T>,
    ): Promise<T | null> => {
      const wrapped = () => action(handlePhaseChange);
      lastActionRef.current = wrapped;

      try {
        const result = await wrapped();
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        handlePhaseChange("failure", { error: err });
        return null;
      }
    },
    [handlePhaseChange],
  );

  const reset = useCallback(() => {
    setProgress(IDLE_STATE);
  }, []);

  const retry = useCallback(async () => {
    if (!lastActionRef.current) return null;
    reset();
    try {
      return await lastActionRef.current();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      handlePhaseChange("failure", { error: err });
      return null;
    }
  }, [handlePhaseChange, reset]);

  return {
    /** Current progress state with phase, message, and error details */
    progress,
    /** Execute an on-chain action with automatic phase tracking */
    run,
    /** Reset progress to idle state */
    reset,
    /** Retry the last action */
    retry,
    /** Whether a transaction is currently in-flight */
    isInProgress:
      progress.phase !== "idle" &&
      progress.phase !== "success" &&
      progress.phase !== "failure",
  };
}
