/**
 * Tests for draft service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { draftService, type ProjectDraft } from "@/services/draft/draft.service";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
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

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
});

describe("DraftService", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllTimers();
  });

  it("should save and retrieve a draft", () => {
    const draft: Omit<ProjectDraft, "lastSaved"> = {
      id: "test-draft",
      mode: "create",
      data: {
        name: "Test Project",
        primaryCategory: "defi",
        tags: ["tag1"],
        description: "A test project",
        websiteUrl: "https://test.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      },
    };

    draftService.saveDraft(draft);
    const retrieved = draftService.getDraft("test-draft");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("test-draft");
    expect(retrieved?.data.name).toBe("Test Project");
  });

  it("should get draft for create mode", () => {
    const draft: Omit<ProjectDraft, "lastSaved"> = {
      id: "create-draft",
      mode: "create",
      data: {
        name: "New Project",
        primaryCategory: "gaming",
        tags: [],
        description: "New project description",
        websiteUrl: "https://new.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      },
    };

    draftService.saveDraft(draft);
    const retrieved = draftService.getDraftForProject("create");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.mode).toBe("create");
  });

  it("should get draft for edit mode with projectId", () => {
    const draft: Omit<ProjectDraft, "lastSaved"> = {
      id: "edit-draft-123",
      mode: "edit",
      projectId: "123",
      data: {
        name: "Edited Project",
        primaryCategory: "infrastructure",
        tags: [],
        description: "Edited description",
        websiteUrl: "https://edited.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      },
    };

    draftService.saveDraft(draft);
    const retrieved = draftService.getDraftForProject("edit", "123");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.projectId).toBe("123");
  });

  it("should delete a draft", () => {
    const draft: Omit<ProjectDraft, "lastSaved"> = {
      id: "delete-test",
      mode: "create",
      data: {
        name: "Delete Me",
        primaryCategory: "dao",
        tags: [],
        description: "This will be deleted",
        websiteUrl: "https://delete.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      },
    };

    draftService.saveDraft(draft);
    expect(draftService.getDraft("delete-test")).not.toBeNull();

    draftService.deleteDraft("delete-test");
    expect(draftService.getDraft("delete-test")).toBeNull();
  });

  it("should check if draft has content", () => {
    const emptyData = {
      name: "",
      primaryCategory: "",
      tags: [],
      description: "",
      websiteUrl: "",
      githubUrl: "",
      logoUrl: "",
      docsUrl: "",
    };

    expect(draftService.hasContent(emptyData)).toBe(false);

    const dataWithName = { ...emptyData, name: "Test" };
    expect(draftService.hasContent(dataWithName)).toBe(true);

    const dataWithTags = { ...emptyData, tags: ["tag1"] };
    expect(draftService.hasContent(dataWithTags)).toBe(true);
  });

  it("should handle multiple drafts", () => {
    const draft1: Omit<ProjectDraft, "lastSaved"> = {
      id: "draft-1",
      mode: "create",
      data: {
        name: "Project 1",
        primaryCategory: "defi",
        tags: [],
        description: "First project",
        websiteUrl: "https://one.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      },
    };

    const draft2: Omit<ProjectDraft, "lastSaved"> = {
      id: "draft-2",
      mode: "edit",
      projectId: "456",
      data: {
        name: "Project 2",
        primaryCategory: "gaming",
        tags: [],
        description: "Second project",
        websiteUrl: "https://two.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      },
    };

    draftService.saveDraft(draft1);
    draftService.saveDraft(draft2);

    const allDrafts = draftService.getAllDrafts();
    expect(allDrafts).toHaveLength(2);
  });

  it("should clear all drafts", () => {
    const draft1: Omit<ProjectDraft, "lastSaved"> = {
      id: "draft-1",
      mode: "create",
      data: {
        name: "Project 1",
        primaryCategory: "defi",
        tags: [],
        description: "First project",
        websiteUrl: "https://one.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      },
    };

    const draft2: Omit<ProjectDraft, "lastSaved"> = {
      id: "draft-2",
      mode: "edit",
      projectId: "789",
      data: {
        name: "Project 2",
        primaryCategory: "payments",
        tags: [],
        description: "Second project",
        websiteUrl: "https://two.com",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      },
    };

    draftService.saveDraft(draft1);
    draftService.saveDraft(draft2);
    expect(draftService.getAllDrafts()).toHaveLength(2);

    draftService.clearAllDrafts();
    expect(draftService.getAllDrafts()).toHaveLength(0);
  });
});
