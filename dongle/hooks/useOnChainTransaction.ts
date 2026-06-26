"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createProgressState,
  type TransactionPhase,
  type TransactionProgressState,
} from "@/lib/transaction-progress";

const IDLE_STATE = createProgressState("idle");

export function useOnChainTransaction() {
  const [progress, setProgress] = useState<TransactionProgressState>(IDLE_STATE);
  const lastActionRef = useRef<(() => Promise<unknown>) | null>(null);

  const handlePhaseChange = useCallback(
    (phase: TransactionPhase, meta?: { txHash?: string; error?: Error }) => {
      setProgress(createProgressState(phase, meta));

      if (phase === "signing") {
        toast.message("Approve in Freighter", {
          description: "Your wallet extension should prompt you to sign.",
        });
      } else if (phase === "confirming") {
        toast.message("Submitted to network", {
          description: "Waiting for Stellar confirmation. You can keep this page open.",
        });
      } else if (phase === "success") {
        toast.success("Transaction confirmed on-chain");
      } else if (phase === "failure") {
        toast.error(meta?.error?.message ?? "Transaction failed");
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
    progress,
    run,
    reset,
    retry,
    isInProgress:
      progress.phase !== "idle" &&
      progress.phase !== "success" &&
      progress.phase !== "failure",
  };
}
