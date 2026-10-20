/**
 * Form conversion tracker — events, persistence, and funnel analysis.
 */

import { DEFAULT_CONFIG, STORAGE_KEY, createConfig } from "./config";
import { captureAttribution } from "./attribution";
import type {
  ConversionConfig,
  ConversionEvent,
  ConversionEventName,
  ConversionFunnel,
  FunnelStep,
} from "./types";

function createEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function loadEvents(): ConversionEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversionEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events: ConversionEvent[], max: number): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = events.slice(-max);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota */
  }
}

export class ConversionTracker {
  private config: ConversionConfig;
  private events: ConversionEvent[];

  constructor(config: Partial<ConversionConfig> = {}) {
    this.config = createConfig(config);
    this.events = this.config.persistLocally ? loadEvents() : [];
  }

  track(
    name: ConversionEventName,
    formId: string,
    formType: string,
    properties?: Record<string, string | number | boolean | null>,
  ): ConversionEvent | null {
    if (!this.config.enabled) return null;

    const event: ConversionEvent = {
      id: createEventId(),
      name,
      formId,
      formType,
      timestamp: Date.now(),
      attribution: captureAttribution(),
      properties,
    };

    this.events.push(event);
    if (this.config.persistLocally) {
      saveEvents(this.events, this.config.maxEventsStored);
    }

    return event;
  }

  getEvents(formId?: string, formType?: string): ConversionEvent[] {
    return this.events.filter((e) => {
      if (formId && e.formId !== formId) return false;
      if (formType && e.formType !== formType) return false;
      return true;
    });
  }

  clearEvents(): void {
    this.events = [];
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Build a conversion funnel with drop-off and attribution breakdowns.
   */
  analyzeFunnel(formId: string, formType?: string): ConversionFunnel {
    const events = this.getEvents(formId, formType);
    const steps = this.config.funnelSteps;

    const stepData: FunnelStep[] = steps.map((stepName, index) => {
      const matching = events.filter((e) => e.name === stepName);
      const sessions = new Set(matching.map((e) => e.attribution.sessionId));
      const prevCount =
        index === 0
          ? sessions.size
          : new Set(
              events
                .filter((e) => e.name === steps[index - 1])
                .map((e) => e.attribution.sessionId),
            ).size;

      const count = sessions.size;
      const dropOffRate =
        prevCount === 0 ? 0 : Math.max(0, 1 - count / prevCount);

      return {
        name: stepName,
        count,
        uniqueSessions: count,
        dropOffRate: Number(dropOffRate.toFixed(4)),
      };
    });

    const viewSessions = new Set(
      events
        .filter((e) => e.name === "form_view")
        .map((e) => e.attribution.sessionId),
    );
    const conversionSessions = new Set(
      events
        .filter((e) => e.name === "form_submit_success")
        .map((e) => e.attribution.sessionId),
    );

    const totalViews = viewSessions.size;
    const totalConversions = conversionSessions.size;
    const conversionRate =
      totalViews === 0 ? 0 : Number((totalConversions / totalViews).toFixed(4));

    return {
      formId,
      formType: formType ?? "*",
      steps: stepData,
      conversionRate,
      totalViews,
      totalConversions,
      bySource: this.breakdown(events, (e) => e.attribution.utm.utm_source ?? "direct"),
      byDevice: this.breakdown(events, (e) => e.attribution.device.deviceType),
      byReferrer: this.breakdown(
        events,
        (e) => e.attribution.referrer ?? "direct",
      ),
    };
  }

  private breakdown(
    events: ConversionEvent[],
    keyFn: (e: ConversionEvent) => string,
  ): Record<string, { views: number; conversions: number; rate: number }> {
    const map: Record<
      string,
      { viewSessions: Set<string>; conversionSessions: Set<string> }
    > = {};

    for (const e of events) {
      const key = keyFn(e).slice(0, 100);
      if (!map[key]) {
        map[key] = {
          viewSessions: new Set(),
          conversionSessions: new Set(),
        };
      }
      if (e.name === "form_view") {
        map[key].viewSessions.add(e.attribution.sessionId);
      }
      if (e.name === "form_submit_success") {
        map[key].conversionSessions.add(e.attribution.sessionId);
      }
    }

    const out: Record<string, { views: number; conversions: number; rate: number }> =
      {};
    for (const [key, val] of Object.entries(map)) {
      const views = val.viewSessions.size;
      const conversions = val.conversionSessions.size;
      out[key] = {
        views,
        conversions,
        rate: views === 0 ? 0 : Number((conversions / views).toFixed(4)),
      };
    }
    return out;
  }
}

/** Shared singleton for browser usage. */
let defaultTracker: ConversionTracker | null = null;

export function getConversionTracker(
  config?: Partial<ConversionConfig>,
): ConversionTracker {
  if (!defaultTracker || config) {
    defaultTracker = new ConversionTracker(config ?? DEFAULT_CONFIG);
  }
  return defaultTracker;
}

export function trackConversion(
  name: ConversionEventName,
  formId: string,
  formType: string,
  properties?: Record<string, string | number | boolean | null>,
): ConversionEvent | null {
  return getConversionTracker().track(name, formId, formType, properties);
}

export function analyzeConversionFunnel(
  formId: string,
  formType?: string,
): ConversionFunnel {
  return getConversionTracker().analyzeFunnel(formId, formType);
}

/** Test helper */
export function __resetConversionTrackerForTests(): void {
  defaultTracker = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
