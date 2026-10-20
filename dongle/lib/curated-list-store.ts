import { redis } from "@/lib/redis";
import type { CuratedProjectList } from "@/types/curated-list";

const INDEX_KEY = "curated-lists:index";
const LIST_KEY_PREFIX = "curated-lists:item:";
const fallback = new Map<string, CuratedProjectList>();

export class CuratedListStoreUnavailableError extends Error {}

function requireRedis() {
  if (!redis) throw new CuratedListStoreUnavailableError("Shared list storage is not configured.");
  return redis;
}

export async function getStoredList(id: string): Promise<CuratedProjectList | null> {
  if (!redis) return fallback.get(id) ?? null;
  const value = await redis.get<string>(`${LIST_KEY_PREFIX}${id}`);
  if (!value) return null;
  return (typeof value === "string" ? JSON.parse(value) : value) as CuratedProjectList;
}

export async function getStoredLists(): Promise<CuratedProjectList[]> {
  if (!redis) return [...fallback.values()];
  const client = requireRedis();
  const ids = await client.smembers<string[]>(INDEX_KEY);
  const lists = await Promise.all(ids.map((id) => getStoredList(id)));
  return lists.filter((list): list is CuratedProjectList => list !== null);
}

export async function saveStoredList(list: CuratedProjectList): Promise<void> {
  if (!redis) {
    fallback.set(list.id, list);
    return;
  }
  const client = requireRedis();
  await client.set(`${LIST_KEY_PREFIX}${list.id}`, JSON.stringify(list));
  await client.sadd(INDEX_KEY, list.id);
}