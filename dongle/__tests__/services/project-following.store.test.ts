import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({ redis: null }));

import {
  followProject,
  getFollowingProjectIds,
  getProjectFollowerIds,
  getProjectFollowerSettings,
  getReviewRatingThreshold,
  setReviewRatingThreshold,
  unfollowProject,
} from "@/lib/project-following/store";

describe("project following store", () => {
  it("indexes follows by user and project and removes both sides on unfollow", async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const projectId = `project-${crypto.randomUUID()}`;

    await followProject(userId, projectId);
    expect(await getFollowingProjectIds(userId)).toContain(projectId);
    expect(await getProjectFollowerIds(projectId)).toContain(userId);

    await unfollowProject(userId, projectId);
    expect(await getFollowingProjectIds(userId)).not.toContain(projectId);
    expect(await getProjectFollowerIds(projectId)).not.toContain(userId);
  });

  it("uses a configurable minimum review rating per follower", async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const projectId = `project-${crypto.randomUUID()}`;

    await followProject(userId, projectId);
    expect(await getReviewRatingThreshold(userId)).toBe(4);

    await setReviewRatingThreshold(userId, 2);
    expect(await getProjectFollowerSettings(projectId)).toEqual([
      { userId, minReviewRating: 2 },
    ]);
  });
});
