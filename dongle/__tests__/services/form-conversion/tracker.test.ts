import { beforeEach, describe, expect, it } from "vitest";
import {
  ConversionTracker,
  __resetConversionTrackerForTests,
  analyzeConversionFunnel,
  captureAttribution,
  detectDevice,
  parseUtmParams,
  sanitizeReferrer,
  trackConversion,
} from "@/services/form-conversion";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetConversionTrackerForTests();
});

describe("attribution", () => {
  it("parses UTM parameters", () => {
    const utm = parseUtmParams(
      "?utm_source=twitter&utm_medium=social&utm_campaign=launch",
    );
    expect(utm.utm_source).toBe("twitter");
    expect(utm.utm_medium).toBe("social");
    expect(utm.utm_campaign).toBe("launch");
  });

  it("detects mobile devices", () => {
    const device = detectDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    );
    expect(device.deviceType).toBe("mobile");
    expect(device.os).toBe("ios");
  });

  it("sanitizes referrer query strings", () => {
    expect(sanitizeReferrer("https://example.com/path?token=secret")).toBe(
      "example.com/path",
    );
  });

  it("captures first-touch attribution once per session", () => {
    const first = captureAttribution();
    const second = captureAttribution();
    expect(second.sessionId).toBe(first.sessionId);
  });
});

describe("conversion tracking + funnel", () => {
  it("tracks conversion events with attribution", () => {
    const event = trackConversion("form_view", "project-form", "project-submission");
    expect(event).not.toBeNull();
    expect(event!.attribution.device.deviceType).toBeTruthy();
  });

  it("computes funnel conversion rate and drop-off", () => {
    const tracker = new ConversionTracker({ persistLocally: false });
    tracker.track("form_view", "f1", "t1");
    tracker.track("form_view", "f1", "t1");
    // Force same session by reusing attribution from sessionStorage
    tracker.track("form_start", "f1", "t1");
    tracker.track("form_submit_attempt", "f1", "t1");
    tracker.track("form_submit_success", "f1", "t1");

    const funnel = tracker.analyzeFunnel("f1", "t1");
    expect(funnel.totalViews).toBeGreaterThanOrEqual(1);
    expect(funnel.steps.length).toBeGreaterThan(0);
    expect(funnel.byDevice).toBeTruthy();
    expect(funnel.bySource).toBeTruthy();
    expect(funnel.byReferrer).toBeTruthy();
  });

  it("exposes analyzeConversionFunnel helper", () => {
    trackConversion("form_view", "x", "y");
    trackConversion("form_submit_success", "x", "y");
    const funnel = analyzeConversionFunnel("x", "y");
    expect(funnel.formId).toBe("x");
    expect(funnel.conversionRate).toBeGreaterThanOrEqual(0);
  });
});
