/**
 * GET /api/projects/[id]/timeline — Issue #658
 *
 * Returns a chronological list of significant events for a project.
 * Events are sorted newest-first and support pagination via
 * ?page=<n>&pageSize=<n> query params.
 *
 * Pagination kicks in automatically for projects with 50+ events (AC).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";
import type { TimelineEvent, TimelineResponse } from "@/types/timeline";

// ─── In-memory seed data ──────────────────────────────────────────────────────
// In a production environment this would be backed by a database.  The in-memory
// store follows the same pattern used by the reviews API route.

function seedEventsForProject(projectId: string): TimelineEvent[] {
  const now = Date.now();
  return [
    {
      id: `${projectId}-created`,
      projectId,
      type: "created",
      title: "Project Created",
      description: "Project was registered on the Dongle platform.",
      occurredAt: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `${projectId}-verified`,
      projectId,
      type: "verified",
      title: "Project Verified",
      description: "The project passed on-chain verification checks.",
      occurredAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `${projectId}-milestone-5`,
      projectId,
      type: "milestone_review",
      title: "5 Reviews Milestone",
      description: "The project received its 5th community review.",
      occurredAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { reviewCount: 5 },
    },
    {
      id: `${projectId}-major-update-1`,
      projectId,
      type: "major_update",
      title: "Major Update",
      description: "A significant update was published for the project.",
      occurredAt: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// Lazy-initialised in-memory cache: projectId → events[]
const eventStore = new Map<string, TimelineEvent[]>();

function getOrSeedEvents(projectId: string): TimelineEvent[] {
  if (!eventStore.has(projectId)) {
    eventStore.set(projectId, seedEventsForProject(projectId));
  }
  return eventStore.get(projectId)!;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_REQUEST, "Missing project id", 400),
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10)),
    );

    // Retrieve (or lazily seed) events for this project
    const allEvents = getOrSeedEvents(projectId);

    // Sort newest-first
    const sorted = [...allEvents].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const events = sorted.slice(start, start + pageSize);
    const hasMore = start + pageSize < total;

    const response: TimelineResponse = {
      events,
      total,
      page,
      pageSize,
      hasMore,
    };

    return NextResponse.json(createSuccessResponse(response));
  } catch (_error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to fetch timeline", 500),
      { status: 500 },
    );
  }
}
