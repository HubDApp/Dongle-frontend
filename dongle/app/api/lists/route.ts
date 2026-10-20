import { NextRequest, NextResponse } from "next/server";
import { type CuratedProjectList, type CuratedListVisibility } from "@/types/curated-list";
import { CuratedListStoreUnavailableError, getStoredLists, saveStoredList } from "@/lib/curated-list-store";
import { redis } from "@/lib/redis";
import { verifyCuratedListRequest } from "@/lib/curated-list-auth";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof CuratedListStoreUnavailableError || !redis) {
    return NextResponse.json({ error: "Shared list storage is not configured." }, { status: 503 });
  }
  console.error("[curated-lists] request failed", error);
  return NextResponse.json({ error: "Could not load curated lists." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const viewer = request.nextUrl.searchParams.get("viewer");
    if (viewer) {
      const auth = request.nextUrl.searchParams.get("auth");
      let signed: unknown;
      try { signed = auth ? JSON.parse(auth) : null; } catch { signed = null; }
      if (!await verifyCuratedListRequest(signed, "GET:/api/lists", { viewer }, viewer)) {
        return NextResponse.json({ error: "Wallet signature required." }, { status: 401 });
      }
    }
    const lists = await getStoredLists();
    return NextResponse.json(lists.filter((list) =>
      list.visibility === "public" || Boolean(
        viewer && (list.ownerAddress === viewer || list.editorAddresses.includes(viewer)),
      ),
    ));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json() as Partial<CuratedProjectList> & { signedPayload?: unknown };
    const { signedPayload, ...body } = requestBody;
    if (typeof body.ownerAddress !== "string" ||
      !await verifyCuratedListRequest(signedPayload, "POST:/api/lists", body as Record<string, unknown>, body.ownerAddress)) {
      return NextResponse.json({ error: "Valid wallet signature required." }, { status: 401 });
    }
    const visibility = body.visibility as CuratedListVisibility;
    if (
      typeof body.title !== "string" || !body.title.trim() || body.title.length > 100 ||
      typeof body.description !== "string" || body.description.length > 2000 ||
      !Array.isArray(body.projectIds) || body.projectIds.length === 0 ||
      !Array.isArray(body.editorAddresses) || !["public", "unlisted", "private"].includes(visibility) ||
      body.projectIds.some((id) => typeof id !== "string") ||
      body.editorAddresses.some((address) => typeof address !== "string") ||
      typeof body.ownerAddress !== "string" || !body.ownerAddress
    ) {
      return NextResponse.json({ error: "Invalid curated list." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const list: CuratedProjectList = {
      id: crypto.randomUUID(),
      title: body.title.trim(),
      description: body.description.trim(),
      projectIds: [...new Set(body.projectIds.filter((id): id is string => typeof id === "string"))],
      visibility,
      ownerAddress: body.ownerAddress,
      editorAddresses: [...new Set(body.editorAddresses.filter((address): address is string => typeof address === "string"))],
      followers: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveStoredList(list);
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export function HEAD() {
  return new NextResponse(null, { status: redis ? 204 : 503 });
}