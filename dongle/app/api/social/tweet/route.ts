import { NextRequest, NextResponse } from "next/server";
import { manualTweet, getTwitterConfig, listOptOuts, optOut, optIn, isOptedOut } from "@/services/social/twitter-bot.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

/**
 * POST /api/social/tweet
 * Body: { text }
 * Manual tweet button handler for the admin panel (issue #722).
 */
export async function POST(request: NextRequest) {
  try {
    const config = getTwitterConfig();
    if (!config.enabled) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.SERVICE_UNAVAILABLE, "Twitter integration not configured", 503),
        { status: 503 },
      );
    }

    const body = await request.json();
    const { text } = body;
    if (!text || typeof text !== "string" || text.length > 280) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "text is required and must be <= 280 chars", 400),
        { status: 400 },
      );
    }

    const result = await manualTweet(text);
    return NextResponse.json(createSuccessResponse(result), { status: result.posted ? 200 : 502 });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Tweet failed", 500),
      { status: 500 },
    );
  }
}

/**
 * GET /api/social/twitter-config
 * Returns non-sensitive Twitter config for the admin panel.
 */
export async function GET() {
  const config = getTwitterConfig();
  return NextResponse.json(
    createSuccessResponse({
      enabled: config.enabled,
      botHandle: config.botHandle,
      autoTweetVerification: config.autoTweetVerification,
      autoTweetTrending: config.autoTweetTrending,
      autoTweetMilestones: config.autoTweetMilestones,
      configured: Boolean(config.apiKey),
    }),
  );
}
