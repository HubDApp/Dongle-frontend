import { NextRequest, NextResponse } from "next/server";

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
  if (comment !== undefined && (typeof comment !== "string" || comment.trim().length < 10)) {
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
  const { id } = await params;
  const review = getStore().get(id);

  if (!review) {
    return NextResponse.json(
      { success: false, error: "Review not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: review });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reviews = getStore();
  const review = reviews.get(id);

  if (!review) {
    return NextResponse.json(
      { success: false, errors: [{ field: "comment", message: "Review not found" }] },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const { userAddress, rating, comment } = body;

    if (review.userAddress !== userAddress) {
      return NextResponse.json(
        { success: false, errors: [{ field: "comment", message: "You do not have permission to edit this review" }] },
        { status: 403 },
      );
    }

    const validationError = validateReviewInput(rating, comment);
    if (validationError) {
      return NextResponse.json(
        { success: false, errors: [{ field: "comment", message: validationError }] },
        { status: 400 },
      );
    }

    const updated: InMemoryReview = {
      ...review,
      ...(rating !== undefined ? { rating } : {}),
      ...(comment !== undefined ? { comment } : {}),
    };

    reviews.set(id, updated);
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json(
      { success: false, errors: [{ field: "comment", message: "Invalid request body" }] },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reviews = getStore();
  const review = reviews.get(id);

  if (!review) {
    return NextResponse.json(
      { success: false, error: "Review not found" },
      { status: 404 },
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
      { success: false, error: "You do not have permission to delete this review" },
      { status: 403 },
    );
  }

  reviews.delete(id);
  return NextResponse.json({ success: true });
}
