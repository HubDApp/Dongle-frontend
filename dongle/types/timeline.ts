/**
 * Timeline types — Issue #658
 *
 * Chronological event timeline for project detail pages.
 */

export type TimelineEventType =
  | "created"
  | "verified"
  | "rejected"
  | "major_update"
  | "milestone_review";

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  /** ISO-8601 timestamp */
  occurredAt: string;
  /** Additional structured metadata specific to the event type */
  metadata?: Record<string, unknown>;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  created: "Project Created",
  verified: "Verified",
  rejected: "Rejected",
  major_update: "Major Update",
  milestone_review: "Review Milestone",
};
