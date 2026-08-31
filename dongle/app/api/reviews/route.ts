import { NextRequest, NextResponse } from "next/server";
import { Review } from "@/types/review";
import { hasMinLength } from "@/lib/validation";
import {
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
  APIError,
} from "@/services/error/error.service";

interface InMemoryReview extends Review {
  helpfulVotes: string[];
  unhelpfulVotes: string[];
}

const store = new Map<string, InMemoryReview>();

function generateId(): string {
  return crypto.randomUUID();
}

function validateReviewInput(rating: unknown, comment: unknown): string | null {
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Rating must be an integer between 1 and 5";
  }
  if (typeof comment !== "string" || !hasMinLength(comment, 10)) {
    return "Comment must be at least 10 characters";
  }
  if (comment.length > 1000) {
    return "Comment cannot exceed 1000 characters";
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const userAddress = searchParams.get("userAddress");

    let reviews = Array.from(store.values());

    if (projectId) {
      reviews = reviews.filter((r) => r.projectId === projectId);
    }
    if (userAddress) {
      reviews = reviews.filter((r) => r.userAddress === userAddress);
    }

    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(createSuccessResponse(reviews));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to fetch reviews", 500),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectName, userAddress, rating, comment } = body;

    if (!projectId || !projectName || !userAddress) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "Missing required fields", 400),
        { status: 400 }
      );
    }

    const validationError = validateReviewInput(rating, comment);
    if (validationError) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, validationError, 400),
        { status: 400 }
      );
    }

    if (isReviewerBanned(userAddress)) {
      return NextResponse.json(
        { success: false, errors: [{ field: "comment", message: "Your account is banned from submitting reviews" }] },
        { status: 403 },
      );
    }

    const existing = Array.from(store.values()).find(
      (r) => r.userAddress === userAddress && r.projectId === projectId,
    );
    if (existing) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.CONFLICT,
          "You have already reviewed this project",
          409
        ),
        { status: 409 }
      );
    }

    const { captchaToken } = body as { captchaToken?: string };
    const dailyCount = recordReviewSubmission(userAddress, new Date().toISOString());
    const spamAssessment = assessReviewSpam(comment, dailyCount);
    if (spamAssessment.requiresCaptcha && !captchaToken) {
      return NextResponse.json(
        {
          success: false,
          errors: [{ field: "comment", message: "CAPTCHA required due to high review velocity" }],
          requiresCaptcha: true,
          riskScore: spamAssessment.riskScore,
        },
        { status: 429 },
      );
    }

    const newReview: InMemoryReview = {
      id: generateId(),
      projectId,
      projectName,
      userAddress,
      rating,
      comment,
      createdAt: new Date().toISOString(),
      helpfulVotes: [],
      unhelpfulVotes: [],
    };

    store.set(newReview.id, newReview);
    return NextResponse.json(createSuccessResponse(newReview), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INVALID_REQUEST, "Invalid request body", 400),
      { status: 400 }
    );
  }
}

