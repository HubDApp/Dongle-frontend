"use client";

import React from "react";
import type { CaptchaMode } from "@/services/form-captcha";
import type { AccessibleChallenge } from "@/services/form-captcha";

export interface FormCaptchaProps {
  mode: CaptchaMode;
  challenge: AccessibleChallenge | null;
  accessibleAnswer: string;
  onAnswerChange: (value: string) => void;
  onUseAccessible: () => void;
  onRequestChallenge: () => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * Privacy-respecting CAPTCHA UI: invisible v3 by default, with an
 * accessible math challenge alternative (no Google badge required).
 */
export function FormCaptcha({
  mode,
  challenge,
  accessibleAnswer,
  onAnswerChange,
  onUseAccessible,
  onRequestChallenge,
  loading = false,
  error = null,
  className = "",
}: FormCaptchaProps) {
  return (
    <div
      className={`space-y-2 ${className}`}
      role="group"
      aria-label="Bot protection"
    >
      {mode === "v3" && (
        <p className="text-xs text-neutral-500">
          Protected by reCAPTCHA v3
          {loading ? " — verifying…" : ""}.{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-neutral-800"
            onClick={onUseAccessible}
          >
            Use accessible alternative
          </button>
        </p>
      )}

      {(mode === "challenge" || mode === "accessible") && challenge && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <label
            htmlFor={`captcha-challenge-${challenge.challengeId}`}
            className="block text-sm font-medium text-neutral-800"
          >
            {mode === "accessible"
              ? "Accessibility check"
              : "Additional verification"}
            : {challenge.question}
          </label>
          <input
            id={`captcha-challenge-${challenge.challengeId}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={accessibleAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="mt-2 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            aria-describedby="captcha-help"
            aria-invalid={error ? true : undefined}
          />
          <p id="captcha-help" className="mt-1 text-xs text-neutral-500">
            This check stays on-device and does not load third-party trackers.
          </p>
          {mode === "challenge" && (
            <button
              type="button"
              className="mt-2 text-xs underline"
              onClick={onRequestChallenge}
            >
              New challenge
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
