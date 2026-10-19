import { NextRequest, NextResponse } from "next/server";
import { canEditCuratedList, canViewCuratedList, type CuratedListComment, type CuratedProjectList, type CuratedProjectListInput } from "@/types/curated-list";
import { CuratedListStoreUnavailableError, getStoredList, saveStoredList } from "@/lib/curated-list-store";
import { redis } from "@/lib/redis";
import { verifyCuratedListRequest } from "@/lib/curated-list-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof CuratedListStoreUnavailableError || !redis) {
    return NextResponse.json({ error: "Shared list storage is not configured." }, { status: 503 });
  }
  console.error("[curated-lists] request failed", error);
  return NextResponse.json({ error: "Could not update curated list." }, { status: 500 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const list = await getStoredList(id);
    const viewer = request.nextUrl.searchParams.get("viewer");
    if (viewer) {
      const auth = request.nextUrl.searchParams.get("auth");
      let signed: unknown;
      try { signed = auth ? JSON.parse(auth) : null; } catch { signed = null; }
      if (!await verifyCuratedListRequest(signed, `GET:/api/lists/${id}`, { viewer }, viewer)) {
        return NextResponse.json({ error: "Wallet signature required." }, { status: 401 });
      }
    }
    if (!list || !canViewCuratedList(list, viewer)) {
      return NextResponse.json({ error: "List not found." }, { status: 404 });
    }
    return NextResponse.json(list);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const requestBody = await request.json() as { actorAddress?: string; changes?: CuratedProjectListInput; signedPayload?: unknown };
    const { signedPayload, ...body } = requestBody;
    if (typeof body.actorAddress !== "string" ||
      !await verifyCuratedListRequest(signedPayload, `PUT:/api/lists/${id}`, body as Record<string, unknown>, body.actorAddress)) {
      return NextResponse.json({ error: "Valid wallet signature required." }, { status: 401 });
    }
    const list = await getStoredList(id);
    if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
    if (!canEditCuratedList(list, body.actorAddress)) {
      return NextResponse.json({ error: "You cannot edit this list." }, { status: 403 });
    }
    if (!body.changes || typeof body.changes.title !== "string" || !body.changes.title.trim() ||
      typeof body.changes.description !== "string" || body.changes.description.length > 2000 ||
      !Array.isArray(body.changes.projectIds) || !Array.isArray(body.changes.editorAddresses) ||
      body.changes.projectIds.some((projectId) => typeof projectId !== "string") ||
      body.changes.editorAddresses.some((address) => typeof address !== "string") ||
      !["public", "unlisted", "private"].includes(body.changes.visibility)) {
      return NextResponse.json({ error: "Invalid list update." }, { status: 400 });
    }
    if (body.actorAddress !== list.ownerAddress &&
      JSON.stringify(body.changes.editorAddresses) !== JSON.stringify(list.editorAddresses)) {
      return NextResponse.json({ error: "Only the list owner can manage editors." }, { status: 403 });
    }
    const updated: CuratedProjectList = {
      ...list,
      ...body.changes,
      title: body.changes.title.trim(),
      description: body.changes.description.trim(),
      projectIds: [...new Set(body.changes.projectIds)],
      editorAddresses: [...new Set(body.changes.editorAddresses)],
      updatedAt: new Date().toISOString(),
    };
    await saveStoredList(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const requestBody = await request.json() as { actorAddress?: string; action?: string; body?: string; signedPayload?: unknown };
    const { signedPayload, ...body } = requestBody;
    if (typeof body.actorAddress !== "string" ||
      !await verifyCuratedListRequest(signedPayload, `POST:/api/lists/${id}`, body as Record<string, unknown>, body.actorAddress)) {
      return NextResponse.json({ error: "Valid wallet signature required." }, { status: 401 });
    }
    const list = await getStoredList(id);
    if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
    if (!body.actorAddress || !canViewCuratedList(list, body.actorAddress)) {
      return NextResponse.json({ error: "You cannot access this list." }, { status: 403 });
    }

    let updated: CuratedProjectList;
    if (body.action === "follow") {
      updated = {
        ...list,
        followers: list.followers.includes(body.actorAddress)
          ? list.followers.filter((address) => address !== body.actorAddress)
          : [...list.followers, body.actorAddress],
      };
    } else if (body.action === "comment" && typeof body.body === "string" && body.body.trim() && body.body.length <= 1000) {
      const comment: CuratedListComment = {
        id: crypto.randomUUID(),
        authorAddress: body.actorAddress,
        body: body.body.trim(),
        createdAt: new Date().toISOString(),
      };
      updated = { ...list, comments: [...list.comments, comment] };
    } else {
      return NextResponse.json({ error: "Invalid list action." }, { status: 400 });
    }

    updated.updatedAt = new Date().toISOString();
    await saveStoredList(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}