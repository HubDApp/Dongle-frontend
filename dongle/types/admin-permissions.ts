/**
 * Admin role and permission types for granular access control.
 *
 * Roles (from least to most privileged):
 * - viewer: Read-only access to admin panels
 * - moderator: Review moderation only
 * - verifier: Verification approval only
 * - super_admin: All permissions
 */

export type AdminRole = "viewer" | "moderator" | "verifier" | "super_admin";

export type AdminPermission =
  | "view_dashboard"
  | "view_users"
  | "view_projects"
  | "view_verification_queue"
  | "moderate_reviews"
  | "approve_verification"
  | "reject_verification"
  | "ban_user"
  | "feature_project"
  | "broadcast_message"
  | "manage_roles"
  | "view_audit_logs"
  | "manage_system";

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  viewer: [
    "view_dashboard",
    "view_users",
    "view_projects",
    "view_verification_queue",
    "view_audit_logs",
  ],
  moderator: [
    "view_dashboard",
    "view_users",
    "view_projects",
    "view_verification_queue",
    "moderate_reviews",
    "view_audit_logs",
  ],
  verifier: [
    "view_dashboard",
    "view_users",
    "view_projects",
    "view_verification_queue",
    "approve_verification",
    "reject_verification",
    "view_audit_logs",
  ],
  super_admin: [
    "view_dashboard",
    "view_users",
    "view_projects",
    "view_verification_queue",
    "moderate_reviews",
    "approve_verification",
    "reject_verification",
    "ban_user",
    "feature_project",
    "broadcast_message",
    "manage_roles",
    "view_audit_logs",
    "manage_system",
  ],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  viewer: "Viewer",
  moderator: "Moderator",
  verifier: "Verifier",
  super_admin: "Super Admin",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  viewer: "Read-only access to admin panels",
  moderator: "Review moderation only",
  verifier: "Verification approval only",
  super_admin: "All permissions",
};

export interface AdminUser {
  address: string;
  role: AdminRole;
  assignedAt: string;
  assignedBy: string;
}

export interface RoleChangeLog {
  id: string;
  targetAddress: string;
  previousRole: AdminRole | null;
  newRole: AdminRole;
  changedBy: string;
  changedAt: string;
}

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
