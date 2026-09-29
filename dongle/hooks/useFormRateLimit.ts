"use client";

/**
 * Hook for checking / consuming form submission rate limits (Issue #554).
 */

import { useCallback, useState } from "react";
import type {
  FormRateLimitConfig,
  RateLimitDecision,
} from "@/services/form-rate-limit";

interface UseFormRateLimitOptions {
  formId: string;
  userId?: string | null;
  /** Optional per-request config overrides (admin / tests). */
  config?: Partial<FormRateLimitConfig>;
}

interface UseFormRateLimitResult {
  decision: RateLimitDecision | null;
  isLimited: boolean;
  errorMessage: string | null;
  check: (dryRun?: boolean) => Promise<RateLimitDecision>;
  resetLocal: () => void;
}

export function useFormRateLimit(
  options: UseFormRateLimitOptions,
): UseFormRateLimitResult {
  const [decision, setDecision] = useState<RateLimitDecision | null>(null);

  const check = useCallback(
    async (dryRun = false): Promise<RateLimitDecision> => {
      const response = await fetch("/api/form-rate-limit/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: options.formId,
          userId: options.userId ?? undefined,
          dryRun,
          config: options.config,
        }),
      });

      const body = (await response.json()) as RateLimitDecision;
      setDecision(body);
      return body;
    },
    [options.formId, options.userId, options.config],
  );

  const resetLocal = useCallback(() => setDecision(null), []);

  return {
    decision,
    isLimited: decision ? !decision.allowed : false,
    errorMessage: decision && !decision.allowed ? decision.message : null,
    check,
    resetLocal,
  };
}
