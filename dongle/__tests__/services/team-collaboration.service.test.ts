import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
const OWNER_ADDRESS = "GOWNER123";
const EDITOR_ADDRESS = "GEDITOR123";
const COMMENTER_ADDRESS = "GCOMMENTER123";
const VIEWER_ADDRESS = "GVIEWER123";
const STRANGER_ADDRESS = "GSTRANGER123";

describe("teamCollaborationService", () => {
  beforeEach(() => {
    localStorage.clear();
    idCounter = 0;
    setIdGenerator(nextId);
  });

  afterEach(() => {
    localStorage.clear();
    resetIdGenerator();
  });

  describe("Team Members", () => {
    it("returns empty team for new submission", () => {
      const team = teamCollaborationService.getTeam(SUBMISSION_ID);
      expect(team).toEqual([]);
    });

    it("adds team member when requester is owner", () => {
      // First add owner
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      // Now owner can add members
      const result = teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor User",
        role: "editor",
      });

      expect(result.success).toBe(true);
      expect(result.member).toBeDefined();
      expect(result.member?.role).toBe("editor");
      expect(result.member?.submissionId).toBe(SUBMISSION_ID);
    });

    it("rejects adding member when requester is not owner", () => {
      // Add editor
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      // Editor tries to add member - should fail
      const result = teamCollaborationService.addTeamMember(SUBMISSION_ID, EDITOR_ADDRESS, {
        addressOrId: COMMENTER_ADDRESS,
        name: "Commenter User",
        role: "commenter",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Only owners can add team members");
    });

    it("rejects adding duplicate member", () => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor",
        role: "editor",
      });

      const result = teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor Duplicate",
        role: "commenter",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("User is already a team member");
    });

    it("updates team member role when requester is owner", () => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      const addResult = teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor",
        role: "editor",
      });

      const memberId = addResult.member!.id;

      const result = teamCollaborationService.updateTeamMemberRole(
        SUBMISSION_ID,
        OWNER_ADDRESS,
        memberId,
        "commenter",
      );

      expect(result.success).toBe(true);

      const team = teamCollaborationService.getTeam(SUBMISSION_ID);
      const member = team.find((m) => m.id === memberId);
      expect(member?.role).toBe("commenter");
    });

    it("rejects role update when requester is not owner", () => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      const addResult = teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor",
        role: "editor",
      });

      const memberId = addResult.member!.id;

      const result = teamCollaborationService.updateTeamMemberRole(
        SUBMISSION_ID,
        EDITOR_ADDRESS,
        memberId,
        "viewer",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Only owners can change roles");
    });

    it("removes team member when requester is owner", () => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      const addResult = teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor",
        role: "editor",
      });

      const memberId = addResult.member!.id;

      const result = teamCollaborationService.removeTeamMember(
        SUBMISSION_ID,
        OWNER_ADDRESS,
        memberId,
      );

      expect(result.success).toBe(true);

      const team = teamCollaborationService.getTeam(SUBMISSION_ID);
      expect(team.find((m) => m.id === memberId)).toBeUndefined();
    });

    it("returns user role for submission", () => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor",
        role: "editor",
      });

      expect(teamCollaborationService.getUserRole(SUBMISSION_ID, OWNER_ADDRESS)).toBe("owner");
      expect(teamCollaborationService.getUserRole(SUBMISSION_ID, EDITOR_ADDRESS)).toBe("editor");
      expect(teamCollaborationService.getUserRole(SUBMISSION_ID, STRANGER_ADDRESS)).toBeNull();
    });

    it("checks permissions correctly based on role hierarchy", () => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor",
        role: "editor",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: COMMENTER_ADDRESS,
        name: "Commenter",
        role: "commenter",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: VIEWER_ADDRESS,
        name: "Viewer",
        role: "viewer",
      });

      // Owner can do everything
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, OWNER_ADDRESS, "owner")).toBe(true);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, OWNER_ADDRESS, "editor")).toBe(true);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, OWNER_ADDRESS, "commenter")).toBe(true);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, OWNER_ADDRESS, "viewer")).toBe(true);

      // Editor can edit, comment, view but not manage team
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, EDITOR_ADDRESS, "owner")).toBe(false);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, EDITOR_ADDRESS, "editor")).toBe(true);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, EDITOR_ADDRESS, "commenter")).toBe(true);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, EDITOR_ADDRESS, "viewer")).toBe(true);

      // Commenter can comment and view
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, COMMENTER_ADDRESS, "editor")).toBe(false);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, COMMENTER_ADDRESS, "commenter")).toBe(true);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, COMMENTER_ADDRESS, "viewer")).toBe(true);

      // Viewer can only view
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, VIEWER_ADDRESS, "commenter")).toBe(false);
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, VIEWER_ADDRESS, "viewer")).toBe(true);

      // Stranger has no permissions
      expect(teamCollaborationService.checkPermission(SUBMISSION_ID, STRANGER_ADDRESS, "viewer")).toBe(false);
    });
  });

  describe("Comments", () => {
    beforeEach(() => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor",
        role: "editor",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: COMMENTER_ADDRESS,
        name: "Commenter",
        role: "commenter",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: VIEWER_ADDRESS,
        name: "Viewer",
        role: "viewer",
      });
    });

    it("returns empty comments for new submission", () => {
      const comments = teamCollaborationService.getComments(SUBMISSION_ID);
      expect(comments).toEqual([]);
    });

    it("allows owner to add comment", () => {
      const result = teamCollaborationService.addComment(
        SUBMISSION_ID,
        OWNER_ADDRESS,
        "Owner",
        "This looks good!",
      );

      expect(result.success).toBe(true);
      expect(result.comment).toBeDefined();
      expect(result.comment?.content).toBe("This looks good!");
      expect(result.comment?.authorAddress).toBe(OWNER_ADDRESS);
    });

    it("allows editor to add comment", () => {
      const result = teamCollaborationService.addComment(
        SUBMISSION_ID,
        EDITOR_ADDRESS,
        "Editor",
        "I made some changes",
      );

      expect(result.success).toBe(true);
    });

    it("allows commenter to add comment", () => {
      const result = teamCollaborationService.addComment(
        SUBMISSION_ID,
        COMMENTER_ADDRESS,
        "Commenter",
        "Nice work!",
      );

      expect(result.success).toBe(true);
    });

    it("rejects viewer from adding comment", () => {
      const result = teamCollaborationService.addComment(
        SUBMISSION_ID,
        VIEWER_ADDRESS,
        "Viewer",
        "Just viewing",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("You don't have permission to comment");
    });

    it("rejects stranger from adding comment", () => {
      const result = teamCollaborationService.addComment(
        SUBMISSION_ID,
        STRANGER_ADDRESS,
        "Stranger",
        "Hello",
      );

      expect(result.success).toBe(false);
    });

    it("stores mentions with comment", () => {
      const result = teamCollaborationService.addComment(
        SUBMISSION_ID,
        OWNER_ADDRESS,
        "Owner",
        "Hey @editor, please review",
        [EDITOR_ADDRESS],
      );

      expect(result.success).toBe(true);
      expect(result.comment?.mentions).toEqual([EDITOR_ADDRESS]);
    });

    it("returns comments sorted by creation time", () => {
      teamCollaborationService.addComment(SUBMISSION_ID, OWNER_ADDRESS, "Owner", "First");
      teamCollaborationService.addComment(SUBMISSION_ID, EDITOR_ADDRESS, "Editor", "Second");
      teamCollaborationService.addComment(SUBMISSION_ID, COMMENTER_ADDRESS, "Commenter", "Third");

      const comments = teamCollaborationService.getComments(SUBMISSION_ID);
      expect(comments).toHaveLength(3);
      expect(comments[0].content).toBe("First");
      expect(comments[1].content).toBe("Second");
      expect(comments[2].content).toBe("Third");
    });
  });

  describe("Shared Views", () => {
    beforeEach(() => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: EDITOR_ADDRESS,
        name: "Editor",
        role: "editor",
      });
    });

    it("returns empty views for new submission", () => {
      const views = teamCollaborationService.getSharedViews(SUBMISSION_ID);
      expect(views).toEqual([]);
    });

    it("allows editor to create shared view", () => {
      const result = teamCollaborationService.createSharedView(
        EDITOR_ADDRESS,
        SUBMISSION_ID,
        "Pending Reviews",
        { status: "pending", search: "" },
        false,
      );

      expect(result.success).toBe(true);
      expect(result.view).toBeDefined();
      expect(result.view?.name).toBe("Pending Reviews");
      expect(result.view?.filters.status).toBe("pending");
      expect(result.view?.createdBy).toBe(EDITOR_ADDRESS);
    });

    it("allows owner to create shared view", () => {
      const result = teamCollaborationService.createSharedView(
        OWNER_ADDRESS,
        SUBMISSION_ID,
        "All Submissions",
        { status: "", search: "" },
        true,
      );

      expect(result.success).toBe(true);
      expect(result.view?.isPublic).toBe(true);
    });

    it("rejects commenter from creating shared view", () => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: COMMENTER_ADDRESS,
        name: "Commenter",
        role: "commenter",
      });

      const result = teamCollaborationService.createSharedView(
        COMMENTER_ADDRESS,
        SUBMISSION_ID,
        "My View",
        { status: "pending" },
        false,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("You don't have permission to create shared views");
    });

    it("allows creator to update shared view", () => {
      const createResult = teamCollaborationService.createSharedView(
        EDITOR_ADDRESS,
        SUBMISSION_ID,
        "Original Name",
        { status: "pending" },
        false,
      );

      const viewId = createResult.view!.id;

      const result = teamCollaborationService.updateSharedView(
        viewId,
        EDITOR_ADDRESS,
        { name: "Updated Name" },
      );

      expect(result.success).toBe(true);
      expect(result.view?.name).toBe("Updated Name");
    });

    it("allows owner to update any shared view", () => {
      const createResult = teamCollaborationService.createSharedView(
        EDITOR_ADDRESS,
        SUBMISSION_ID,
        "Editor's View",
        { status: "pending" },
        false,
      );

      const viewId = createResult.view!.id;

      const result = teamCollaborationService.updateSharedView(
        viewId,
        OWNER_ADDRESS,
        { name: "Owner Updated" },
      );

      expect(result.success).toBe(true);
      expect(result.view?.name).toBe("Owner Updated");
    });

    it("rejects stranger from updating shared view", () => {
      const createResult = teamCollaborationService.createSharedView(
        EDITOR_ADDRESS,
        SUBMISSION_ID,
        "Editor's View",
        { status: "pending" },
        false,
      );

      const viewId = createResult.view!.id;

      const result = teamCollaborationService.updateSharedView(
        viewId,
        STRANGER_ADDRESS,
        { name: "Hacked" },
      );

      expect(result.success).toBe(false);
    });

    it("allows creator to delete shared view", () => {
      const createResult = teamCollaborationService.createSharedView(
        EDITOR_ADDRESS,
        SUBMISSION_ID,
        "To Delete",
        { status: "pending" },
        false,
      );

      const viewId = createResult.view!.id;

      const result = teamCollaborationService.deleteSharedView(viewId, EDITOR_ADDRESS);
      expect(result.success).toBe(true);

      const views = teamCollaborationService.getSharedViews(SUBMISSION_ID);
      expect(views.find((v) => v.id === viewId)).toBeUndefined();
    });
  });

  describe("Activity History", () => {
    it("returns empty activity for new submission", () => {
      const activity = teamCollaborationService.getActivity(SUBMISSION_ID);
      expect(activity).toEqual([]);
    });

    it("records and retrieves activity", () => {
      teamCollaborationService.recordActivity({
        submissionId: SUBMISSION_ID,
        actorAddress: OWNER_ADDRESS,
        actorName: "Owner",
        action: "test_action",
        description: "Test activity",
        timestamp: new Date().toISOString(),
      });

      const activity = teamCollaborationService.getActivity(SUBMISSION_ID);
      expect(activity).toHaveLength(1);
      expect(activity[0].action).toBe("test_action");
      expect(activity[0].description).toBe("Test activity");
    });

    it("limits activity to 50 entries per submission", () => {
      for (let i = 0; i < 60; i++) {
        teamCollaborationService.recordActivity({
          submissionId: SUBMISSION_ID,
          actorAddress: OWNER_ADDRESS,
          actorName: "Owner",
          action: `action_${i}`,
          description: `Activity ${i}`,
          timestamp: new Date().toISOString(),
        });
      }

      const activity = teamCollaborationService.getActivity(SUBMISSION_ID, 100);
      expect(activity.length).toBeLessThanOrEqual(50);
    });
  });

  describe("Utility", () => {
    it("_clearForTesting clears all data", () => {
      teamCollaborationService.addTeamMember(SUBMISSION_ID, OWNER_ADDRESS, {
        addressOrId: OWNER_ADDRESS,
        name: "Owner",
        role: "owner",
      });

      teamCollaborationService.addComment(SUBMISSION_ID, OWNER_ADDRESS, "Owner", "Test comment");
      teamCollaborationService.createSharedView(OWNER_ADDRESS, SUBMISSION_ID, "Test", {});
      teamCollaborationService.recordActivity({
        submissionId: SUBMISSION_ID,
        actorAddress: OWNER_ADDRESS,
        actorName: "Owner",
        action: "test",
        description: "Test",
        timestamp: new Date().toISOString(),
      });

      teamCollaborationService._clearForTesting();

      expect(teamCollaborationService.getTeam(SUBMISSION_ID)).toEqual([]);
      expect(teamCollaborationService.getComments(SUBMISSION_ID)).toEqual([]);
      expect(teamCollaborationService.getSharedViews(SUBMISSION_ID)).toEqual([]);
      expect(teamCollaborationService.getActivity(SUBMISSION_ID)).toEqual([]);
    });
  });
});