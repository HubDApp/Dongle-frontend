import { NextResponse } from "next/server";
import { setProjectBookmark } from "@/services/project/bookmark-metrics.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { projectId?: string; walletAddress?: string; bookmarked?: boolean };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  if (
    !body.projectId || body.projectId.length > 128 ||
    !body.walletAddress || !/^G[A-Z2-7]{55}$/.test(body.walletAddress) ||
    typeof body.bookmarked !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid bookmark metric" }, { status: 400 });
  }

  try {
    await setProjectBookmark(body.projectId, body.walletAddress, body.bookmarked);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[social-proof/bookmarks] update failed", error);
    return NextResponse.json({ error: "Could not update bookmark metric" }, { status: 503 });
  }
}