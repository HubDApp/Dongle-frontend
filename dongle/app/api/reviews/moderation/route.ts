import { NextRequest, NextResponse } from "next/server";
import {
  bulkModerationAction,
  getFlaggedReviews,
  getSpamStatistics,
} from "@/lib/moderation-store";
import type { FlaggedReviewStatus, ModerationBulkAction } from "@/types/moderation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as FlaggedReviewStatus | null;
  const queue = getFlaggedReviews(status ?? undefined);
  return NextResponse.json({ success: true, data: queue });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flaggedIds, action, moderatorAddress, reason } = body as {
      flaggedIds: string[];
      action: ModerationBulkAction;
      moderatorAddress: string;
      reason?: string;
    };

    if (!Array.isArray(flaggedIds) || !action || !moderatorAddress) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = bulkModerationAction(flaggedIds, action, moderatorAddress, reason);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
