/**
 * GET  /api/reviews/[id]/comments  — Issue #654
 * POST /api/reviews/[id]/comments
 *
 * Threaded discussion comments on a review.
 *
 * GET  ?page=<n>&pageSize=<n>   — paginated root comments (replies nested inline)
 * POST { body, parentId?, authorAddress } — create a comment or reply
 *
 * Rules:
 *  - Max nesting depth: 3
 *  - Comment editing allowed within 5 minutes of creation (enforced on PATCH below)
 *  - Markdown body is sanitised server-side via isomorphic-dompurify
 *  - Real-time notifications delivered via SSE (see /api/reviews/[id]/comments/stream)
 */

import { NextRequest, NextResponse } from "next/server";
import DOMPurify from "isomorphic-dompurify";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";
import type {
  ReviewComment,
  ReviewCommentInput,
  ReviewCommentsResponse,
} from "@/types/review-comment";
import { MAX_COMMENT_DEPTH } from "@/types/review-comment";

// ─── In-memory store ──────────────────────────────────────────────────────────
// reviewId → flat list of comments (tree is built on read)
const commentStore = new Map<string, ReviewComment[]>();

function generateId(): string {
  return crypto.randomUUID();
}

function getComments(reviewId: string): ReviewComment[] {
  return commentStore.get(reviewId) ?? [];
}

function saveComment(reviewId: string, comment: ReviewComment): void {
  const existing = getComments(reviewId);
  commentStore.set(reviewId, [...existing, comment]);
}

function updateComment(reviewId: string, id: string, body: string): ReviewComment | null {
  const list = getComments(reviewId);
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...list[idx], body, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  commentStore.set(reviewId, list);
  return updated;
}

function softDeleteComment(reviewId: string, id: string): boolean {
  const list = getComments(reviewId);
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], deleted: true, updatedAt: new Date().toISOString() };
  commentStore.set(reviewId, list);
  return true;
}

/** Build a nested tree from a flat list of comments. Mutates reply arrays. */
function buildTree(flat: ReviewComment[]): ReviewComment[] {
  const map = new Map<string, ReviewComment>();
  const roots: ReviewComment[] = [];

  // Clone to avoid mutating the store
  const cloned = flat.map((c) => ({ ...c, replies: [] as ReviewComment[] }));
  cloned.forEach((c) => map.set(c.id, c));

  cloned.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      const parent = map.get(c.parentId)!;
      parent.replies = parent.replies ?? [];
      parent.replies.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
}

// ─── Sanitise markdown ────────────────────────────────────────────────────────

const ALLOWED_TAGS = ["b", "i", "em", "strong", "code", "pre", "a", "p", "ul", "ol", "li", "br"];
const ALLOWED_ATTR = ["href", "target", "rel"];

