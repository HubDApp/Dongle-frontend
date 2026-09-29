/**
 * Hook: reCAPTCHA v3 + optional challenge / accessible fallback for forms.
 */

"use client";

import { useCallback, useState } from "react";
import {
  createAccessibleChallenge,
  executeCaptcha,
  validateCaptchaOnSubmit,
  type AccessibleChallenge,
  type CaptchaConfig,
  type CaptchaMode,
  type CaptchaTokenResult,
  type CaptchaValidationResult,
} from "@/services/form-captcha";

export interface UseFormCaptchaOptions {
  action?: string;
  config?: Partial<CaptchaConfig>;
  enabled?: boolean;
}

export function useFormCaptcha(options: UseFormCaptchaOptions = {}) {
  const { action = "form_submit", config, enabled = true } = options;
  const [tokenResult, setTokenResult] = useState<CaptchaTokenResult | null>(null);
  const [mode, setMode] = useState<CaptchaMode>("v3");
  const [challenge, setChallenge] = useState<AccessibleChallenge | null>(null);
  const [accessibleAnswer, setAccessibleAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastValidation, setLastValidation] =
    useState<CaptchaValidationResult | null>(null);

  const runCaptcha = useCallback(async () => {
    if (!enabled) {
      const disabled: CaptchaTokenResult = {
        success: true,
        token: "captcha_disabled",
        score: 1,
        mode: "v3",
        action,
      };
      setTokenResult(disabled);
      setMode("v3");
      return disabled;
    }

    setLoading(true);
    try {
      const result = await executeCaptcha(action, config);
      setTokenResult(result);
      setMode(result.mode);

      if (result.mode === "accessible" || result.mode === "challenge") {
        setChallenge(createAccessibleChallenge());
      }

      return result;
    } finally {
      setLoading(false);
    }
  }, [action, config, enabled]);

  const requestChallenge = useCallback(() => {
    setMode("challenge");
    setChallenge(createAccessibleChallenge());
  }, []);

  const useAccessibleAlternative = useCallback(() => {
    setMode("accessible");
    setChallenge(createAccessibleChallenge());
    setTokenResult({
      success: true,
      token: `accessible:${Date.now()}`,
      score: null,
      mode: "accessible",
      action,
    });
  }, [action]);

  const validateOnSubmit = useCallback(
    (overrideResult?: CaptchaTokenResult | null): CaptchaValidationResult => {
      const validation = validateCaptchaOnSubmit(
        overrideResult !== undefined ? overrideResult : tokenResult,
        {
          mode: overrideResult?.mode ?? mode,
          accessibleAnswer,
          challenge,
          config,
        },
      );
      setLastValidation(validation);

      if (validation.requiresChallenge && (overrideResult?.mode ?? mode) === "v3") {
        setMode("challenge");
        if (!challenge) setChallenge(createAccessibleChallenge());
      }

      return validation;
    },
    [tokenResult, mode, accessibleAnswer, challenge, config],
  );

  return {
    tokenResult,
    mode,
    challenge,
    accessibleAnswer,
    setAccessibleAnswer,
    loading,
    lastValidation,
    runCaptcha,
    requestChallenge,
    useAccessibleAlternative,
    validateOnSubmit,
  };
}
