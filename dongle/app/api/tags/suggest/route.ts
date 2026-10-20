import { NextRequest, NextResponse } from "next/server";
import { suggestTags } from "@/utils/tag-suggestions.util";

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
