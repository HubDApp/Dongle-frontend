import { NextRequest, NextResponse } from "next/server";
import { suggestTags } from "@/utils/tag-suggestions.util";
import { projectService } from "@/services/project/project.service";

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function fuzzyMatch(query: string, candidate: string): boolean {
  if (candidate.includes(query) || query.includes(candidate)) return true;
  if (query.length < 3) return false;
  const maxDistance = query.length >= 7 ? 2 : 1;
  return candidate.split(/[\s-]+/).some((word) =>
    Math.abs(word.length - query.length) <= maxDistance && editDistance(query, word) <= maxDistance,
  );
}

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const usage = new Map<string, { tag: string; usageCount: number }>();

  for (const project of projectService.getAllProjects()) {
    for (const tag of project.tags ?? []) {
      const key = tag.trim().toLowerCase();
      if (!key) continue;
      const current = usage.get(key);
      usage.set(key, { tag: current?.tag ?? tag.trim(), usageCount: (current?.usageCount ?? 0) + 1 });
    }
  }

  const suggestions = Array.from(usage.values())
    .map((item) => {
      const candidate = item.tag.toLowerCase();
      const matches = !query || fuzzyMatch(query, candidate) ||
        Array.from(query).every((character) => candidate.includes(character));
      return { ...item, matches };
    })
    .filter((item) => item.matches)
    .sort((left, right) => right.usageCount - left.usageCount || left.tag.localeCompare(right.tag))
    .slice(0, 20)
    .map(({ tag, usageCount }) => ({ tag, usageCount }));

  return NextResponse.json({ success: true, data: { suggestions } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = typeof body === "object" && body ? body : {};
    const description = typeof payload.description === "string" ? payload.description : "";
    const category = typeof payload.category === "string" ? payload.category : undefined;
    const projectName = typeof payload.projectName === "string" ? payload.projectName : "";
    const rating = typeof payload.rating === "number" ? payload.rating : undefined;
    const existingTags = Array.isArray(payload.existingTags)
      ? payload.existingTags.filter((tag): tag is string => typeof tag === "string")
      : [];
    const similarProjects = Array.isArray(payload.similarProjects)
      ? payload.similarProjects
      : [];
    const feedback = Array.isArray(payload.feedback)
      ? payload.feedback.filter((item): item is { tag: string; relevant: boolean } =>
          !!item && typeof item.tag === "string" && typeof item.relevant === "boolean")
      : [];

    const suggestions = suggestTags({
      description,
      category,
      projectName,
      rating,
      existingTags,
      similarProjects,
      feedback,
    });

    return NextResponse.json({
      success: true,
      data: { suggestions },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to generate tag suggestions" },
      { status: 500 },
    );
  }
}
