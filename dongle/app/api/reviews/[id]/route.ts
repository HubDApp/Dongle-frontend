import { NextRequest, NextResponse } from "next/server";
import { hasMinLength } from "@/lib/validation";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

interface InMemoryReview {
  id: string;
  projectId: string;
  projectName: string;
  userAddress: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpfulVotes: string[];
  unhelpfulVotes: string[];
}

const store = new Map<string, InMemoryReview>();

function getStore(): Map<string, InMemoryReview> {
  return store;
}

function validateReviewInput(rating: unknown, comment: unknown): string | null {
  if (rating !== undefined && (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return "Rating must be an integer between 1 and 5";
  }
  if (comment !== undefined && (typeof comment !== "string" || !hasMinLength(comment, 10))) {
    return "Comment must be at least 10 characters";
  }
  if (typeof comment === "string" && comment.length > 1000) {
    return "Comment cannot exceed 1000 characters";
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const review = getStore().get(id);

    if (!review) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Review not found", 404),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(review));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to fetch review", 500),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reviews = getStore();
    const review = reviews.get(id);

    if (!review) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Review not found", 404),
        { status: 404 }
      );
    }

    const body = await request.json();
    const { userAddress, rating, comment } = body;

    if (review.userAddress !== userAddress) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.AUTHORIZATION_ERROR,
          "You do not have permission to edit this review",
          403
        ),
        { status: 403 }
      );
    }

    const validationError = validateReviewInput(rating, comment);
    if (validationError) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, validationError, 400),
        { status: 400 }
      );
    }

    const updated: InMemoryReview = {
      ...review,
      ...(rating !== undefined ? { rating } : {}),
      ...(comment !== undefined ? { comment } : {}),
    };

    reviews.set(id, updated);
    return NextResponse.json(createSuccessResponse(updated));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INVALID_REQUEST, "Invalid request body", 400),
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reviews = getStore();
    const review = reviews.get(id);

    if (!review) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Review not found", 404),
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryUserAddress = searchParams.get("userAddress");

    let userAddress: string | null = queryUserAddress;
    if (!userAddress) {
      try {
        const body = await request.json();
        userAddress = body.userAddress ?? null;
      } catch {
        userAddress = null;
      }
    }

    if (!userAddress || review.userAddress !== userAddress) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.AUTHORIZATION_ERROR,
          "You do not have permission to delete this review",
          403
        ),
        { status: 403 }
      );
    }

    reviews.delete(id);
    return NextResponse.json(createSuccessResponse({ success: true }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to delete review", 500),
      { status: 500 }
    );
  }
}
