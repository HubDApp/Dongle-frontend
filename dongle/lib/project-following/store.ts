import { redis } from "@/lib/redis";

const DEFAULT_REVIEW_RATING = 4;
const followingByUser = new Map<string, Set<string>>();
const followersByProject = new Map<string, Set<string>>();
const reviewRatingByUser = new Map<string, number>();

const userFollowingKey = (userId: string) => `project-following:user:${userId}`;
const projectFollowersKey = (projectId: string) => `project-following:project:${projectId}`;
const reviewRatingKey = (userId: string) => `project-following:review-rating:${userId}`;

export async function getFollowingProjectIds(userId: string): Promise<string[]> {
  if (redis) {
    return redis.smembers<string[]>(userFollowingKey(userId));
  }
  return [...(followingByUser.get(userId) ?? new Set<string>())];
}

export async function getProjectFollowerIds(projectId: string): Promise<string[]> {
  if (redis) {
    return redis.smembers<string[]>(projectFollowersKey(projectId));
  }
  return [...(followersByProject.get(projectId) ?? new Set<string>())];
}

export async function followProject(userId: string, projectId: string): Promise<void> {
  if (redis) {
    await Promise.all([
      redis.sadd(userFollowingKey(userId), projectId),
      redis.sadd(projectFollowersKey(projectId), userId),
    ]);
    return;
  }

  const following = followingByUser.get(userId) ?? new Set<string>();
  const followers = followersByProject.get(projectId) ?? new Set<string>();
  following.add(projectId);
  followers.add(userId);
  followingByUser.set(userId, following);
  followersByProject.set(projectId, followers);
}

export async function unfollowProject(userId: string, projectId: string): Promise<void> {
  if (redis) {
    await Promise.all([
      redis.srem(userFollowingKey(userId), projectId),
      redis.srem(projectFollowersKey(projectId), userId),
    ]);
    return;
  }

  followingByUser.get(userId)?.delete(projectId);
  followersByProject.get(projectId)?.delete(userId);
}

export async function getReviewRatingThreshold(userId: string): Promise<number> {
  if (redis) {
    const value = await redis.get<number>(reviewRatingKey(userId));
    return Number.isInteger(value) && value! >= 1 && value! <= 5
      ? value!
      : DEFAULT_REVIEW_RATING;
  }
  return reviewRatingByUser.get(userId) ?? DEFAULT_REVIEW_RATING;
}

export async function setReviewRatingThreshold(
  userId: string,
  rating: number,
): Promise<void> {
  if (redis) {
    await redis.set(reviewRatingKey(userId), rating);
    return;
  }
  reviewRatingByUser.set(userId, rating);
}

export async function getProjectFollowerSettings(projectId: string) {
  const followers = await getProjectFollowerIds(projectId);
  return Promise.all(
    followers.map(async (userId) => ({
      userId,
      minReviewRating: await getReviewRatingThreshold(userId),
    })),
  );
}