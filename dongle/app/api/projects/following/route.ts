import { NextRequest, NextResponse } from "next/server";
import {
  followProject,
  getFollowingProjectIds,
  getProjectFollowerIds,
  getReviewRatingThreshold,
  setReviewRatingThreshold,
  unfollowProject,
} from "@/lib/project-following/store";
import { resolveProjectFollowingRecipient } from "@/lib/project-following/recipient";

export const dynamic = "force-dynamic";

const MAX_FOLLOWED_PROJECTS = 50;

export async function GET(request: NextRequest) {
  const recipient = await resolveProjectFollowingRecipient();
  const projectId = request.nextUrl.searchParams.get("projectId");
  const [projectIds, minReviewRating, followers] = await Promise.all([
    recipient ? getFollowingProjectIds(recipient) : Promise.resolve([]),
    recipient ? getReviewRatingThreshold(recipient) : Promise.resolve(4),
    projectId ? getProjectFollowerIds(projectId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    projectIds,
    minReviewRating,
    followerCount: followers.length,
    isFollowing: Boolean(recipient && projectId && projectIds.includes(projectId)),
  });
}

export async function POST(request: NextRequest) {
  const recipient = await resolveProjectFollowingRecipient();
  if (!recipient) {
    return NextResponse.json({ error: "Connect your account to follow projects" }, { status: 401 });
  }

  let body: { projectId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }
  if (
    typeof body.projectId !== "string" ||
    !body.projectId.trim() ||
    body.projectId.length > 160 ||
    (body.action !== "follow" && body.action !== "unfollow")
  ) {
    return NextResponse.json({ error: "Invalid follow request" }, { status: 400 });
  }

  if (body.action === "follow") {
    const projectIds = await getFollowingProjectIds(recipient);
    if (!projectIds.includes(body.projectId) && projectIds.length >= MAX_FOLLOWED_PROJECTS) {
      return NextResponse.json({ error: "Following limit reached (50 projects)" }, { status: 409 });
    }
    await followProject(recipient, body.projectId);
  } else {
    await unfollowProject(recipient, body.projectId);
  }

  const [projectIds, followers] = await Promise.all([
    getFollowingProjectIds(recipient),
    getProjectFollowerIds(body.projectId),
  ]);
  return NextResponse.json({
    projectIds,
    followerCount: followers.length,
    isFollowing: projectIds.includes(body.projectId),
  });
}

export async function PATCH(request: NextRequest) {
  const recipient = await resolveProjectFollowingRecipient();
  if (!recipient) {
    return NextResponse.json({ error: "Connect your account to update preferences" }, { status: 401 });
  }

  let body: { minReviewRating?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }
  if (
    typeof body.minReviewRating !== "number" ||
    !Number.isInteger(body.minReviewRating) ||
    body.minReviewRating < 1 ||
    body.minReviewRating > 5
  ) {
    return NextResponse.json({ error: "Review threshold must be between 1 and 5" }, { status: 400 });
  }

  await setReviewRatingThreshold(recipient, body.minReviewRating);
  return NextResponse.json({ minReviewRating: body.minReviewRating });
}