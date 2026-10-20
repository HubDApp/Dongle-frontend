import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/services/project/project.service";
import { getProjectFollowerSettings } from "@/lib/project-following/store";
import { resolveProjectFollowingRecipient } from "@/lib/project-following/recipient";
import { publishNotificationEvent } from "@/lib/notifications/server-store";

export const dynamic = "force-dynamic";

type ProjectEventType = "project_update_posted" | "project_verification_changed" | "project_review_posted";

export async function POST(request: NextRequest) {
  const recipient = await resolveProjectFollowingRecipient();
  if (!recipient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  let body: {
    projectId?: unknown;
    type?: unknown;
    rating?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const { projectId, type, rating } = body;
  if (
    typeof projectId !== "string" ||
    !projectId.trim() ||
    !["project_update_posted", "project_verification_changed", "project_review_posted"].includes(String(type))
  ) {
    return NextResponse.json({ error: "Invalid project event" }, { status: 400 });
  }

  const project = projectService.getProjectById(projectId);
  if (type === "project_update_posted" && project?.ownerAddress !== recipient) {
    return NextResponse.json({ error: "Only the project owner can publish updates" }, { status: 403 });
  }
  if (type === "project_verification_changed") {
    const admins = new Set(
      (process.env.NEXT_PUBLIC_ADMIN_ALLOWLIST ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    );
    if (!admins.has(recipient)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }
  if (type === "project_review_posted" && (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5)) {
    return NextResponse.json({ error: "Review rating must be between 1 and 5" }, { status: 400 });
  }

  const followers = await getProjectFollowerSettings(projectId);
  const createdAt = new Date().toISOString();
  const notificationType = type as ProjectEventType;
  const recipients = followers.filter((follower) => {
    if (follower.userId === recipient) return false;
    return notificationType !== "project_review_posted" || Number(rating) >= follower.minReviewRating;
  });

  for (const follower of recipients) {
    publishNotificationEvent({
      id: crypto.randomUUID(),
      type: notificationType,
      recipientId: follower.userId,
      projectId,
      projectName: project?.name ?? projectId,
      createdAt,
      ...(notificationType === "project_review_posted"
        ? { messageParams: { rating: String(rating) } }
        : {}),
    });
  }

  return NextResponse.json({ notified: recipients.length });
}