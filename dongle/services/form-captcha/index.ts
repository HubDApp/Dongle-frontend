/**
 * Form CAPTCHA Protection Service
 */

export {
  DEFAULT_CONFIG,
  STORAGE_KEY_CONSENT,
  createConfig,
  isCaptchaConfigured,
} from "./config";

export {
  executeCaptcha,
  validateCaptchaOnSubmit,
  createAccessibleChallenge,
  verifyAccessibleAnswer,
  hashAnswer,
} from "./client";

export { verifyCaptchaToken } from "./verify";
export type { ServerVerifyOptions } from "./verify";

export type {
  CaptchaMode,
  CaptchaTokenResult,
  CaptchaValidationResult,
  CaptchaConfig,
  AccessibleChallenge,
} from "./types";
