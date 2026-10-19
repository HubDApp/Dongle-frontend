import { signMessage } from "@stellar/freighter-api";
import { generateId } from "@/lib/id-generator";
import type { UpdateReactionSummary, UpdateReactionType } from "@/types/update";

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as { success?: boolean; data?: T; error?: string };
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || "Could not update reactions");
  }
  return body.data;
}

async function getSummaries(
  projectId: string,
  updateIds: string[],
  userAddress?: string | null,
): Promise<UpdateReactionSummary[]> {
  if (updateIds.length === 0) return [];
  const params = new URLSearchParams({ projectId, updateIds: updateIds.join(",") });
  if (userAddress) params.set("userAddress", userAddress);
  const response = await fetch(`/api/updates/reactions?${params.toString()}`);
  return readResponse<UpdateReactionSummary[]>(response);
}

async function toggleReaction(
  projectId: string,
  updateId: string,
  reaction: UpdateReactionType,
  publicKey: string,
): Promise<UpdateReactionSummary> {
  const nonce = generateId();
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    action: "toggle-update-reaction",
    projectId,
    updateId,
    reaction,
    nonce,
    timestamp,
    publicKey,
  });
  const { signature } = await signMessage(payload);
  const response = await fetch("/api/updates/reactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, updateId, reaction, publicKey, payload, signature, nonce, timestamp }),
  });
  return readResponse<UpdateReactionSummary>(response);
}

export const updateReactionService = { getSummaries, toggleReaction };