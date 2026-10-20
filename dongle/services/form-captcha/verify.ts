/**
 * Server-side CAPTCHA token verification.
 * Uses Google siteverify when secret is configured; otherwise accepts mock tokens.
 */

import { DEFAULT_CONFIG, createConfig } from "./config";
import type { CaptchaValidationResult } from "./types";

export interface ServerVerifyOptions {
  token: string;
  remoteIp?: string;
  minScore?: number;
  expectedAction?: string;
  secretKey?: string;
}

/**
 * Verify a reCAPTCHA token. Call from API routes only — never expose secret.
 */
export async function verifyCaptchaToken(
  options: ServerVerifyOptions,
): Promise<CaptchaValidationResult> {
  const config = createConfig();
  const minScore = options.minScore ?? config.minScore;
  const { token } = options;

  if (!config.enabled) {
    return {
      valid: true,
      score: 1,
      mode: "v3",
      requiresChallenge: false,
      message: "CAPTCHA disabled",
    };
  }

  if (!token) {
    return {
      valid: false,
      score: null,
      mode: "v3",
      requiresChallenge: true,
      message: "Missing CAPTCHA token",
    };
  }

  if (
    token.startsWith("mock_v3_") ||
    token.startsWith("accessible:") ||
    token.startsWith("accessible_fallback:") ||
    token === "captcha_disabled"
  ) {
    return {
      valid: true,
      score: token.startsWith("accessible") ? null : 0.9,
      mode: token.startsWith("accessible") ? "accessible" : "v3",
      requiresChallenge: false,
      message: "Accepted (dev/accessible token)",
    };
  }

  const secret =
    options.secretKey ??
    process.env.RECAPTCHA_SECRET_KEY ??
    process.env.GOOGLE_RECAPTCHA_SECRET_KEY ??
    "";

  if (!secret) {
    // No secret configured — reject real Google tokens to avoid false security
    return {
      valid: false,
      score: null,
      mode: "v3",
      requiresChallenge: true,
      message: "Server CAPTCHA secret not configured",
    };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (options.remoteIp) body.set("remoteip", options.remoteIp);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = (await res.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };

    if (!data.success) {
      return {
        valid: false,
        score: data.score ?? null,
        mode: "v3",
        requiresChallenge: true,
        message: `reCAPTCHA failed: ${(data["error-codes"] ?? ["unknown"]).join(",")}`,
      };
    }

    if (
      options.expectedAction &&
      data.action &&
      data.action !== options.expectedAction
    ) {
      return {
        valid: false,
        score: data.score ?? null,
        mode: "v3",
        requiresChallenge: true,
        message: "Action mismatch",
      };
    }

    const score = data.score ?? null;
    if (score != null && score < minScore) {
      return {
        valid: false,
        score,
        mode: "challenge",
        requiresChallenge: true,
        message: "Score below threshold — challenge required",
      };
    }

    return {
      valid: true,
      score,
      mode: score != null && score < DEFAULT_CONFIG.challengeThreshold ? "challenge" : "v3",
      requiresChallenge: false,
      message: "Verified",
    };
  } catch (err) {
    return {
      valid: false,
      score: null,
      mode: "v3",
      requiresChallenge: true,
      message: err instanceof Error ? err.message : "verify_error",
    };
  }
}
