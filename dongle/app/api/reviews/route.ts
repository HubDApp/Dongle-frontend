import { NextRequest, NextResponse } from "next/server";
import { Review } from "@/types/review";
import { hasMinLength } from "@/lib/validation";
import { verifySignature } from "@/lib/verify-signature";
import {
  isReviewerBanned,
  recordReviewSubmission,
} from "@/lib/moderation-store";
import { assessReviewSpam } from "@/utils/review-spam.util";
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

interface ValidationError {
  field: string;
  message: string;
}

function validateReviewInput(
  rating: unknown,
  comment: unknown,
): ValidationError | null {
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { field: "rating", message: "Rating must be an integer between 1 and 5" };
  }
  if (typeof comment !== "string" || !hasMinLength(comment, 10)) {
    return { field: "comment", message: "Comment must be at least 10 characters" };
  }
  if (comment.length > 1000) {
    return { field: "comment", message: "Comment cannot exceed 1000 characters" };
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
    const { projectId, projectName, userAddress, rating, comment, signedPayload, signature, signatureNonce, signatureTimestamp, captchaToken } = body;

    if (!projectId || !projectName || !userAddress) {
      return NextResponse.json(
        {
          success: false,
          errors: [{ field: "comment", message: "Missing required fields" }],
        },
        { status: 400 }
      );
    }

    const validationError = validateReviewInput(rating, comment);
    if (validationError) {
      return NextResponse.json(
        { success: false, errors: [validationError] },
        { status: 400 }
      );
    }

    // ── Signature verification (cryptographic form submission signing) ─────
    // If a signature is provided, verify it against the payload and public key.
    // This ensures tamper detection and authenticity of the submission.
    if (signedPayload && signature) {
      const isValid = verifySignature(signedPayload, signature, userAddress);
      if (!isValid) {
        return NextResponse.json(
          createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "Invalid submission signature — payload may have been tampered with", 401),
          { status: 401 }
        );
      }
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
        {
          success: false,
          errors: [{ field: "comment", message: "You have already reviewed this project" }],
        },
        { status: 409 }
      );
    }

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
      signedPayload: signedPayload || undefined,
      signature: signature || undefined,
      signatureNonce: signatureNonce || undefined,
      signatureTimestamp: signatureTimestamp || undefined,
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

