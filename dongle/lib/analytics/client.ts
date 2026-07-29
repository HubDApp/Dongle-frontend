/**
 * Lightweight, privacy-conscious analytics client.
 *
 * Default transport logs in development and no-ops (or posts to an optional
 * ingest URL) in production. No third-party SDK is required.
 */

import {
  anonymizeWalletAddress,
  sanitizeProperties,
} from "./privacy";
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsProperties,
  AnalyticsTransport,
} from "./types";

const SESSION_STORAGE_KEY = "dongle_analytics_session";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const id = createSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return createSessionId();
  }
}

function isAnalyticsEnabled(): boolean {
  // Explicit opt-out
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false") return false;
  // Default: enabled in browser contexts
  return typeof window !== "undefined";
}

function getIngestUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_ANALYTICS_INGEST_URL?.trim();
  return url && url.length > 0 ? url : null;
}

/** Console transport used in development when no ingest URL is configured. */
class ConsoleTransport implements AnalyticsTransport {
  send(event: AnalyticsEvent): void {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[analytics]", event.name, event.properties ?? {});
  }
}

/** Optional HTTP ingest — fire-and-forget, never throws into UI flows. */
class HttpTransport implements AnalyticsTransport {
  constructor(private readonly url: string) {}

  send(event: AnalyticsEvent): void {
    try {
      const body = JSON.stringify(event);
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(this.url, blob);
        return;
      }
      void fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        mode: "cors",
      }).catch(() => {
        /* swallow network errors — analytics must never break the app */
      });
    } catch {
      /* ignore */
    }
  }
}

class CompositeTransport implements AnalyticsTransport {
  constructor(private readonly transports: AnalyticsTransport[]) {}

  send(event: AnalyticsEvent): void {
    for (const t of this.transports) {
      try {
        t.send(event);
      } catch {
        /* isolate transport failures */
      }
    }
  }
}

let transport: AnalyticsTransport | null = null;

function getTransport(): AnalyticsTransport {
  if (transport) return transport;

  const transports: AnalyticsTransport[] = [new ConsoleTransport()];
  const ingest = getIngestUrl();
  if (ingest) {
    transports.push(new HttpTransport(ingest));
  }
  transport = new CompositeTransport(transports);
  return transport;
}

/** Test-only: replace the active transport. */
export function __setAnalyticsTransportForTests(next: AnalyticsTransport | null): void {
  transport = next;
}

/** Test-only: reset session helper state via clearing transport. */
export function __resetAnalyticsForTests(): void {
  transport = null;
}

/**
 * Emit a typed analytics event. Properties are sanitized before send.
 * Safe to call from SSR (no-op) and never throws.
 */
export function track(
  name: AnalyticsEventName,
  properties?: AnalyticsProperties,
): void {
  try {
    if (!isAnalyticsEnabled()) return;

    const event: AnalyticsEvent = {
      name,
      properties: sanitizeProperties(properties),
      timestamp: new Date().toISOString(),
      sessionId: getOrCreateSessionId(),
    };

    getTransport().send(event);
  } catch {
    /* analytics must never break product flows */
  }
}

/**
 * Attach a privacy-safe wallet fingerprint to properties when an address is known.
 * Returns a new object; never mutates the input.
 */
export function withWalletFingerprint(
  properties: AnalyticsProperties | undefined,
  walletAddress: string | null | undefined,
): AnalyticsProperties {
  const fingerprint = anonymizeWalletAddress(walletAddress);
  return {
    ...(properties ?? {}),
    ...(fingerprint ? { wallet_fingerprint: fingerprint } : {}),
  };
}
