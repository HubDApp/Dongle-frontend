/**
 * Privacy helpers for session recording — mask passwords and sensitive fields.
 */

import type { SessionRecordingConfig } from "./types";
import { DEFAULT_CONFIG } from "./config";

export function isSensitiveField(
  fieldId: string | undefined | null,
  config: SessionRecordingConfig = DEFAULT_CONFIG,
): boolean {
  if (!fieldId) return false;
  const lower = fieldId.toLowerCase();
  return config.sensitiveFieldPatterns.some((p) => lower.includes(p.toLowerCase()));
}

export function isPasswordInput(el: Element | null): boolean {
  if (!(el instanceof HTMLInputElement)) return false;
  return el.type === "password";
}

/**
 * Mask values for recording. Passwords → fixed mask; other sensitive → length only.
 */
export function maskValue(
  value: string,
  fieldId?: string | null,
  el?: Element | null,
  config: SessionRecordingConfig = DEFAULT_CONFIG,
): string {
  if (isPasswordInput(el) || isSensitiveField(fieldId, config)) {
    return "••••••••";
  }
  // Truncate long free text; strip emails-looking content
  const trimmed = value.slice(0, 80);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "[email]";
  }
  if (/^G[A-Z2-7]{55}$/.test(trimmed) || /^C[A-Z2-7]{55}$/.test(trimmed)) {
    return "[wallet]";
  }
  return trimmed;
}

export function getConsent(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("dongle:form-session-recording:consent");
    if (raw === null) return null;
    return raw === "true";
  } catch {
    return null;
  }
}

export function setConsent(allowed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      "dongle:form-session-recording:consent",
      allowed ? "true" : "false",
    );
    if (!allowed) {
      localStorage.removeItem("dongle:form-session-recordings:v1");
    }
  } catch {
    /* ignore */
  }
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("dongle:form-session-recording:consent");
  } catch {
    /* ignore */
  }
}
