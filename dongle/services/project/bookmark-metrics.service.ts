import { redis } from "@/lib/redis";

const bookmarkMembership = new Map<string, Set<string>>();

function keyFor(projectId: string) {
  return `social-proof:bookmarks:${projectId}`;
}

export async function setProjectBookmark(
  projectId: string,
  walletAddress: string,
  bookmarked: boolean,
): Promise<void> {
  if (redis) {
    if (bookmarked) await redis.sadd(keyFor(projectId), walletAddress);
    else await redis.srem(keyFor(projectId), walletAddress);
    return;
  }
  const members = bookmarkMembership.get(projectId) ?? new Set<string>();
  if (bookmarked) members.add(walletAddress);
  else members.delete(walletAddress);
  if (members.size === 0) bookmarkMembership.delete(projectId);
  else bookmarkMembership.set(projectId, members);
}

export async function getProjectBookmarkCount(projectId: string): Promise<number> {
  if (redis) return redis.scard(keyFor(projectId));
  return bookmarkMembership.get(projectId)?.size ?? 0;
}

export function resetBookmarkMetricsForTests(): void {
  bookmarkMembership.clear();
}