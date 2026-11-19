/**
 * localStorage <-> in-memory state consistency (#909)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { draftService, type ProjectDraft } from "@/services/draft/draft.service";
import { MockReviewRepository } from "@/services/data-access/MockReviewRepository.service";

vi.mock("@/services/draft/draft-api.service", () => ({
  draftApiService: { getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn() },
}));

let quotaExceeded = false;
const storage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      if (quotaExceeded) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

const WALLET = "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX123456";
const REVIEWS_KEY = "dongle_reviews";
const DRAFTS_KEY = "dongle_project_drafts";

const draft: Omit<ProjectDraft, "lastSaved"> = {
  id: "draft-1",
  mode: "create",
  data: {
    name: "Consistency",
    primaryCategory: "defi",
    tags: ["stellar"],
    description: "desc",
    websiteUrl: "https://example.com",
    githubUrl: "",
    logoUrl: "",
    docsUrl: "",
  },
};

const review = {
  projectId: "p1",
  projectName: "Project One",
  userAddress: WALLET,
  rating: 4,
  comment: "Solid",
  helpfulVotes: [],
  unhelpfulVotes: [],
};

beforeEach(() => {
  storage.clear();
  quotaExceeded = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("draft service", () => {
  it("save -> load returns the same data", () => {
    draftService.saveDraft(draft, WALLET);
    const loaded = draftService.getDraft("draft-1", WALLET);
    expect(loaded?.data).toEqual(draft.data);
    expect(loaded?.mode).toBe("create");
  });

  it("returns no drafts for corrupted storage instead of throwing", () => {
    storage.setItem(DRAFTS_KEY, "ENC_V1:not-valid-ciphertext");
    expect(draftService.getAllDrafts(WALLET)).toEqual([]);
    storage.setItem(DRAFTS_KEY, "{not json");
    expect(draftService.getAllDrafts(WALLET)).toEqual([]);
  });

  it("keeps the previous draft when the quota is exceeded", () => {
    draftService.saveDraft(draft, WALLET);
    quotaExceeded = true;
    expect(() =>
      draftService.saveDraft({ ...draft, data: { ...draft.data, name: "Changed" } }, WALLET),
    ).not.toThrow();
    quotaExceeded = false;
    expect(draftService.getDraft("draft-1", WALLET)?.data.name).toBe("Consistency");
  });
});

describe("review repository", () => {
  it("add -> raw localStorage read matches the returned review", async () => {
    const repo = new MockReviewRepository();
    const created = await repo.create(review);
    const raw = JSON.parse(storage.getItem(REVIEWS_KEY) ?? "[]");
    expect(raw).toHaveLength(1);
    expect(raw[0]).toMatchObject({ ...review, id: created.id, createdAt: created.createdAt });
    expect(await repo.getById(created.id)).toMatchObject(review);
  });

  it("reflects a write made by another tab (storage event)", async () => {
    const repo = new MockReviewRepository();
    await repo.create(review);
    const otherTab = [{ ...review, id: "from-other-tab", createdAt: new Date().toISOString() }];
    storage.setItem(REVIEWS_KEY, JSON.stringify(otherTab));
    window.dispatchEvent(new StorageEvent("storage", { key: REVIEWS_KEY }));
    const all = await repo.getAll();
    expect(all.map((r) => r.id)).toEqual(["from-other-tab"]);
  });

  it("drops corrupted records and survives invalid JSON", async () => {
    const repo = new MockReviewRepository();
    storage.setItem(REVIEWS_KEY, "{broken");
    expect(await repo.getAll()).toEqual([]);
    storage.setItem(
      REVIEWS_KEY,
      JSON.stringify([{ id: 1, rating: "bad" }, { ...review, id: "ok", createdAt: "2026-01-01T00:00:00.000Z" }]),
    );
    expect((await repo.getAll()).map((r) => r.id)).toEqual(["ok"]);
  });

  it("leaves stored reviews unchanged when the quota is exceeded", async () => {
    const repo = new MockReviewRepository();
    const first = await repo.create(review);
    quotaExceeded = true;
    await expect(repo.create({ ...review, comment: "second" })).rejects.toThrow();
    quotaExceeded = false;
    expect((await repo.getAll()).map((r) => r.id)).toEqual([first.id]);
  });
});
