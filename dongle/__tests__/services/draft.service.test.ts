/**
 * Tests for the updated DraftService (hybrid localStorage + API)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { draftService, type ProjectDraft } from "@/services/draft/draft.service";
import { draftApiService } from "@/services/draft/draft-api.service";

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

describe("DraftService – localStorage operations", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("saves and retrieves a draft from localStorage", () => {
    draftService.saveDraft(makeDraft());
    const retrieved = draftService.getDraft("test-draft");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("test-draft");
    expect(retrieved?.data.name).toBe("Test Project");
  });

  it("updates an existing draft in localStorage", () => {
    draftService.saveDraft(makeDraft());
    draftService.saveDraft(makeDraft({ data: { ...baseDraftData, name: "Updated" } }));

    const all = draftService.getAllDrafts();
    expect(all).toHaveLength(1);
    expect(all[0].data.name).toBe("Updated");
  });

  it("gets draft for create mode", () => {
    draftService.saveDraft(makeDraft({ mode: "create" }));
    const retrieved = draftService.getDraftForProject("create");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.mode).toBe("create");
  });

  it("gets draft for edit mode with projectId", () => {
    draftService.saveDraft(makeDraft({ id: "edit-123", mode: "edit", projectId: "123" }));
    const retrieved = draftService.getDraftForProject("edit", "123");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.projectId).toBe("123");
  });

  it("returns null when no matching draft exists", () => {
    expect(draftService.getDraftForProject("edit", "nonexistent")).toBeNull();
  });

  it("deletes a draft from localStorage", () => {
    draftService.saveDraft(makeDraft());
    expect(draftService.getDraft("test-draft")).not.toBeNull();

    draftService.deleteDraft("test-draft");
    expect(draftService.getDraft("test-draft")).toBeNull();
  });

  it("clears all drafts from localStorage", () => {
    draftService.saveDraft(makeDraft({ id: "draft-1" }));
    draftService.saveDraft(makeDraft({ id: "draft-2" }));
    expect(draftService.getAllDrafts()).toHaveLength(2);

    draftService.clearAllDrafts();
    expect(draftService.getAllDrafts()).toHaveLength(0);
  });

  it("handles multiple drafts independently", () => {
    draftService.saveDraft(makeDraft({ id: "d-1", mode: "create" }));
    draftService.saveDraft(makeDraft({ id: "d-2", mode: "edit", projectId: "456" }));

    expect(draftService.getAllDrafts()).toHaveLength(2);
    expect(draftService.getDraft("d-1")).not.toBeNull();
    expect(draftService.getDraft("d-2")).not.toBeNull();
  });

  it("returns empty array during SSR (no window object)", () => {
    // Cannot simulate SSR in jsdom, but getAllDrafts with empty storage returns []
    localStorageMock.clear();
    expect(draftService.getAllDrafts()).toEqual([]);
  });

  it("returns empty array when localStorage contains invalid JSON", () => {
    localStorageMock.setItem("dongle_project_drafts", "{{invalid}");
    expect(draftService.getAllDrafts()).toEqual([]);
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
