import { NextRequest, NextResponse } from "next/server";
import { Review, isReviewSentiment } from "@/types/review";
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
import { cacheGet, cacheSet, cacheDel, CacheKey, REVIEWS_TTL_S } from "@/lib/cache";
import { getReviewStore } from "@/lib/review-store";

const store = getReviewStore();

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

    // Serve from cache for project-scoped queries (most common case)
    if (projectId && !userAddress) {
      const cached = await cacheGet<Review[]>(CacheKey.reviews(projectId));
      if (cached) {
        const withLanguage = cached.map((review) => ({
          ...review,
          language: review.language ?? detectReviewLanguage(review.comment),
        }));
        if (cached.some((review) => !review.language)) {
          await cacheSet(CacheKey.reviews(projectId), withLanguage, REVIEWS_TTL_S);
        }
        return NextResponse.json(createSuccessResponse(withLanguage));
      }
    }

    let reviews = Array.from(store.values()).map((review) => {
      if (review.language) return review;
      const migrated = { ...review, language: detectReviewLanguage(review.comment) };
      store.set(review.id, migrated);
      return migrated;
    });

    if (projectId) {
      reviews = reviews.filter((r) => r.projectId === projectId);
    }
    if (userAddress) {
      reviews = reviews.filter((r) => r.userAddress === userAddress);
    }

    for (const review of reviews) {
      if (!isReviewSentiment(review.sentiment)) {
        review.sentiment = classifyReviewSentiment(review.comment);
        review.sentimentSource = "automatic";
      }
    }
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Populate cache for project-scoped results
    if (projectId && !userAddress) {
      await cacheSet(CacheKey.reviews(projectId), reviews, REVIEWS_TTL_S);
    }

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
    const {
      projectId, projectName, userAddress, rating, comment,
      signedPayload, signature, signatureNonce, signatureTimestamp, captchaToken,
      // E2E encryption fields (#731)
      encrypted, encryptedPayload, encryptedCid, adminWrappedKey,
    } = body;

    if (!projectId || !projectName || !userAddress) {
      return NextResponse.json(
        { success: false, errors: [{ field: "comment", message: "Missing required fields" }] },
        { status: 400 }
      );
    }

    // For encrypted reviews the comment is the sentinel — skip length validation.
    const validationError = encrypted
      ? validateReviewInput(rating, "placeholder comment") // rating-only check
      : validateReviewInput(rating, comment);
    if (validationError) {
      return NextResponse.json(
        { success: false, errors: [validationError] },
        { status: 400 }
      );
    }

    // Encrypted reviews must supply an encryptedPayload.
    if (encrypted && !encryptedPayload) {
      return NextResponse.json(
        { success: false, errors: [{ field: "comment", message: "encryptedPayload is required for encrypted reviews" }] },
        { status: 400 }
      );
    }

    // ── Signature verification (cryptographic form submission signing) ─────
    // If a signature is provided, verify it against the payload and public key.
    // This ensures tamper detection and authenticity of the submission.
    let isVerifiedReviewer = false;
    if (signedPayload && signature) {
      const isValid = verifySignature(signedPayload, signature, userAddress);
      if (!isValid) {
        return NextResponse.json(
          createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "Invalid submission signature — payload may have been tampered with", 401),
          { status: 401 }
        );
      }
      isVerifiedReviewer = true;
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

    const newReview: Review = {
      id: generateId(),
      projectId,
      projectName,
      userAddress,
      rating,
      comment,
      language: detectReviewLanguage(comment),
      createdAt: new Date().toISOString(),
      language: typeof language === "string"
        ? language.toLowerCase().split("-")[0]
        : request.headers.get("accept-language")?.split(",")[0]?.split("-")[0]?.toLowerCase(),
      isVerifiedReviewer,
      helpfulVotes: [],
      unhelpfulVotes: [],
      signedPayload: signedPayload || undefined,
      signature: signature || undefined,
      signatureNonce: signatureNonce || undefined,
      signatureTimestamp: signatureTimestamp || undefined,
      // E2E encryption (#731)
      encrypted: encrypted === true ? true : undefined,
      encryptedPayload: encryptedPayload || undefined,
      encryptedCid: encryptedCid || undefined,
      adminWrappedKey: adminWrappedKey || undefined,
    };

    store.set(newReview.id, newReview);
    // Invalidate the cached reviews for this project so the next GET is fresh
    await cacheDel(CacheKey.reviews(projectId));
    return NextResponse.json(createSuccessResponse(newReview), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INVALID_REQUEST, "Invalid request body", 400),
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = await getAdminTokenFromCookie();
    const admin = token ? await verifyAdminToken(token) : null;
    if (!admin || !isAdminAllowed(admin.publicKey)) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "Admin authentication required", 401),
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "A review ID and valid sentiment are required", 400),
        { status: 400 },
      );
    }
    const { id, sentiment } = body as { id?: unknown; sentiment?: unknown };
    if (typeof id !== "string" || !id || !isReviewSentiment(sentiment)) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "A review ID and valid sentiment are required", 400),
        { status: 400 },
      );
    }

    const review = store.get(id);
    if (!review) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Review not found", 404),
        { status: 404 },
      );
    }

    review.sentiment = sentiment;
    review.sentimentSource = "admin";
    await cacheDel(CacheKey.reviews(review.projectId));
    return NextResponse.json(createSuccessResponse(review));
  } catch (error) {
    console.error("[Reviews API] Failed to override review sentiment:", error);
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Could not update review sentiment", 500),
      { status: 500 },
    );
  }
}
