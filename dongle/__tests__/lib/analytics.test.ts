import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  anonymizeWalletAddress,
  bucketQueryLength,
  redactSensitiveText,
  sanitizeProperties,
  track,
  trackWalletConnect,
  trackSearch,
  trackFilter,
  trackProjectView,
  trackProjectSubmit,
  trackVerificationRequest,
  trackReviewSubmit,
  trackPageView,
  __setAnalyticsTransportForTests,
  __resetAnalyticsForTests,
  type AnalyticsEvent,
  type AnalyticsTransport,
} from "@/lib/analytics";

const SAMPLE_WALLET =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function createCaptureTransport() {
  const events: AnalyticsEvent[] = [];
  const transport: AnalyticsTransport = {
    send(event) {
      events.push(event);
    },
  };
  return { events, transport };
}

describe("analytics privacy helpers", () => {
  it("anonymizes wallet addresses to an 8-char hex fingerprint", () => {
    const fp = anonymizeWalletAddress(SAMPLE_WALLET);
    expect(fp).toMatch(/^[0-9a-f]{8}$/);
    expect(fp).not.toContain("G");
    expect(fp).not.toEqual(SAMPLE_WALLET);
  });

  it("returns stable fingerprints for the same address", () => {
    expect(anonymizeWalletAddress(SAMPLE_WALLET)).toBe(
      anonymizeWalletAddress(SAMPLE_WALLET),
    );
  });

  it("rejects non-wallet strings", () => {
    expect(anonymizeWalletAddress(null)).toBeNull();
    expect(anonymizeWalletAddress("not-a-wallet")).toBeNull();
    expect(anonymizeWalletAddress("")).toBeNull();
  });

  it("redacts stellar addresses embedded in text", () => {
    const redacted = redactSensitiveText(
      `paid by ${SAMPLE_WALLET} via contract CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
    );
    expect(redacted).not.toContain(SAMPLE_WALLET);
    expect(redacted).toContain("[wallet]");
    expect(redacted).toContain("[contract]");
  });

  it("strips blocked / sensitive property keys", () => {
    const sanitized = sanitizeProperties({
      publicKey: SAMPLE_WALLET,
      wallet_address: SAMPLE_WALLET,
      comment: "this is private review text",
      query: "secret search terms",
      project_id: "stellar-swap",
      rating: 5,
    });

    expect(sanitized).toEqual({
      project_id: "stellar-swap",
      rating: 5,
    });
    expect(JSON.stringify(sanitized)).not.toContain(SAMPLE_WALLET);
    expect(JSON.stringify(sanitized)).not.toContain("private review");
    expect(JSON.stringify(sanitized)).not.toContain("secret search");
  });

  it("drops string values that look like full stellar addresses", () => {
    const sanitized = sanitizeProperties({
      owner: SAMPLE_WALLET,
      label: "ok",
    });
    expect(sanitized).toEqual({ label: "ok" });
  });

  it("buckets query lengths without exposing the query", () => {
    expect(bucketQueryLength(0)).toBe("0");
    expect(bucketQueryLength(2)).toBe("1-2");
    expect(bucketQueryLength(4)).toBe("3-5");
    expect(bucketQueryLength(8)).toBe("6-10");
    expect(bucketQueryLength(15)).toBe("11-20");
    expect(bucketQueryLength(40)).toBe("21+");
  });
});

describe("analytics client + journey helpers", () => {
  let events: AnalyticsEvent[];

  beforeEach(() => {
    const capture = createCaptureTransport();
    events = capture.events;
    __setAnalyticsTransportForTests(capture.transport);
  });

  afterEach(() => {
    __resetAnalyticsForTests();
    vi.unstubAllEnvs();
  });

  it("emits page_view without query strings in the path", () => {
    trackPageView("/discover", { has_query: true });
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("page_view");
    expect(events[0].properties).toMatchObject({
      path: "/discover",
      has_query: true,
    });
  });

  it("emits wallet_connect with fingerprint, never the raw address", () => {
    trackWalletConnect({
      success: true,
      networkLabel: "Testnet",
      walletAddress: SAMPLE_WALLET,
    });
    expect(events[0].name).toBe("wallet_connect");
    expect(events[0].properties?.wallet_fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.stringify(events[0])).not.toContain(SAMPLE_WALLET);
  });

  it("emits wallet_connect_failed without error message bodies", () => {
    trackWalletConnect({ success: false, errorCode: "UserRejected" });
    expect(events[0].name).toBe("wallet_connect_failed");
    expect(events[0].properties).toEqual({ error_code: "UserRejected" });
  });

  it("emits privacy-safe search events (no raw query)", () => {
    trackSearch({ queryLength: 7, resultCount: 3, source: "discover" });
    expect(events[0].name).toBe("search");
    expect(events[0].properties).toMatchObject({
      query_length_bucket: "6-10",
      has_query: true,
      result_count: 3,
      source: "discover",
    });
    expect(events[0].properties).not.toHaveProperty("query");
  });

  it("emits filter events", () => {
    trackFilter({
      filterType: "category",
      filterValue: "DeFi / DEX",
      source: "discover",
    });
    expect(events[0].name).toBe("filter");
    expect(events[0].properties).toMatchObject({
      filter_type: "category",
      filter_value: "DeFi / DEX",
    });
  });

  it("emits project_view", () => {
    trackProjectView("proj-1", { category: "Tools" });
    expect(events[0]).toMatchObject({
      name: "project_view",
      properties: { project_id: "proj-1", category: "Tools" },
    });
  });

  it("emits project_submit success and failure", () => {
    trackProjectSubmit({ success: true, mode: "create", category: "NFTs" });
    trackProjectSubmit({
      success: false,
      mode: "edit",
      errorCode: "transaction_incomplete",
    });
    expect(events.map((e) => e.name)).toEqual([
      "project_submit",
      "project_submit_failed",
    ]);
  });

  it("emits verification_request without the project ref string", () => {
    trackVerificationRequest({ success: true, projectRefLength: 12 });
    expect(events[0].name).toBe("verification_request");
    expect(events[0].properties).toEqual({ project_ref_length: 12 });
  });

  it("emits review_submit without comment text", () => {
    trackReviewSubmit({
      success: true,
      action: "create",
      projectId: "proj-1",
      rating: 4,
      commentLength: 42,
      walletAddress: SAMPLE_WALLET,
    });
    expect(events[0].name).toBe("review_submit");
    expect(events[0].properties).toMatchObject({
      action: "create",
      project_id: "proj-1",
      rating: 4,
      comment_length: 42,
    });
    expect(events[0].properties).not.toHaveProperty("comment");
    expect(JSON.stringify(events[0])).not.toContain(SAMPLE_WALLET);
  });

  it("emits review_update for edit actions", () => {
    trackReviewSubmit({
      success: true,
      action: "update",
      projectId: "proj-1",
      rating: 5,
      commentLength: 10,
    });
    expect(events[0].name).toBe("review_update");
  });

  it("sanitizes properties passed to track()", () => {
    track("project_view", {
      project_id: "x",
      comment: "should be dropped",
      publicKey: SAMPLE_WALLET,
    } as never);
    expect(events[0].properties).toEqual({ project_id: "x" });
  });
});