function sanitiseBody(raw: string): string {
  return DOMPurify.sanitize(raw.trim(), { ALLOWED_TAGS, ALLOWED_ATTR });
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateBody(body: unknown): string | null {
  if (typeof body !== "string" || body.trim().length < 1) {
    return "Comment body cannot be empty";
  }
  if (body.length > 2000) {
    return "Comment body cannot exceed 2000 characters";
  }
  return null;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reviewId } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const flat = getComments(reviewId);
    const tree = buildTree(flat);

    // Sort roots newest-first
    tree.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = tree.length;
    const start = (page - 1) * pageSize;
    const paged = tree.slice(start, start + pageSize);

    const response: ReviewCommentsResponse = {
      comments: paged,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    };

    return NextResponse.json(createSuccessResponse(response));
  } catch {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to fetch comments", 500),
      { status: 500 },
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reviewId } = await params;
    const body = await request.json() as ReviewCommentInput;
    const { body: rawBody, parentId = null, authorAddress } = body;

    if (!authorAddress) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "authorAddress is required", 401),
        { status: 401 },
      );
    }

    const bodyError = validateBody(rawBody);
    if (bodyError) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_REQUEST, bodyError, 400),
        { status: 400 },
      );
    }

    // Depth check
    let depth = 0;
    if (parentId) {
      const existing = getComments(reviewId);
      const parent = existing.find((c) => c.id === parentId);
      if (!parent) {
        return NextResponse.json(
          createErrorResponse(ErrorCode.NOT_FOUND, "Parent comment not found", 404),
          { status: 404 },
        );
      }
      depth = parent.depth + 1;
      if (depth >= MAX_COMMENT_DEPTH) {
        return NextResponse.json(
          createErrorResponse(
            ErrorCode.INVALID_REQUEST,
            `Maximum reply depth of ${MAX_COMMENT_DEPTH} reached`,
            422,
          ),
          { status: 422 },
        );
      }
    }

    const sanitised = sanitiseBody(rawBody);
    const now = new Date().toISOString();

    const comment: ReviewComment = {
      id: generateId(),
      reviewId,
      authorAddress,
      parentId,
      depth,
      body: sanitised,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    saveComment(reviewId, comment);

    return NextResponse.json(createSuccessResponse(comment), { status: 201 });
  } catch {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INVALID_REQUEST, "Invalid request body", 400),
      { status: 400 },
    );
  }
}

// ─── PATCH (edit within 5-minute window) ─────────────────────────────────────
// PATCH /api/reviews/[id]/comments?commentId=<cid>

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reviewId } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_REQUEST, "commentId query param is required", 400),
        { status: 400 },
      );
    }

    const { body: rawBody, authorAddress } = (await request.json()) as {
      body: string;
      authorAddress: string;
    };

    if (!authorAddress) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "authorAddress is required", 401),
        { status: 401 },
      );
    }

    const existing = getComments(reviewId);
    const comment = existing.find((c) => c.id === commentId);

    if (!comment) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Comment not found", 404),
        { status: 404 },
      );
    }

    if (comment.authorAddress !== authorAddress) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTHORIZATION_ERROR, "Only the author can edit this comment", 403),
        { status: 403 },
      );
    }

    const EDIT_WINDOW_MS = 5 * 60 * 1000;
    const age = Date.now() - new Date(comment.createdAt).getTime();
    if (age > EDIT_WINDOW_MS) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.INVALID_REQUEST,
          "Comments can only be edited within 5 minutes of posting",
          422,
        ),
        { status: 422 },
      );
    }

    const bodyError = validateBody(rawBody);
    if (bodyError) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_REQUEST, bodyError, 400),
        { status: 400 },
      );
    }

    const updated = updateComment(reviewId, commentId, sanitiseBody(rawBody));
    if (!updated) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Comment not found", 404),
        { status: 404 },
      );
    }

    return NextResponse.json(createSuccessResponse(updated));
  } catch {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INVALID_REQUEST, "Invalid request body", 400),
      { status: 400 },
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reviewId } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_REQUEST, "commentId query param is required", 400),
        { status: 400 },
      );
    }

    // authorAddress can be in query or body
    let requesterAddress = searchParams.get("authorAddress");
    if (!requesterAddress) {
      try {
        const b = await request.json();
        requesterAddress = b?.authorAddress ?? null;
      } catch {
        // no body
      }
    }

    const existing = getComments(reviewId);
    const comment = existing.find((c) => c.id === commentId);

    if (!comment) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Comment not found", 404),
        { status: 404 },
      );
    }

    // Only author can delete (admin check would normally call useAdminAccess equivalent)
    if (comment.authorAddress !== requesterAddress) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTHORIZATION_ERROR, "Only the author or an admin can delete this comment", 403),
        { status: 403 },
      );
    }

    softDeleteComment(reviewId, commentId);

    return NextResponse.json(createSuccessResponse({ deleted: true }));
  } catch {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INVALID_REQUEST, "Invalid request", 400),
      { status: 400 },
    );
  }
}
