import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTeamCollaboration } from "@/hooks/useTeamCollaboration";
import { teamCollaborationService } from "@/services/team/team-collaboration.service";
import { setIdGenerator, resetIdGenerator } from "@/lib/id-generator";

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

let idCounter = 0;
function nextId() { return `test-id-${++idCounter}`; }

const SUBMISSION_ID = "sub_123";

describe("useTeamCollaboration", () => {
  beforeEach(() => {
    localStorage.clear();
    idCounter = 0;
    setIdGenerator(nextId);

    teamCollaborationService.addTeamMember(SUBMISSION_ID, "GOWNER123", {
      addressOrId: "GOWNER123",
      name: "Test Owner",
      role: "owner",
    });
  });

  afterEach(() => {
    localStorage.clear();
    resetIdGenerator();
    vi.clearAllMocks();
  });

  it("loads team, comments, views, and activity on mount", async () => {
    teamCollaborationService.addComment(SUBMISSION_ID, "GOWNER123", "Owner", "Test comment");
    teamCollaborationService.createSharedView("GOWNER123", SUBMISSION_ID, "Test View", { status: "pending" });
    teamCollaborationService.recordActivity({
      submissionId: SUBMISSION_ID,
      actorAddress: "GOWNER123",
      actorName: "Owner",
      action: "test",
      description: "Test activity",
      timestamp: new Date().toISOString(),
    });

    const { result } = renderHook(() =>
      useTeamCollaboration({
        submissionId: SUBMISSION_ID,
        currentUserAddress: "GOWNER123",
        currentUserName: "Test Owner",
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.team).toHaveLength(1);
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.sharedViews).toHaveLength(1);
    expect(result.current.activity).toHaveLength(1);
    expect(result.current.userRole).toBe("owner");
    expect(result.current.canComment).toBe(true);
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canManageTeam).toBe(true);
    expect(result.current.canSaveView).toBe(true);
  });

  it("adds team member and refreshes", async () => {
    const { result } = renderHook(() =>
      useTeamCollaboration({
        submissionId: SUBMISSION_ID,
        currentUserAddress: "GOWNER123",
        currentUserName: "Test Owner",
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const addResult = await result.current.addTeamMember({
        addressOrId: "GEDITOR123",
        name: "Editor",
        role: "editor",
      });
      expect(addResult.success).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.team).toHaveLength(2);
    });
  });

  it("adds comment and refreshes", async () => {
    const { result } = renderHook(() =>
      useTeamCollaboration({
        submissionId: SUBMISSION_ID,
        currentUserAddress: "GOWNER123",
        currentUserName: "Test Owner",
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const addResult = await result.current.addComment("New comment from hook");
      expect(addResult.success).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0].content).toBe("New comment from hook");
    });
  });

  it("creates shared view and refreshes", async () => {
    const { result } = renderHook(() =>
      useTeamCollaboration({
        submissionId: SUBMISSION_ID,
        currentUserAddress: "GOWNER123",
        currentUserName: "Test Owner",
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const createResult = await result.current.createSharedView("My View", { status: "pending" });
      expect(createResult.success).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.sharedViews).toHaveLength(1);
      expect(result.current.sharedViews[0].name).toBe("My View");
    });
  });

  it("updates team member role and refreshes", async () => {
    const addResult = teamCollaborationService.addTeamMember(SUBMISSION_ID, "GOWNER123", {
      addressOrId: "GEDITOR123",
      name: "Editor",
      role: "editor",
    });
    const memberId = addResult.member!.id;

    const { result } = renderHook(() =>
      useTeamCollaboration({
        submissionId: SUBMISSION_ID,
        currentUserAddress: "GOWNER123",
        currentUserName: "Test Owner",
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const updateResult = await result.current.updateTeamMemberRole(memberId, "commenter");
      expect(updateResult.success).toBe(true);
    });

    await waitFor(() => {
      const member = result.current.team.find((m) => m.id === memberId);
      expect(member?.role).toBe("commenter");
    });
  });

  it("removes team member and refreshes", async () => {
    const addResult = teamCollaborationService.addTeamMember(SUBMISSION_ID, "GOWNER123", {
      addressOrId: "GEDITOR123",
      name: "Editor",
      role: "editor",
    });
    const memberId = addResult.member!.id;

    const { result } = renderHook(() =>
      useTeamCollaboration({
        submissionId: SUBMISSION_ID,
        currentUserAddress: "GOWNER123",
        currentUserName: "Test Owner",
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const removeResult = await result.current.removeTeamMember(memberId);
      expect(removeResult.success).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.team).toHaveLength(1);
    });
  });

  it("records activity", async () => {
    const { result } = renderHook(() =>
      useTeamCollaboration({
        submissionId: SUBMISSION_ID,
        currentUserAddress: "GOWNER123",
        currentUserName: "Test Owner",
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const activity = result.current.recordActivity({
      actorAddress: "GOWNER123",
      actorName: "Owner",
      action: "custom_action",
      description: "Custom activity",
      timestamp: new Date().toISOString(),
    });

    expect(activity.action).toBe("custom_action");
    expect(activity.submissionId).toBe(SUBMISSION_ID);
  });
});