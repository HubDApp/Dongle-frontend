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
  trackFormSubmit,
  trackFormSubmitSuccess,
  trackFormSubmitError,
  trackFormFieldChange,
  trackFormAbandon,
  trackFormBackupCreated,
  trackFormBackupRestored,
  trackFormBackupFailed,
  trackFormBackupRetentionCleaned,
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

describe("form submission analytics", () => {
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

  it("emits form_submit with form type and field count", () => {
    trackFormSubmit({ formType: "project", fieldCount: 10 });
    expect(events[0].name).toBe("form_submit");
    expect(events[0].properties).toMatchObject({
      form_type: "project",
      field_count: 10,
    });
  });

  it("emits form_submit_success with form type and field count", () => {
    trackFormSubmitSuccess({ formType: "verification", fieldCount: 1 });
    expect(events[0].name).toBe("form_submit_success");
    expect(events[0].properties).toMatchObject({
      form_type: "verification",
      field_count: 1,
    });
  });

  it("emits form_submit_error with error code", () => {
    trackFormSubmitError({
      formType: "review",
      fieldCount: 2,
      errorCode: "transaction_failed",
    });
    expect(events[0].name).toBe("form_submit_error");
    expect(events[0].properties).toMatchObject({
      form_type: "review",
      field_count: 2,
      error_code: "transaction_failed",
    });
  });

  it("emits form_field_change with field details", () => {
    trackFormFieldChange({
      formType: "project",
      fieldName: "name",
      fieldIndex: 1,
      totalFields: 10,
    });
    expect(events[0].name).toBe("form_field_change");
    expect(events[0].properties).toMatchObject({
      form_type: "project",
      field_name: "name",
      field_index: 1,
      total_fields: 10,
    });
  });

  it("emits form_abandon with touched field count", () => {
    trackFormAbandon({
      formType: "review",
      fieldCount: 2,
      touchedFields: 1,
    });
    expect(events[0].name).toBe("form_abandon");
    expect(events[0].properties).toMatchObject({
      form_type: "review",
      field_count: 2,
      touched_fields: 1,
    });
  });

  it("strips wallet addresses from form submission events", () => {
    trackFormSubmit({
      formType: "project",
      fieldCount: 5,
      walletAddress: SAMPLE_WALLET,
    });
    expect(events[0].properties).not.toHaveProperty("wallet_address");
    expect(events[0].properties).toHaveProperty("wallet_fingerprint");
    expect(JSON.stringify(events[0])).not.toContain(SAMPLE_WALLET);
  });
});

describe("form backup and recovery analytics", () => {
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

  it("emits form_backup_created with form type, id, and backup count", () => {
    trackFormBackupCreated({
      formType: "project",
      formId: "proj-1",
      backupId: "backup-123",
      backupCount: 3,
    });
    expect(events[0].name).toBe("form_backup_created");
    expect(events[0].properties).toMatchObject({
      form_type: "project",
      form_id: "proj-1",
      backup_id: "backup-123",
      backup_count: 3,
    });
  });

  it("emits form_backup_restored with form type, id, and backup age", () => {
    trackFormBackupRestored({
      formType: "verification",
      formId: "verify-1",
      backupId: "backup-456",
      restoredFromAgeMs: 60000,
    });
    expect(events[0].name).toBe("form_backup_restored");
    expect(events[0].properties).toMatchObject({
      form_type: "verification",
      form_id: "verify-1",
      backup_id: "backup-456",
      restored_from_age_ms: 60000,
    });
  });

  it("emits form_backup_failed with error code", () => {
    trackFormBackupFailed({
      formType: "review",
      formId: "review-1",
      errorCode: "storage_quota_exceeded",
    });
    expect(events[0].name).toBe("form_backup_failed");
    expect(events[0].properties).toMatchObject({
      form_type: "review",
      form_id: "review-1",
      error_code: "storage_quota_exceeded",
    });
  });

  it("emits form_backup_retention_cleaned with counts", () => {
    trackFormBackupRetentionCleaned({
      formType: "project",
      formId: "proj-1",
      removedCount: 5,
      remainingCount: 5,
    });
    expect(events[0].name).toBe("form_backup_retention_cleaned");
    expect(events[0].properties).toMatchObject({
      form_type: "project",
      form_id: "proj-1",
      removed_count: 5,
      remaining_count: 5,
    });
  });
});

describe("form archive analytics", () => {
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

  it("emits form_archive_created with form type, id, and archived count", () => {
    trackFormArchiveCreated({
      formType: "project",
      formId: "proj-1",
      backupId: "backup-123",
      archivedCount: 3,
    });
    expect(events[0].name).toBe("form_archive_created");
    expect(events[0].properties).toMatchObject({
      form_type: "project",
      form_id: "proj-1",
      backup_id: "backup-123",
      archived_count: 3,
    });
  });

  it("emits form_archive_restored with form type, id, and backup id", () => {
    trackFormArchiveRestored({
      formType: "verification",
      formId: "verify-1",
      backupId: "backup-456",
    });
    expect(events[0].name).toBe("form_archive_restored");
    expect(events[0].properties).toMatchObject({
      form_type: "verification",
      form_id: "verify-1",
      backup_id: "backup-456",
    });
  });

  it("emits form_archive_search with query length and result count", () => {
    trackFormArchiveSearch({
      formType: "project",
      formId: "proj-1",
      queryLength: 5,
      resultCount: 3,
    });
    expect(events[0].name).toBe("form_archive_search");
    expect(events[0].properties).toMatchObject({
      form_type: "project",
      form_id: "proj-1",
      query_length: 5,
      result_count: 3,
    });
  });

  it("emits form_archive_deleted with form type, id, and backup id", () => {
    trackFormArchiveDeleted({
      formType: "review",
      formId: "review-1",
      backupId: "archived-789",
    });
    expect(events[0].name).toBe("form_archive_deleted");
    expect(events[0].properties).toMatchObject({
      form_type: "review",
      form_id: "review-1",
      backup_id: "archived-789",
    });
  });

  it("emits form_archive_retention_cleaned with counts", () => {
    trackFormArchiveRetentionCleaned({
      formType: "project",
      formId: "proj-1",
      removedCount: 5,
      remainingCount: 10,
    });
    expect(events[0].name).toBe("form_archive_retention_cleaned");
    expect(events[0].properties).toMatchObject({
      form_type: "project",
      form_id: "proj-1",
      removed_count: 5,
      remaining_count: 10,
    });
  });
});
