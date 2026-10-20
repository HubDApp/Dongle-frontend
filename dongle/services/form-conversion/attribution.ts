/**
 * Attribution helpers — UTM, referrer, and device capture (privacy-safe).
 */

import type { AttributionContext, DeviceInfo, UtmParams } from "./types";
import { ATTRIBUTION_KEY } from "./config";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function parseUtmParams(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): UtmParams {
  const params = new URLSearchParams(search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
}

export function detectDevice(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): DeviceInfo {
  const lower = ua.toLowerCase();
  let deviceType: DeviceInfo["deviceType"] = "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    deviceType = "mobile";
  } else if (!ua) {
    deviceType = "unknown";
  }

  let browser = "unknown";
  if (lower.includes("edg/")) browser = "edge";
  else if (lower.includes("chrome/")) browser = "chrome";
  else if (lower.includes("safari/") && !lower.includes("chrome")) browser = "safari";
  else if (lower.includes("firefox/")) browser = "firefox";

  let os = "unknown";
  if (lower.includes("android")) os = "android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ipod"))
    os = "ios";
  else if (lower.includes("windows")) os = "windows";
  else if (lower.includes("mac os") || lower.includes("macos")) os = "macos";
  else if (lower.includes("linux")) os = "linux";

  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth || 0 : 0;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight || 0 : 0;
  const touchCapable =
    typeof window !== "undefined"
      ? "ontouchstart" in window || navigator.maxTouchPoints > 0
      : false;

  return {
    deviceType,
    browser,
    os,
    viewportWidth,
    viewportHeight,
    touchCapable,
  };
}

/** Strip query/hash and host from referrer — path-only when same-origin-ish. */
export function sanitizeReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    // Keep host + path only; drop query (may contain tokens / PII)
    return `${url.host}${url.pathname}`.slice(0, 200);
  } catch {
    return referrer.slice(0, 200);
  }
}

export function captureAttribution(): AttributionContext {
  if (typeof window === "undefined") {
    return {
      utm: {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_term: null,
        utm_content: null,
      },
      referrer: null,
      landingPath: null,
      device: detectDevice(""),
      sessionId: createSessionId(),
      capturedAt: Date.now(),
    };
  }

  // First-touch attribution: reuse existing session attribution if present
  try {
    const existing = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (existing) {
      return JSON.parse(existing) as AttributionContext;
    }
  } catch {
    /* ignore */
  }

  const ctx: AttributionContext = {
    utm: parseUtmParams(window.location.search),
    referrer: sanitizeReferrer(document.referrer || null),
    landingPath: window.location.pathname,
    device: detectDevice(navigator.userAgent),
    sessionId: createSessionId(),
    capturedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore quota */
  }

  return ctx;
}

export function clearAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ATTRIBUTION_KEY);
  } catch {
    /* ignore */
  }
}
