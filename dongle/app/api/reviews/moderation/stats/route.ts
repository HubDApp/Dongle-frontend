import { NextResponse } from "next/server";
import { getSpamStatistics } from "@/lib/moderation-store";

export async function GET() {
  return NextResponse.json({ success: true, data: getSpamStatistics() });
}
