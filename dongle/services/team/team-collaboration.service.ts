/**
 * Team Collaboration Service
 *
 * Manages team members, comments, shared views, and activity history
 * for form submissions. Uses localStorage for client-side persistence.
 */

import { generateId } from "@/lib/id-generator";
import { nowUTC } from "@/lib/date";
import type {
  TeamMember,
  TeamRole,
  SubmissionComment,
  SharedView,
  SubmissionActivity,
} from "@/types/team-collaboration";
import { hasPermission, canComment, canEditSubmission, canManageTeam, canSaveView } from "@/types/team-collaboration";

const TEAM_STORAGE_KEY = "dongle_team_collaboration";
const COMMENTS_STORAGE_KEY = "dongle_submission_comments";
const SHARED_VIEWS_STORAGE_KEY = "dongle_shared_views";
const ACTIVITY_STORAGE_KEY = "dongle_submission_activity";

function loadTeam(): TeamMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTeam(team: TeamMember[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
}

function loadComments(): SubmissionComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveComments(comments: SubmissionComment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
}

function loadSharedViews(): SharedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHARED_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSharedViews(views: SharedView[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHARED_VIEWS_STORAGE_KEY, JSON.stringify(views));
}

function loadActivity(): SubmissionActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveActivity(activity: SubmissionActivity[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
}

function addActivity(entry: Omit<SubmissionActivity, "id">): SubmissionActivity {
  const activity = loadActivity();
  const newEntry: SubmissionActivity = {
    ...entry,
    id: generateId(),
  };
  activity.unshift(newEntry);
  // Cap at 500 entries per submission
  const filtered = activity.filter((a) => a.submissionId === entry.submissionId).slice(0, 500);
  const others = activity.filter((a) => a.submissionId !== entry.submissionId);
  saveActivity([...filtered, ...others]);
  return newEntry;
}

export const teamCollaborationService = {
  // ── Team Members ───────────────────────────────────────────────────────────

  /**
   * Get all team members for a submission.
   */
  getTeam(submissionId: string): TeamMember[] {
    return loadTeam().filter((m) => m.submissionId === submissionId);
  },

  /**
   * Get a specific team member by ID.
   */
  getTeamMember(memberId: string): TeamMember | null {
    return loadTeam().find((m) => m.id === memberId) ?? null;
  },

  /**
   * Get the role of a user for a specific submission.
   */
  getUserRole(submissionId: string, addressOrId: string): TeamRole | null {
    const member = loadTeam().find(
      (m) => m.submissionId === submissionId && m.addressOrId === addressOrId,
    );
    return member?.role ?? null;
  },

  /**
   * Check if a user has a specific permission for a submission.
   */
  checkPermission(
    submissionId: string,
    addressOrId: string,
    requiredRole: TeamRole,
  ): boolean {
    const role = this.getUserRole(submissionId, addressOrId);
    if (!role) return false;
    return hasPermission(role, requiredRole);
  },

  /**
   * Add a team member to a submission.
   * Only owners can add/remove team members.
   */
  addTeamMember(
    submissionId: string,
    requesterAddress: string,
    newMember: Omit<TeamMember, "id" | "submissionId" | "addedAt">,
  ): { success: boolean; error?: string; member?: TeamMember } {
    // Verify requester is owner
    if (!this.checkPermission(submissionId, requesterAddress, "owner")) {
      return { success: false, error: "Only owners can add team members" };
    }

    // Check if already a member
    const existing = loadTeam().find(
      (m) => m.submissionId === submissionId && m.addressOrId === newMember.addressOrId,
    );
    if (existing) {
      return { success: false, error: "User is already a team member" };
    }

    const member: TeamMember = {
      ...newMember,
      id: generateId(),
      submissionId,
      addedAt: nowUTC(),
    };

    const team = loadTeam();
    team.push(member);
    saveTeam(team);

    addActivity({
      submissionId,
      actorAddress: requesterAddress,
      actorName: "You",
      action: "team_member_added",
      description: `Added ${member.name} as ${member.role}`,
      timestamp: nowUTC(),
      metadata: { memberId: member.id, role: member.role },
    });

    return { success: true, member };
  },

  /**
   * Update a team member's role.
   * Only owners can change roles.
   */
  updateTeamMemberRole(
    submissionId: string,
    requesterAddress: string,
    memberId: string,
    newRole: TeamRole,
  ): { success: boolean; error?: string } {
    if (!this.checkPermission(submissionId, requesterAddress, "owner")) {
      return { success: false, error: "Only owners can change roles" };
    }

    const team = loadTeam();
    const index = team.findIndex((m) => m.id === memberId && m.submissionId === submissionId);
    if (index === -1) {
      return { success: false, error: "Team member not found" };
    }

    const oldRole = team[index].role;
    team[index].role = newRole;
    saveTeam(team);

    addActivity({
      submissionId,
      actorAddress: requesterAddress,
      actorName: "You",
      action: "team_role_changed",
      description: `Changed role from ${oldRole} to ${newRole}`,
      timestamp: nowUTC(),
      metadata: { memberId, oldRole, newRole },
    });

    return { success: true };
  },

  /**
   * Remove a team member from a submission.
   * Only owners can remove members.
   */
  removeTeamMember(
    submissionId: string,
    requesterAddress: string,
    memberId: string,
  ): { success: boolean; error?: string } {
    if (!this.checkPermission(submissionId, requesterAddress, "owner")) {
      return { success: false, error: "Only owners can remove team members" };
    }

    const team = loadTeam();
    const index = team.findIndex((m) => m.id === memberId && m.submissionId === submissionId);
    if (index === -1) {
      return { success: false, error: "Team member not found" };
    }

    const member = team[index];
    team.splice(index, 1);
    saveTeam(team);

    addActivity({
      submissionId,
      actorAddress: requesterAddress,
      actorName: "You",
      action: "team_member_removed",
      description: `Removed ${member.name} (${member.role})`,
      timestamp: nowUTC(),
      metadata: { memberId, removedRole: member.role },
    });

    return { success: true };
  },

  // ── Comments ────────────────────────────────────────────────────────────────

  /**
   * Get all comments for a submission.
   */
  getComments(submissionId: string): SubmissionComment[] {
    return loadComments()
      .filter((c) => c.submissionId === submissionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  /**
   * Add a comment to a submission.
   * Requires commenter role or higher.
   */
  addComment(
    submissionId: string,
    authorAddress: string,
    authorName: string,
    content: string,
    mentions: string[] = [],
  ): { success: boolean; error?: string; comment?: SubmissionComment } {
    // Check permission
    const role = this.getUserRole(submissionId, authorAddress);
    if (!role || !canComment(role)) {
      return { success: false, error: "You don't have permission to comment" };
    }

    const comment: SubmissionComment = {
      id: generateId(),
      submissionId,
      authorAddress,
      authorName,
      content,
      createdAt: nowUTC(),
      mentions,
    };

    const comments = loadComments();
    comments.push(comment);
    saveComments(comments);

    addActivity({
      submissionId,
      actorAddress: authorAddress,
      actorName: authorName,
      action: "comment_added",
      description: `Added a comment`,
      timestamp: nowUTC(),
      metadata: { commentId: comment.id, mentions },
    });

    return { success: true, comment };
  },

  // ── Shared Views ────────────────────────────────────────────────────────────

  /**
   * Get all shared views for a submission (or all if no submissionId).
   */
  getSharedViews(submissionId?: string): SharedView[] {
    const views = loadSharedViews();
    if (submissionId) {
      // Filter views that are relevant to this submission context
      return views.filter((v) => v.filters.assignedTo === submissionId || !v.filters.assignedTo);
    }
    return views;
  },

  /**
   * Create a shared view.
   * Requires editor role or higher.
   */
  createSharedView(
    createdBy: string,
    submissionId: string,
    name: string,
    filters: SharedView["filters"],
    isPublic = false,
  ): { success: boolean; error?: string; view?: SharedView } {
    const role = this.getUserRole(submissionId, createdBy);
    if (!role || !canSaveView(role)) {
      return { success: false, error: "You don't have permission to create shared views" };
    }

    const view: SharedView = {
      id: generateId(),
      name,
      createdBy,
      filters: { ...filters, assignedTo: submissionId },
      isPublic,
      createdAt: nowUTC(),
      updatedAt: nowUTC(),
    };

    const views = loadSharedViews();
    views.push(view);
    saveSharedViews(views);

    addActivity({
      submissionId,
      actorAddress: createdBy,
      actorName: "You",
      action: "shared_view_created",
      description: `Created shared view "${name}"`,
      timestamp: nowUTC(),
      metadata: { viewId: view.id, isPublic },
    });

    return { success: true, view };
  },

  /**
   * Update a shared view.
   */
  updateSharedView(
    viewId: string,
    requesterAddress: string,
    updates: Partial<Pick<SharedView, "name" | "filters" | "isPublic">>,
  ): { success: boolean; error?: string; view?: SharedView } {
    const views = loadSharedViews();
    const index = views.findIndex((v) => v.id === viewId);
    if (index === -1) {
      return { success: false, error: "Shared view not found" };
    }

    // Only creator can update, unless it's public and user has editor+
    const view = views[index];
    if (view.createdBy !== requesterAddress) {
      const role = this.getUserRole(view.filters.assignedTo ?? "", requesterAddress);
      if (!role || !canEditSubmission(role)) {
        return { success: false, error: "You don't have permission to update this view" };
      }
    }

    views[index] = {
      ...views[index],
      ...updates,
      updatedAt: nowUTC(),
    };
    saveSharedViews(views);

    return { success: true, view: views[index] };
  },

  /**
   * Delete a shared view.
   */
  deleteSharedView(viewId: string, requesterAddress: string): { success: boolean; error?: string } {
    const views = loadSharedViews();
    const index = views.findIndex((v) => v.id === viewId);
    if (index === -1) {
      return { success: false, error: "Shared view not found" };
    }

    const view = views[index];
    if (view.createdBy !== requesterAddress) {
      const role = this.getUserRole(view.filters.assignedTo ?? "", requesterAddress);
      if (!role || !canManageTeam(role)) {
        return { success: false, error: "You don't have permission to delete this view" };
      }
    }

    views.splice(index, 1);
    saveSharedViews(views);
    return { success: true };
  },

  // ── Activity History ────────────────────────────────────────────────────────

  /**
   * Get activity history for a submission.
   */
  getActivity(submissionId: string, limit = 50): SubmissionActivity[] {
    return loadActivity()
      .filter((a) => a.submissionId === submissionId)
      .slice(0, limit);
  },

  /**
   * Record a custom activity event.
   */
  recordActivity(activity: Omit<SubmissionActivity, "id">): SubmissionActivity {
    return addActivity(activity);
  },

  // ── Utility ─────────────────────────────────────────────────────────────────

  /**
   * Clear all team collaboration data (for testing).
   */
  _clearForTesting(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(TEAM_STORAGE_KEY);
        localStorage.removeItem(COMMENTS_STORAGE_KEY);
        localStorage.removeItem(SHARED_VIEWS_STORAGE_KEY);
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  },
};