/**
 * Team Collaboration Types for Form Responses & Submissions (#567)
 *
 * Covers:
 * - Comments on submissions
 * - Mentions and notifications
 * - Shared views for submission queues/filters
 * - Permission levels (owner, editor, commenter, viewer)
 * - Activity history / audit trail
 */

export type TeamRole = "owner" | "editor" | "commenter" | "viewer";

export interface TeamMember {
  id: string;
  submissionId: string;
  addressOrId: string;
  name: string;
  role: TeamRole;
  email?: string;
  addedAt: string;
}

export interface SubmissionComment {
  id: string;
  submissionId: string;
  authorAddress: string;
  authorName: string;
  content: string;
  createdAt: string;
  mentions?: string[];
}

export interface SharedView {
  id: string;
  name: string;
  createdBy: string;
  filters: {
    status?: string;
    search?: string;
    assignedTo?: string;
    tag?: string;
    sort?: string;
  };
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionActivity {
  id: string;
  submissionId: string;
  actorAddress: string;
  actorName: string;
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export const ROLE_HIERARCHY: Record<TeamRole, number> = {
  viewer: 1,
  commenter: 2,
  editor: 3,
  owner: 4,
};

export function hasPermission(userRole: TeamRole, requiredRole: TeamRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function canComment(role: TeamRole): boolean {
  return hasPermission(role, "commenter");
}

export function canEditSubmission(role: TeamRole): boolean {
  return hasPermission(role, "editor");
}

export function canManageTeam(role: TeamRole): boolean {
  return hasPermission(role, "owner");
}

export function canSaveView(role: TeamRole): boolean {
  return hasPermission(role, "editor");
}
