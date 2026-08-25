/**
 * Tests for the updated DraftService (hybrid encrypted localStorage + API)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { draftService, type ProjectDraft } from "@/services/draft/draft.service";
import { draftApiService } from "@/services/draft/draft-api.service";
import { isEncrypted, ENCRYPTION_PREFIX } from "@/lib/crypto-storage";

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// ---------------------------------------------------------------------------
// Mock DraftApiService
// ---------------------------------------------------------------------------

vi.mock("@/services/draft/draft-api.service", () => ({
  draftApiService: {
    getDraft: vi.fn(),
    saveDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));

const apiGet = vi.mocked(draftApiService.getDraft);
const apiSave = vi.mocked(draftApiService.saveDraft);
const apiDelete = vi.mocked(draftApiService.deleteDraft);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WALLET = "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX123456";
const OTHER_WALLET = "GAYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY654321";

const baseDraftData: ProjectDraft["data"] = {
  name: "Test Project",
  primaryCategory: "defi",
  tags: ["stellar"],
  description: "A test project",
  websiteUrl: "https://test.com",
  githubUrl: "",
  logoUrl: "",
  docsUrl: "",
};

function makeDraft(overrides?: Partial<ProjectDraft>): Omit<ProjectDraft, "lastSaved"> {
  return {
    id: "test-draft",
    mode: "create",
    data: baseDraftData,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DraftService – encrypted localStorage operations", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("saves and retrieves a draft from localStorage with encryption", () => {
    draftService.saveDraft(makeDraft(), WALLET);
    const retrieved = draftService.getDraft("test-draft", WALLET);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("test-draft");
    expect(retrieved?.data.name).toBe("Test Project");

    // Verify raw storage content is encrypted
    const rawStored = localStorage.getItem("dongle_project_drafts");
    expect(rawStored).not.toBeNull();
    expect(isEncrypted(rawStored)).toBe(true);
    expect(rawStored).not.toContain("Test Project");
  });

  it("migrates existing unencrypted drafts on first load", () => {
    const unencrypted = JSON.stringify([
      { id: "legacy-1", mode: "create", data: baseDraftData, lastSaved: "2026-01-01" },
    ]);
    localStorage.setItem("dongle_project_drafts", unencrypted);
    expect(isEncrypted(localStorage.getItem("dongle_project_drafts"))).toBe(false);

    const drafts = draftService.getAllDrafts(WALLET);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe("legacy-1");

    // Verify it is now migrated and encrypted
    expect(isEncrypted(localStorage.getItem("dongle_project_drafts"))).toBe(true);
  });

  it("logs warning and returns empty array when decryption fails due to wrong key", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Save with WALLET key
    draftService.saveDraft(makeDraft(), WALLET);

    // Try to load with OTHER_WALLET key
    const drafts = draftService.getAllDrafts(OTHER_WALLET);
    expect(drafts).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("updates an existing draft in encrypted localStorage", () => {
    draftService.saveDraft(makeDraft(), WALLET);
    draftService.saveDraft(makeDraft({ data: { ...baseDraftData, name: "Updated" } }), WALLET);

    const all = draftService.getAllDrafts(WALLET);
    expect(all).toHaveLength(1);
    expect(all[0].data.name).toBe("Updated");
  });

  it("gets draft for create mode", () => {
    draftService.saveDraft(makeDraft({ mode: "create" }), WALLET);
    const retrieved = draftService.getDraftForProject("create", undefined, WALLET);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.mode).toBe("create");
  });

  it("gets draft for edit mode with projectId", () => {
    draftService.saveDraft(makeDraft({ id: "edit-123", mode: "edit", projectId: "123" }), WALLET);
    const retrieved = draftService.getDraftForProject("edit", "123", WALLET);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.projectId).toBe("123");
  });

  it("returns null when no matching draft exists", () => {
    expect(draftService.getDraftForProject("edit", "nonexistent", WALLET)).toBeNull();
  });

  it("deletes a draft from encrypted localStorage", () => {
    draftService.saveDraft(makeDraft(), WALLET);
    expect(draftService.getDraft("test-draft", WALLET)).not.toBeNull();

    draftService.deleteDraft("test-draft", WALLET);
    expect(draftService.getDraft("test-draft", WALLET)).toBeNull();
  });

  it("clears all drafts from localStorage", () => {
    draftService.saveDraft(makeDraft({ id: "draft-1" }), WALLET);
    draftService.saveDraft(makeDraft({ id: "draft-2" }), WALLET);
    expect(draftService.getAllDrafts(WALLET)).toHaveLength(2);

    draftService.clearAllDrafts();
    expect(draftService.getAllDrafts(WALLET)).toHaveLength(0);
  });

  it("handles multiple drafts independently", () => {
    draftService.saveDraft(makeDraft({ id: "d-1", mode: "create" }), WALLET);
    draftService.saveDraft(makeDraft({ id: "d-2", mode: "edit", projectId: "456" }), WALLET);

    expect(draftService.getAllDrafts(WALLET)).toHaveLength(2);
    expect(draftService.getDraft("d-1", WALLET)).not.toBeNull();
    expect(draftService.getDraft("d-2", WALLET)).not.toBeNull();
  });

  it("returns empty array when localStorage contains invalid corrupted string", () => {
    localStorageMock.setItem("dongle_project_drafts", `${ENCRYPTION_PREFIX}invalid_corrupt_ciphertext`);
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(draftService.getAllDrafts(WALLET)).toEqual([]);
  });
});

describe("DraftService – content detection", () => {
  it("returns false for all-empty data", () => {
    expect(
      draftService.hasContent({
        name: "",
        primaryCategory: "",
        tags: [],
        description: "",
        websiteUrl: "",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      })
    ).toBe(false);
  });

  it("returns true when name has content", () => {
    expect(draftService.hasContent({ ...baseDraftData, name: "X", description: "", websiteUrl: "" })).toBe(true);
  });

  it("returns true when tags array is non-empty", () => {
    expect(
      draftService.hasContent({ name: "", primaryCategory: "", tags: ["stellar"], description: "", websiteUrl: "", githubUrl: "", logoUrl: "", docsUrl: "" })
    ).toBe(true);
  });

  it("returns true when optional auditReportUrl has content", () => {
    expect(
      draftService.hasContent({ ...baseDraftData, name: "", description: "", websiteUrl: "", auditReportUrl: "https://audit.com" })
    ).toBe(true);
  });
});

describe("DraftService – remote operations", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("saveDraftRemote returns the persisted draft on success", async () => {
    const returned: ProjectDraft = { ...makeDraft(), lastSaved: "2026-01-01T00:00:00Z" } as ProjectDraft;
    apiSave.mockResolvedValueOnce({ ok: true, data: returned });

    const result = await draftService.saveDraftRemote(WALLET, makeDraft());
    expect(result).not.toBeNull();
    expect(result?.lastSaved).toBe("2026-01-01T00:00:00Z");
  });

  it("saveDraftRemote returns null on API error", async () => {
    apiSave.mockResolvedValueOnce({ ok: false, error: "Server error", status: 500 });

    const result = await draftService.saveDraftRemote(WALLET, makeDraft());
    expect(result).toBeNull();
  });

  it("getDraftRemote returns the draft on success", async () => {
    const returned: ProjectDraft = { ...makeDraft(), lastSaved: "2026-01-01T00:00:00Z" } as ProjectDraft;
    apiGet.mockResolvedValueOnce({ ok: true, data: returned });

    const result = await draftService.getDraftRemote(WALLET, "test-draft");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("test-draft");
  });

  it("getDraftRemote returns null on 404", async () => {
    apiGet.mockResolvedValueOnce({ ok: false, error: "Draft not found", status: 404 });

    const result = await draftService.getDraftRemote(WALLET, "missing");
    expect(result).toBeNull();
  });

  it("getDraftRemote returns null on network error", async () => {
    apiGet.mockResolvedValueOnce({ ok: false, error: "Network error" });

    const result = await draftService.getDraftRemote(WALLET, "test-draft");
    expect(result).toBeNull();
  });

  it("deleteDraftRemote calls the API delete endpoint", async () => {
    apiDelete.mockResolvedValueOnce({ ok: true, data: { success: true } });

    await draftService.deleteDraftRemote(WALLET, "test-draft");
    expect(apiDelete).toHaveBeenCalledWith(WALLET, "test-draft");
  });

  it("deleteDraftRemote does not throw on API error", async () => {
    apiDelete.mockResolvedValueOnce({ ok: false, error: "Server error", status: 500 });

    await expect(
      draftService.deleteDraftRemote(WALLET, "test-draft")
    ).resolves.not.toThrow();
  });
});
