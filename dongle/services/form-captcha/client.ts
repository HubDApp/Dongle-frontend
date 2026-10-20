/**
 * reCAPTCHA v3 client + optional challenge / accessible fallback.
 * Privacy-respecting: skips remote scripts when DNT or user opts out.
 */

import { DEFAULT_CONFIG, createConfig, isCaptchaConfigured } from "./config";
import type {
  AccessibleChallenge,
  CaptchaConfig,
  CaptchaMode,
  CaptchaTokenResult,
  CaptchaValidationResult,
} from "./types";

const SCRIPT_ID = "dongle-recaptcha-v3";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render?: (
        container: string | HTMLElement,
        parameters: Record<string, unknown>,
      ) => number;
    };
  }
}

function prefersPrivacyMode(config: CaptchaConfig): boolean {
  if (!config.respectPrivacySignals) return false;
  if (typeof navigator === "undefined") return false;
  const dnt =
    (navigator as Navigator & { doNotTrack?: string }).doNotTrack === "1" ||
    (window as Window & { doNotTrack?: string }).doNotTrack === "1";
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData,
  );
  return dnt || saveData;
}

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.grecaptcha) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script_load_failed")));
      if (window.grecaptcha) resolve();
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("script_load_failed"));
    document.head.appendChild(script);
  });
}

/** Simple FNV-1a for accessible challenge answer hashing (client demo). */
export function hashAnswer(answer: string): string {
  const normalized = answer.trim().toLowerCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createAccessibleChallenge(): AccessibleChallenge {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 1;
  const answer = String(a + b);
  const challengeId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `ch${Date.now().toString(36)}`;

  return {
    question: `What is ${a} + ${b}?`,
    answerHash: hashAnswer(answer),
    challengeId,
  };
}

export function verifyAccessibleAnswer(
  challenge: AccessibleChallenge,
  userAnswer: string,
): boolean {
  return hashAnswer(userAnswer) === challenge.answerHash;
}

/**
 * Execute reCAPTCHA v3. Falls back to accessible mode when privacy signals
 * are set, site key missing, or script fails.
 */
export async function executeCaptcha(
  action?: string,
  configOverrides: Partial<CaptchaConfig> = {},
): Promise<CaptchaTokenResult> {
  const config = createConfig({ ...DEFAULT_CONFIG, ...configOverrides });
  const act = action ?? config.defaultAction;

  if (!config.enabled) {
    return {
      success: true,
      token: "captcha_disabled",
      score: 1,
      mode: "v3",
      action: act,
    };
  }

  if (prefersPrivacyMode(config) && config.allowAccessibleFallback) {
    return {
      success: true,
      token: `accessible:${Date.now()}`,
      score: null,
      mode: "accessible",
      action: act,
    };
  }

  if (!isCaptchaConfigured(config)) {
    // Dev / unconfigured: emit mock token so forms remain testable
    return {
      success: true,
      token: `mock_v3_${act}_${Date.now().toString(36)}`,
      score: 0.9,
      mode: "v3",
      action: act,
    };
  }

  try {
    await loadRecaptchaScript(config.siteKey);
    const token = await new Promise<string>((resolve, reject) => {
      if (!window.grecaptcha) {
        reject(new Error("grecaptcha_missing"));
        return;
      }
      window.grecaptcha.ready(() => {
        window.grecaptcha!
          .execute(config.siteKey, { action: act })
          .then(resolve)
          .catch(reject);
      });
    });

    return {
      success: true,
      token,
      score: null, // score only known after server verify
      mode: "v3",
      action: act,
    };
  } catch (err) {
    if (config.allowAccessibleFallback) {
      return {
        success: true,
        token: `accessible_fallback:${Date.now()}`,
        score: null,
        mode: "accessible",
        action: act,
        error: err instanceof Error ? err.message : "execute_failed",
      };
    }
    return {
      success: false,
      token: null,
      score: null,
      mode: "v3",
      action: act,
      error: err instanceof Error ? err.message : "execute_failed",
    };
  }
}

/**
 * Client-side validation gate before submit.
 * Server must still verify tokens with Google's siteverify API.
 */
export function validateCaptchaOnSubmit(
  result: CaptchaTokenResult | null,
  options: {
    mode?: CaptchaMode;
    accessibleAnswer?: string;
    challenge?: AccessibleChallenge | null;
    config?: Partial<CaptchaConfig>;
  } = {},
): CaptchaValidationResult {
  const config = createConfig(options.config);
  const mode = options.mode ?? result?.mode ?? "v3";

  if (!config.enabled) {
    return {
      valid: true,
      score: 1,
      mode,
      requiresChallenge: false,
      message: "CAPTCHA disabled",
    };
  }

  if (mode === "accessible") {
    if (!config.allowAccessibleFallback) {
      return {
        valid: false,
        score: null,
        mode,
        requiresChallenge: true,
        message: "Accessible CAPTCHA is not allowed",
      };
    }
    if (!options.challenge || options.accessibleAnswer == null) {
      return {
        valid: false,
        score: null,
        mode,
        requiresChallenge: true,
        message: "Please complete the accessibility challenge",
      };
    }
    const ok = verifyAccessibleAnswer(options.challenge, options.accessibleAnswer);
    return {
      valid: ok,
      score: ok ? 1 : 0,
      mode,
      requiresChallenge: !ok,
      message: ok ? "Accessible challenge passed" : "Incorrect answer — try again",
    };
  }

  if (!result || !result.success || !result.token) {
    return {
      valid: false,
      score: null,
      mode,
      requiresChallenge: true,
      message: "CAPTCHA token missing — challenge required",
    };
  }

  // Mock / known-good tokens in dev
  if (result.token.startsWith("mock_v3_") || result.token === "captcha_disabled") {
    return {
      valid: true,
      score: result.score ?? 0.9,
      mode: "v3",
      requiresChallenge: false,
      message: "CAPTCHA accepted",
    };
  }

  const score = result.score;
  if (score != null && score < config.challengeThreshold) {
    return {
      valid: false,
      score,
      mode: "challenge",
      requiresChallenge: true,
      message: "Low trust score — please complete the challenge",
    };
  }

  if (score != null && score < config.minScore) {
    return {
      valid: false,
      score,
      mode,
      requiresChallenge: true,
      message: "CAPTCHA score too low",
    };
  }

  return {
    valid: true,
    score,
    mode: result.mode,
    requiresChallenge: false,
    message: "CAPTCHA token ready for server verification",
  };
}

export type { CaptchaConfig, CaptchaTokenResult, CaptchaValidationResult, CaptchaMode, AccessibleChallenge };
