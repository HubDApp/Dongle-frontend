/**
 * GET /api/projects
 *
 * Edge runtime — executes at every Vercel/Cloudflare edge location globally.
 *
 * Query params:
 *   ?category=<label>          filter by primary category display label
 *   ?q=<text>                  full-text search (name / description / tags)
 *   ?tags=t1,t2                comma-separated tag filter
 *   ?sort=rating|newest|popular sort order (default: rating)
 *
 * Response headers:
 *   Cache-Control: public, s-maxage=300, stale-while-revalidate=60
 *   X-Response-Time: <ms>
 *   X-Cache: HIT | MISS
 */

export const runtime = "edge";
// Opt out of static rendering so query-param filtering works correctly.
// CDN caching is handled via Cache-Control headers rather than Next.js ISR.
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { projectService } from "@/services/project/project.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";
import { jsonResponse, errorResponse } from "@/lib/edge-cache";

export async function GET(request: NextRequest): Promise<Response> {
  const startMs = Date.now();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category") ?? undefined;
  const query    = searchParams.get("q") ?? undefined;
  const tagsRaw  = searchParams.get("tags") ?? undefined;
  const sortRaw  = searchParams.get("sort") ?? "rating";

  const validSorts = ["rating", "newest", "popular"] as const;
  type SortKey = typeof validSorts[number];
  const sort: SortKey = (validSorts as readonly string[]).includes(sortRaw)
    ? (sortRaw as SortKey)
    : "rating";

  try {
    let projects = await projectService.fetchAll();

    if (query) {
      projects = await projectService.fetchSearch(query);
    } else if (category && category !== "All") {
      projects = await projectService.fetchByCategory(category);
    } else if (tagsRaw) {
      const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        projects = projects.filter((p) => p.tags?.some((t) => tags.includes(t)));
      }
    }

    const sorted = projectService.sortProjects(projects, sort);

    return jsonResponse(createSuccessResponse(sorted), "projects", startMs, false);
  } catch (err) {
    console.error("[api/projects] GET failed", err);
    return errorResponse(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to fetch projects", 500),
      500,
      startMs,
    );
  }
}
