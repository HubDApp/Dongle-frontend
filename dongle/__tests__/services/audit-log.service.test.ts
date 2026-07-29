import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { auditLogService, AUDIT_LOG_STORAGE_KEY } from "@/services/audit/audit-log.service";
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
function nextId() { return `test-id-${++idCounter}`; }

describe("auditLogService", () => {
  beforeEach(() => {
    localStorage.clear();
    idCounter = 0;
    setIdGenerator(nextId);
  });

  afterEach(() => {
    localStorage.clear();
    resetIdGenerator();
  });

  // ── append ──────────────────────────────────────────────────────────────────

  describe("append", () => {
    it("returns an entry with the correct fields", () => {
      const entry = auditLogService.append({
        actor: "GADMIN123",
        action: "verification_approved",
        targetId: "req_1",
        targetLabel: "Lumina DEX",
      });

      expect(entry.id).toBe("test-id-1");
      expect(entry.actor).toBe("GADMIN123");
      expect(entry.action).toBe("verification_approved");
      expect(entry.targetId).toBe("req_1");
      expect(entry.targetLabel).toBe("Lumina DEX");
      expect(typeof entry.timestamp).toBe("string");
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
    });

    it("persists the entry to localStorage", () => {
      auditLogService.append({
        actor: "GADMIN123",
        action: "fee_updated",
        targetId: "verification_fee",
        targetLabel: "Verification Fee",
        metadata: { newValue: 2.5 },
      });

      const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe("fee_updated");
      expect(parsed[0].metadata.newValue).toBe(2.5);
    });

    it("includes reason when provided", () => {
      const entry = auditLogService.append({
        actor: "GADMIN123",
        action: "report_resolved",
        targetId: "report_42",
        targetLabel: "Report report_42",
        reason: "Content violates terms",
      });

      expect(entry.reason).toBe("Content violates terms");
    });

    it("omits reason when empty string", () => {
      const entry = auditLogService.append({
        actor: "GADMIN123",
        action: "report_dismissed",
        targetId: "report_43",
        targetLabel: "Report report_43",
        reason: "   ",
      });

      expect(entry.reason).toBeUndefined();
    });

    it("accumulates multiple entries", () => {
      auditLogService.append({ actor: "G1", action: "verification_approved", targetId: "r1", targetLabel: "A" });
      auditLogService.append({ actor: "G1", action: "verification_rejected", targetId: "r2", targetLabel: "B" });
      auditLogService.append({ actor: "G2", action: "fee_updated", targetId: "fee", targetLabel: "Fee" });

      expect(auditLogService.count()).toBe(3);
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list", () => {
    beforeEach(() => {
      auditLogService.append({ actor: "GADMIN1", action: "verification_approved", targetId: "r1", targetLabel: "Lumina DEX" });
      auditLogService.append({ actor: "GADMIN2", action: "verification_rejected", targetId: "r2", targetLabel: "Stellar Stake" });
      auditLogService.append({ actor: "GADMIN1", action: "fee_updated", targetId: "fee", targetLabel: "Fee" });
    });

    it("returns all entries newest-first", () => {
      const entries = auditLogService.list();
      expect(entries).toHaveLength(3);
      // All three actions should be present (order may vary within the same ms)
      const actions = entries.map((e) => e.action);
      expect(actions).toContain("verification_approved");
      expect(actions).toContain("verification_rejected");
      expect(actions).toContain("fee_updated");
    });

    it("filters by actor", () => {
      const entries = auditLogService.list({ actor: "GADMIN1" });
      expect(entries).toHaveLength(2);
      entries.forEach((e) => expect(e.actor).toBe("GADMIN1"));
    });

    it("filters by action", () => {
      const entries = auditLogService.list({ action: "verification_approved" });
      expect(entries).toHaveLength(1);
      expect(entries[0].targetLabel).toBe("Lumina DEX");
    });

    it("returns empty array when filter matches nothing", () => {
      const entries = auditLogService.list({ actor: "GNOTHERE" });
      expect(entries).toHaveLength(0);
    });

    it("returns empty array when storage is empty", () => {
      auditLogService._clearForTesting();
      expect(auditLogService.list()).toHaveLength(0);
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────────

  describe("getById", () => {
    it("returns the correct entry by id", () => {
      const created = auditLogService.append({
        actor: "GADMIN1",
        action: "report_resolved",
        targetId: "rep_1",
        targetLabel: "Report rep_1",
      });

      const found = auditLogService.getById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.action).toBe("report_resolved");
    });

    it("returns null for unknown id", () => {
      expect(auditLogService.getById("does-not-exist")).toBeNull();
    });
  });

  // ── count ───────────────────────────────────────────────────────────────────

  describe("count", () => {
    it("returns 0 when storage is empty", () => {
      expect(auditLogService.count()).toBe(0);
    });

    it("increments after each append", () => {
      auditLogService.append({ actor: "G1", action: "fee_updated", targetId: "f", targetLabel: "Fee" });
      expect(auditLogService.count()).toBe(1);
      auditLogService.append({ actor: "G1", action: "verification_approved", targetId: "r", targetLabel: "X" });
      expect(auditLogService.count()).toBe(2);
    });
  });

  // ── resilience ──────────────────────────────────────────────────────────────

  describe("resilience", () => {
    it("returns empty array for corrupt localStorage data", () => {
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, "not-valid-json{{{");
      expect(auditLogService.list()).toHaveLength(0);
    });

    it("skips partial/invalid records but keeps valid ones", () => {
      const valid = {
        id: "good-id",
        actor: "GADMIN",
        action: "fee_updated",
        targetId: "fee",
        targetLabel: "Fee",
        timestamp: new Date().toISOString(),
      };
      const corrupt = { id: "", actor: "X" }; // missing required fields
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify([corrupt, valid]));

      const entries = auditLogService.list();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("good-id");
    });

    it("rejects entries with unknown action values", () => {
      const entry = {
        id: "e1",
        actor: "GADMIN",
        action: "unknown_action",
        targetId: "x",
        targetLabel: "X",
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify([entry]));
      expect(auditLogService.list()).toHaveLength(0);
    });
  });

  // ── _clearForTesting ────────────────────────────────────────────────────────

  describe("_clearForTesting", () => {
    it("removes all entries from storage", () => {
      auditLogService.append({ actor: "G1", action: "fee_updated", targetId: "f", targetLabel: "Fee" });
      expect(auditLogService.count()).toBe(1);

      auditLogService._clearForTesting();
      expect(auditLogService.count()).toBe(0);
      expect(localStorage.getItem(AUDIT_LOG_STORAGE_KEY)).toBeNull();
    });
  });
});
