import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/verify-signature";
import { UPDATE_REACTIONS, type UpdateReactionType } from "@/types/update";

interface ReactionLedger {
  projectId: string;
  reactions: Map<UpdateReactionType, Set<string>>;
}

const reactions = new Map<string, ReactionLedger>();
const usedNonces = new Map<string, number>();
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

function getLedger(updateId: string, projectId: string): ReactionLedger | null {
  let ledger = reactions.get(updateId);
  if (ledger && ledger.projectId !== projectId) return null;
  if (!ledger) {
    ledger = { projectId, reactions: new Map() };
    reactions.set(updateId, ledger);
  }
  return ledger;
}

function summarize(updateId: string, ledger: ReactionLedger | undefined, userAddress?: string) {
  const counts: Partial<Record<UpdateReactionType, number>> = {};
  const userReactions: UpdateReactionType[] = [];
  for (const reaction of UPDATE_REACTIONS) {
    const users = ledger?.reactions.get(reaction);
    if (users?.size) counts[reaction] = users.size;
    if (userAddress && users?.has(userAddress)) userReactions.push(reaction);
  }
  return { updateId, counts, userReactions };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const userAddress = searchParams.get("userAddress");
  const updateIds = searchParams.get("updateIds")?.split(",").filter(Boolean) ?? [];

  if (!projectId) {
    return NextResponse.json({ success: false, error: "projectId is required" }, { status: 400 });
  }

  const summaries = updateIds.slice(0, 500).map((updateId) => {
    const ledger = reactions.get(updateId);
    return summarize(updateId, ledger?.projectId === projectId ? ledger : undefined, userAddress ?? undefined);
  });

  return NextResponse.json({ success: true, data: summaries });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { projectId, updateId, reaction, publicKey, payload, signature, nonce, timestamp } = body;
  if (
    typeof projectId !== "string" ||
    typeof updateId !== "string" ||
    !UPDATE_REACTIONS.includes(reaction as UpdateReactionType) ||
    typeof publicKey !== "string" ||
    typeof payload !== "string" ||
    typeof signature !== "string" ||
    typeof nonce !== "string" ||
    typeof timestamp !== "string"
  ) {
    return NextResponse.json({ success: false, error: "Missing or invalid reaction fields" }, { status: 400 });
  }

  const signedAt = Date.parse(timestamp);
  if (!Number.isFinite(signedAt) || Math.abs(Date.now() - signedAt) > MAX_SIGNATURE_AGE_MS) {
    return NextResponse.json({ success: false, error: "Signature expired" }, { status: 401 });
  }
  for (const [usedNonce, expiry] of usedNonces) {
    if (expiry <= Date.now()) usedNonces.delete(usedNonce);
  }
  if (usedNonces.has(nonce)) {
    return NextResponse.json({ success: false, error: "Signature already used" }, { status: 409 });
  }

  let signedData: Record<string, unknown>;
  try {
    signedData = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid signed payload" }, { status: 400 });
  }

  if (
    signedData.action !== "toggle-update-reaction" ||
    signedData.projectId !== projectId ||
    signedData.updateId !== updateId ||
    signedData.reaction !== reaction ||
    signedData.publicKey !== publicKey ||
    signedData.nonce !== nonce ||
    signedData.timestamp !== timestamp ||
    !verifySignature(payload, signature, publicKey)
  ) {
    return NextResponse.json({ success: false, error: "Invalid reaction signature" }, { status: 401 });
  }

  const ledger = getLedger(updateId, projectId);
  if (!ledger) {
    return NextResponse.json({ success: false, error: "Update belongs to another project" }, { status: 409 });
  }
  usedNonces.set(nonce, signedAt + MAX_SIGNATURE_AGE_MS);
  let users = ledger.reactions.get(reaction as UpdateReactionType);
  if (!users) {
    users = new Set();
    ledger.reactions.set(reaction as UpdateReactionType, users);
  }

  if (users.has(publicKey)) users.delete(publicKey);
  else users.add(publicKey);

  return NextResponse.json({
    success: true,
    data: summarize(updateId, ledger, publicKey),
  });
}