/**
 * API Route: /api/drafts/[walletAddress]/[draftId]
 *
 * Handles server-side draft persistence keyed by wallet address.
 * Drafts expire after 30 days (TTL enforced via expiresAt field).
 *
 * GET    – retrieve a single draft
 * PUT    – create or update a draft
 * DELETE – remove a draft
 */

import { NextRequest, NextResponse } from "next/server";
import type { ProjectDraft } from "@/services/draft/draft.service";

// ---------------------------------------------------------------------------
// In-memory store (replace with a real DB / KV store in production)
// ---------------------------------------------------------------------------

// Map<walletAddress, Map<draftId, StoredDraft>>
const store = new Map<string, Map<string, StoredDraft>>();

interface StoredDraft extends ProjectDraft {
  /** Unix timestamp (ms) after which the draft should be considered expired. */
  expiresAt: number;
}

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWalletDrafts(walletAddress: string): Map<string, StoredDraft> {
  if (!store.has(walletAddress)) {
    store.set(walletAddress, new Map());
  }
  // Non-null assertion safe: we just set it above.
  return store.get(walletAddress)!;
}

/** Validate that a wallet address looks like a Stellar public key (G…). */
function isValidWalletAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

/** Validate draft ID is a non-empty alphanumeric slug. */
function isValidDraftId(id: string): boolean {
  return /^[\w\-]{1,100}$/.test(id);
}

function purgeExpiredDrafts(drafts: Map<string, StoredDraft>): void {
  const now = Date.now();
  for (const [id, draft] of drafts) {
    if (draft.expiresAt < now) {
      drafts.delete(id);
    }
  }
}

// ---------------------------------------------------------------------------
// Route parameters type
// ---------------------------------------------------------------------------

interface RouteParams {
  walletAddress: string;
  draftId: string;
}

// ---------------------------------------------------------------------------
// GET /api/drafts/[walletAddress]/[draftId]
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> }
): Promise<NextResponse> {
  const { walletAddress, draftId } = await params;

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 }
    );
  }

  if (!isValidDraftId(draftId)) {
    return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
  }

  const drafts = getWalletDrafts(walletAddress);
  purgeExpiredDrafts(drafts);

  const draft = drafts.get(draftId);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.expiresAt < Date.now()) {
    drafts.delete(draftId);
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Omit internal field before responding
  const { expiresAt: _expiresAt, ...publicDraft } = draft;
  return NextResponse.json(publicDraft);
}

// ---------------------------------------------------------------------------
// PUT /api/drafts/[walletAddress]/[draftId]
// ---------------------------------------------------------------------------

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
): Promise<NextResponse> {
  const { walletAddress, draftId } = await params;

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 }
    );
  }

  if (!isValidDraftId(draftId)) {
    return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
  }

  let body: Omit<ProjectDraft, "lastSaved" | "id">;
  try {
    body = (await req.json()) as Omit<ProjectDraft, "lastSaved" | "id">;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Basic payload validation
  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid draft data" },
      { status: 400 }
    );
  }

  if (body.mode !== "create" && body.mode !== "edit") {
    return NextResponse.json(
      { error: "Invalid mode; must be 'create' or 'edit'" },
      { status: 400 }
    );
  }

  const drafts = getWalletDrafts(walletAddress);
  purgeExpiredDrafts(drafts);

  const now = new Date().toISOString();
  const stored: StoredDraft = {
    id: draftId,
    data: body.data,
    mode: body.mode,
    projectId: body.projectId,
    lastSaved: now,
    expiresAt: Date.now() + TTL_MS,
  };

  drafts.set(draftId, stored);

  const { expiresAt: _expiresAt, ...publicDraft } = stored;
  return NextResponse.json(publicDraft, { status: 200 });
}

// ---------------------------------------------------------------------------
// DELETE /api/drafts/[walletAddress]/[draftId]
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> }
): Promise<NextResponse> {
  const { walletAddress, draftId } = await params;

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 }
    );
  }

  if (!isValidDraftId(draftId)) {
    return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
  }

  const drafts = getWalletDrafts(walletAddress);
  const existed = drafts.delete(draftId);

  if (!existed) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
