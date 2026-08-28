import { NextRequest, NextResponse } from "next/server";
import {
  getDailyReviewCount,
  isReviewerBanned,
  requiresCaptcha,
} from "@/lib/moderation-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get("userAddress");

  if (!userAddress) {
    return NextResponse.json(
      { success: false, error: "userAddress is required" },
      { status: 400 },
    );
  }

  const dailyCount = getDailyReviewCount(userAddress);
  return NextResponse.json({
    success: true,
    dailyCount,
    requiresCaptcha: requiresCaptcha(userAddress),
    banned: isReviewerBanned(userAddress),
  });
}
