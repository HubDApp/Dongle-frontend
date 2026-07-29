/**
 * Project update types for announcements, releases, and milestones
 */

export const UPDATE_TYPES = {
  RELEASE: "Release",
  AUDIT: "Security Audit",
  MILESTONE: "Milestone",
  ANNOUNCEMENT: "Announcement",
} as const;

export type UpdateType = typeof UPDATE_TYPES[keyof typeof UPDATE_TYPES];

export interface ProjectUpdate {
  id: string;
  projectId: string;
  type: UpdateType;
  title: string;
  content: string;
  version?: string; // For releases
  publishedAt: string; // ISO date string
  authorAddress: string; // Owner who published
}
