import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/verify-signature";
import { cacheDel, CacheKey } from "@/lib/cache";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";
import { getReviewStore } from "@/lib/review-store";
import { applyVote, buildVoteMessage, type VoteKind } from "@/lib/review-votes";

/**
 * POST /api/reviews/[id]/vote
 *
 * Casts (or toggles) a helpful / unhelpful vote on a review.
 *
 * A wallet signature is REQUIRED: the client signs a deterministic message
 * (see `buildVoteMessage`) with Freighter and sends it along with the vote.
 * The server recomputes the expected message for this review/voter/kind and
 * verifies the Ed25519 signature before persisting, which guarantees:
 *   - one vote per wallet per review (toggling / moving)
 *   - the vote really came from the claimed wallet
 *   - tamper / replay protection (message is bound to review + kind + voter)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid request body", 400),
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid request body", 400),
        { status: 400 },
      );
    }

    const { userAddress, kind, signedPayload, signature } = body as {
      userAddress?: unknown;
      kind?: unknown;
      signedPayload?: unknown;
      signature?: unknown;
    };

    if (typeof userAddress !== "string" || !userAddress) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "A wallet address is required to vote", 400),
        { status: 400 },
      );
    }

    if (kind !== "helpful" && kind !== "unhelpful") {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "Vote kind must be 'helpful' or 'unhelpful'", 400),
        { status: 400 },
      );
    }

    // ── Wallet signature required ─────────────────────────────────────────
    if (typeof signedPayload !== "string" || typeof signature !== "string" || !signature) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "A wallet signature is required to vote", 401),
        { status: 401 },
      );
    }

    const expectedMessage = buildVoteMessage(id, userAddress, kind as VoteKind);
    if (signedPayload !== expectedMessage) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "Vote payload does not match this review", 401),
        { status: 401 },
      );
    }

    const isValid = verifySignature(signedPayload, signature, userAddress);
    if (!isValid) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "Invalid wallet signature", 401),
        { status: 401 },
      );
    }

    const store = getReviewStore();
    const review = store.get(id);
    if (!review) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Review not found", 404),
        { status: 404 },
      );
    }

    const updated = applyVote(review, userAddress, kind as VoteKind);
    store.set(id, updated);
    await cacheDel(CacheKey.reviews(updated.projectId));

    return NextResponse.json(createSuccessResponse(updated));
  } catch (error) {
    console.error("[Reviews API] Failed to record vote:", error);
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to record vote", 500),
      { status: 500 },
    );
  }
}