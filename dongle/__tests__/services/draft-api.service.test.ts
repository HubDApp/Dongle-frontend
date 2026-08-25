/**
 * Tests for DraftApiService
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { draftApiService } from "@/services/draft/draft-api.service";
import type { ProjectDraft } from "@/services/draft/draft.service";

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WALLET = "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX123456";
const DRAFT_ID = "new-project-draft";

const mockDraft: ProjectDraft = {
  id: DRAFT_ID,
  mode: "create",
  lastSaved: "2026-08-25T08:00:00.000Z",
  data: {
    name: "Test Project",
    primaryCategory: "defi",
    tags: ["stellar"],
    description: "A test project",
    websiteUrl: "https://test.com",
    githubUrl: "",
    logoUrl: "",
    docsUrl: "",
  },
};

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    statusText: status === 200 ? "OK" : "Error",
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DraftApiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getDraft ──────────────────────────────────────────────────────────────

  describe("getDraft", () => {
    it("returns the draft on a successful 200 response", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(mockDraft, 200));

      const result = await draftApiService.getDraft(WALLET, DRAFT_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe(DRAFT_ID);
        expect(result.data.data.name).toBe("Test Project");
      }
    });

    it("returns an error on 404", async () => {
      fetchMock.mockResolvedValueOnce(
        makeResponse({ error: "Draft not found" }, 404)
      );

      const result = await draftApiService.getDraft(WALLET, DRAFT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Draft not found");
        expect(result.status).toBe(404);
      }
    });

    it("returns an error when fetch throws (network failure)", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const result = await draftApiService.getDraft(WALLET, DRAFT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Network error");
      }
    });

    it("calls the correct URL", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(mockDraft, 200));

      await draftApiService.getDraft(WALLET, DRAFT_ID);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`/api/drafts/${WALLET}/${DRAFT_ID}`);
    });
  });

  // ── saveDraft ─────────────────────────────────────────────────────────────

  describe("saveDraft", () => {
    it("returns the saved draft on a 200 response", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(mockDraft, 200));

      const draftPayload: Omit<ProjectDraft, "lastSaved"> = {
        id: DRAFT_ID,
        mode: "create",
        data: mockDraft.data,
      };

      const result = await draftApiService.saveDraft(WALLET, draftPayload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe(DRAFT_ID);
      }
    });

    it("sends a PUT request", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(mockDraft, 200));

      await draftApiService.saveDraft(WALLET, {
        id: DRAFT_ID,
        mode: "create",
        data: mockDraft.data,
      });

      const options = fetchMock.mock.calls[0][1] as RequestInit;
      expect(options.method).toBe("PUT");
    });

    it("serialises the payload as JSON", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(mockDraft, 200));

      const payload: Omit<ProjectDraft, "lastSaved"> = {
        id: DRAFT_ID,
        mode: "create",
        data: mockDraft.data,
      };

      await draftApiService.saveDraft(WALLET, payload);

      const options = fetchMock.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(options.body as string) as typeof payload;
      expect(body.mode).toBe("create");
      expect(body.data.name).toBe("Test Project");
    });

    it("returns an error on non-2xx response", async () => {
      fetchMock.mockResolvedValueOnce(
        makeResponse({ error: "Invalid wallet address" }, 400)
      );

      const result = await draftApiService.saveDraft(WALLET, {
        id: DRAFT_ID,
        mode: "create",
        data: mockDraft.data,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Invalid wallet address");
        expect(result.status).toBe(400);
      }
    });

    it("returns an error when fetch throws", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await draftApiService.saveDraft(WALLET, {
        id: DRAFT_ID,
        mode: "create",
        data: mockDraft.data,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Connection refused");
      }
    });
  });

  // ── deleteDraft ───────────────────────────────────────────────────────────

  describe("deleteDraft", () => {
    it("returns success on 200", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse({ success: true }, 200));

      const result = await draftApiService.deleteDraft(WALLET, DRAFT_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.success).toBe(true);
      }
    });

    it("sends a DELETE request", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse({ success: true }, 200));

      await draftApiService.deleteDraft(WALLET, DRAFT_ID);

      const options = fetchMock.mock.calls[0][1] as RequestInit;
      expect(options.method).toBe("DELETE");
    });

    it("returns an error on 404", async () => {
      fetchMock.mockResolvedValueOnce(
        makeResponse({ error: "Draft not found" }, 404)
      );

      const result = await draftApiService.deleteDraft(WALLET, DRAFT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
      }
    });

    it("returns an error when fetch throws", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Timeout"));

      const result = await draftApiService.deleteDraft(WALLET, DRAFT_ID);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Timeout");
      }
    });
  });
});
