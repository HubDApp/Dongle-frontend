"use client";

export type ProjectFollowingEventType =
  | "project_update_posted"
  | "project_verification_changed"
  | "project_review_posted";

export async function emitProjectFollowingEvent(
  recipientId: string,
  event: {
    projectId: string;
    type: ProjectFollowingEventType;
    rating?: number;
  },
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/notifications/identify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId }),
    });
    const response = await fetch("/api/projects/following/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      console.warn("[project-following] event fan-out rejected", response.status);
    }
  } catch (error) {
    console.error("[project-following] failed to notify followers", error);
  }
}