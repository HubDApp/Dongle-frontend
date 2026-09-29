import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  FORM_AUDIT_LOG_RETENTION_MS,
  FORM_AUDIT_LOG_STORAGE_KEY,
  MAX_FORM_AUDIT_VALUE_LENGTH,
  formAuditLogService,
  redactIpAddress,
} from "@/services/audit/form-audit-log.service";
import { setIdGenerator, resetIdGenerator } from "@/lib/id-generator";

// ─── localStorage mock ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ─── helpers ──────────────────────────────────────────────────────────────────
let idCounter = 0;
function nextId() { return `form-audit-${++idCounter}`; }

const BASE = {
  formId: "project-form",
  formType: "project-create",
  actor: "GACTOR123",
};

describe("formAuditLogService", () => {
  beforeEach(() => {
    localStorage.clear();
    idCounter = 0;
    setIdGenerator(nextId);
  });

  afterEach(() => {
    localStorage.clear();
    resetIdGenerator();
  });

  // ── record ────────────────────────────────────────────────────────────────

  describe("record", () => {
    it("returns an entry with the required audit fields", () => {
      const entry = formAuditLogService.record({
        ...BASE,
        action: "field_change",
        field: "name",
        previousValue: "",
        value: "Dongle",
        ipAddress: "203.0.113.7",
        ipHash: "ip_deadbeef",
        ipSource: "server",
      });

      expect(entry.id).toBe("form-audit-1");
      expect(entry.formId).toBe("project-form");
      expect(entry.formType).toBe("project-create");
      expect(entry.actor).toBe("GACTOR123");
      expect(entry.action).toBe("field_change");
      expect(entry.field).toBe("name");
      expect(entry.previousValue).toBe("");
      expect(entry.value).toBe("Dongle");
      expect(entry.ipAddress).toBe("203.0.113.7");
      expect(entry.ipHash).toBe("ip_deadbeef");
      expect(entry.ipSource).toBe("server");
      expect(typeof entry.timestamp).toBe("string");
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
    });

    it("defaults missing IP fields to null / unavailable", () => {
      const entry = formAuditLogService.record({ ...BASE, action: "form_submit" });

      expect(entry.ipAddress).toBeNull();
      expect(entry.ipHash).toBeNull();
      expect(entry.ipSource).toBe("unavailable");
    });

    it("persists entries to localStorage", () => {
      formAuditLogService.record({ ...BASE, action: "field_change", field: "name", value: "A" });

      const raw = localStorage.getItem(FORM_AUDIT_LOG_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].field).toBe("name");
    });

    it("omits blank field/previousValue and keeps metadata", () => {
      const entry = formAuditLogService.record({
        ...BASE,
        action: "form_submit",
        field: "   ",
        metadata: { mode: "create" },
      });

      expect(entry.field).toBeUndefined();
      expect(entry.previousValue).toBeUndefined();
      expect(entry.metadata).toEqual({ mode: "create" });
    });

    it("caps very long field values", () => {
      const longValue = "x".repeat(MAX_FORM_AUDIT_VALUE_LENGTH + 250);
      const entry = formAuditLogService.record({
        ...BASE,
        action: "field_change",
        field: "description",
        value: longValue,
      });

      expect(entry.value).toHaveLength(MAX_FORM_AUDIT_VALUE_LENGTH);
    });

    it("accumulates multiple entries", () => {
      formAuditLogService.record({ ...BASE, action: "field_change", field: "a", value: "1" });
      formAuditLogService.record({ ...BASE, action: "field_change", field: "b", value: "2" });
      formAuditLogService.record({ ...BASE, action: "form_submit" });

      expect(formAuditLogService.count()).toBe(3);
    });
  });

  // ── list / search ─────────────────────────────────────────────────────────

  describe("list", () => {
    beforeEach(() => {
      formAuditLogService.record({
        formId: "project-form",
        formType: "project-create",
        actor: "GALICE",
        action: "field_change",
        field: "name",
        previousValue: "",
        value: "Alpha",
        ipAddress: "203.0.113.7",
      });
      formAuditLogService.record({
        formId: "review-form",
        formType: "review-create",
        actor: "GBOB",
        action: "field_change",
        field: "comment",
        previousValue: "",
        value: "Great project",
        ipAddress: "198.51.100.4",
      });
      formAuditLogService.record({
        formId: "project-form",
        formType: "project-create",
        actor: "GALICE",
        action: "form_submit",
        ipAddress: "203.0.113.7",
      });
    });

    it("returns all entries", () => {
      expect(formAuditLogService.list()).toHaveLength(3);
    });

    it("filters by formId", () => {
      const entries = formAuditLogService.list({ formId: "project-form" });
      expect(entries).toHaveLength(2);
      entries.forEach((e) => expect(e.formId).toBe("project-form"));
    });

    it("filters by formType and actor", () => {
      expect(formAuditLogService.list({ formType: "review-create" })).toHaveLength(1);
      expect(formAuditLogService.list({ actor: "GALICE" })).toHaveLength(2);
    });

    it("filters by action", () => {
      const entries = formAuditLogService.list({ action: "form_submit" });
      expect(entries).toHaveLength(1);
      expect(entries[0].actor).toBe("GALICE");
    });

    it("filters by since/until", () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      const future = new Date(Date.now() + 60_000).toISOString();

      expect(formAuditLogService.list({ since: past })).toHaveLength(3);
      expect(formAuditLogService.list({ until: past })).toHaveLength(0);
      expect(formAuditLogService.list({ since: future })).toHaveLength(0);
    });

    it("honours the limit option", () => {
      expect(formAuditLogService.list({ limit: 2 })).toHaveLength(2);
      expect(formAuditLogService.list({ limit: 0 })).toHaveLength(0);
    });
  });

  describe("search", () => {
    beforeEach(() => {
      formAuditLogService.record({
        formId: "project-form",
        formType: "project-create",
        actor: "GALICE",
        action: "field_change",
        field: "description",
        value: "hello world",
        ipAddress: "203.0.113.7",
        metadata: { source: "autosave" },
      });
      formAuditLogService.record({
        formId: "review-form",
        formType: "review-create",
        actor: "GBOB",
        action: "form_submit",
        ipAddress: "198.51.100.4",
      });
    });

    it("matches the acting identity, case-insensitively", () => {
      const results = formAuditLogService.search("galice");
      expect(results).toHaveLength(1);
      expect(results[0].actor).toBe("GALICE");
    });

    it("matches the field name and recorded value", () => {
      expect(formAuditLogService.search("desc")).toHaveLength(1);
      expect(formAuditLogService.search("hello world")).toHaveLength(1);
    });

    it("matches the recorded IP address", () => {
      const results = formAuditLogService.search("198.51.100");
      expect(results).toHaveLength(1);
      expect(results[0].actor).toBe("GBOB");
    });

    it("matches metadata values", () => {
      expect(formAuditLogService.search("autosave")).toHaveLength(1);
    });

    it("combines a query with a filter", () => {
      expect(formAuditLogService.search("GALICE", { formId: "review-form" })).toHaveLength(0);
      expect(formAuditLogService.search("GALICE", { formId: "project-form" })).toHaveLength(1);
    });

    it("returns everything for an empty query", () => {
      expect(formAuditLogService.search("")).toHaveLength(2);
    });

    it("supports query via list()", () => {
      expect(formAuditLogService.list({ query: "GBOB" })).toHaveLength(1);
    });
  });

  // ── getById / count ───────────────────────────────────────────────────────

  describe("getById / count", () => {
    it("returns the correct entry by id and null for unknown ids", () => {
      const created = formAuditLogService.record({ ...BASE, action: "form_submit" });
      expect(formAuditLogService.getById(created.id)?.id).toBe(created.id);
      expect(formAuditLogService.getById("does-not-exist")).toBeNull();
    });

    it("counts entries", () => {
      expect(formAuditLogService.count()).toBe(0);
      formAuditLogService.record({ ...BASE, action: "form_submit" });
      expect(formAuditLogService.count()).toBe(1);
    });
  });

  // ── exportCsv ─────────────────────────────────────────────────────────────

  describe("exportCsv", () => {
    it("emits a header and one row per entry", () => {
      formAuditLogService.record({
        ...BASE,
        action: "field_change",
        field: "name",
        previousValue: "",
        value: "Dongle, Inc",
        ipAddress: "203.0.113.7",
        ipHash: "ip_deadbeef",
      });

      const csv = formAuditLogService.exportCsv();
      const [header, row] = csv.split("\n");
      expect(header).toBe(
        "id,formId,formType,actor,action,field,previousValue,value,timestamp,ipAddress,ipHash",
      );
      expect(row).toContain('"Dongle, Inc"');
      expect(row).toContain("203.0.113.7");
    });

    it("returns only the header when empty", () => {
      expect(formAuditLogService.exportCsv().split("\n")).toHaveLength(1);
    });
  });

  // ── redaction ─────────────────────────────────────────────────────────────

  describe("redactedList", () => {
    it("partially redacts identities and IP addresses", () => {
      formAuditLogService.record({
        ...BASE,
        actor: "GABCDEFGHIJKLMNOP",
        action: "form_submit",
        ipAddress: "203.0.113.7",
      });

      const [entry] = formAuditLogService.redactedList();
      expect(entry.actor).toBe("GABCD...KLMNOP");
      expect(entry.ipAddress).toBe("203.0.x.x");
    });
  });

  describe("redactIpAddress", () => {
    it("redacts IPv4 and IPv6 hosts", () => {
      expect(redactIpAddress("203.0.113.7")).toBe("203.0.x.x");
      expect(redactIpAddress("2001:db8:85a3::8a2e")).toBe("2001:db8::x");
      expect(redactIpAddress("unknown")).toBe("unknown");
    });
  });

  // ── retention ─────────────────────────────────────────────────────────────

  describe("pruneOldEntries", () => {
    it("removes entries older than the retention period", () => {
      const oldTimestamp = new Date(Date.now() - FORM_AUDIT_LOG_RETENTION_MS - 86_400_000).toISOString();
      const freshTimestamp = new Date().toISOString();
      localStorage.setItem(
        FORM_AUDIT_LOG_STORAGE_KEY,
        JSON.stringify([
          { id: "old", formId: "f", formType: "t", actor: "A", action: "form_submit", timestamp: oldTimestamp, ipAddress: null, ipHash: null, ipSource: "unavailable" },
          { id: "fresh", formId: "f", formType: "t", actor: "A", action: "form_submit", timestamp: freshTimestamp, ipAddress: null, ipHash: null, ipSource: "unavailable" },
        ]),
      );

      expect(formAuditLogService.pruneOldEntries()).toBe(1);
      expect(formAuditLogService.list().map((e) => e.id)).toEqual(["fresh"]);
    });

    it("is a no-op when everything is within retention", () => {
      formAuditLogService.record({ ...BASE, action: "form_submit" });
      expect(formAuditLogService.pruneOldEntries()).toBe(0);
      expect(formAuditLogService.count()).toBe(1);
    });
  });

  // ── resilience ────────────────────────────────────────────────────────────

  describe("resilience", () => {
    it("returns an empty list for corrupt localStorage data", () => {
      localStorage.setItem(FORM_AUDIT_LOG_STORAGE_KEY, "not-valid-json{{{");
      expect(formAuditLogService.list()).toHaveLength(0);
    });

    it("skips partial records but keeps valid ones", () => {
      const valid = {
        id: "good-id",
        formId: "project-form",
        formType: "project-create",
        actor: "GACTOR",
        action: "field_change",
        timestamp: new Date().toISOString(),
        ipAddress: "203.0.113.7",
        ipHash: "ip_1",
        ipSource: "server",
      };
      localStorage.setItem(
        FORM_AUDIT_LOG_STORAGE_KEY,
        JSON.stringify([{ id: "", formId: "x" }, valid]),
      );

      const entries = formAuditLogService.list();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("good-id");
    });

    it("rejects entries with unknown action values", () => {
      const entry = {
        id: "e1",
        formId: "f",
        formType: "t",
        actor: "A",
        action: "delete_everything",
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(FORM_AUDIT_LOG_STORAGE_KEY, JSON.stringify([entry]));
      expect(formAuditLogService.list()).toHaveLength(0);
    });

    it("ignores a non-array payload", () => {
      localStorage.setItem(FORM_AUDIT_LOG_STORAGE_KEY, JSON.stringify({ nope: true }));
      expect(formAuditLogService.list()).toHaveLength(0);
    });
  });

  // ── _clearForTesting ──────────────────────────────────────────────────────

  describe("_clearForTesting", () => {
    it("removes all entries from storage", () => {
      formAuditLogService.record({ ...BASE, action: "form_submit" });
      expect(formAuditLogService.count()).toBe(1);

      formAuditLogService._clearForTesting();
      expect(formAuditLogService.count()).toBe(0);
      expect(localStorage.getItem(FORM_AUDIT_LOG_STORAGE_KEY)).toBeNull();
    });
  });
});
