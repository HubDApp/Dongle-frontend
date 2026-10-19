import { NextRequest, NextResponse } from "next/server";
import { suggestProjectCategories } from "@/utils/project-category-suggestion.util";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = typeof body === "object" && body ? body : {};

    const result = suggestProjectCategories({
      description: typeof payload.description === "string" ? payload.description : "",
      websiteUrl: typeof payload.websiteUrl === "string" ? payload.websiteUrl : undefined,
      projectName: typeof payload.projectName === "string" ? payload.projectName : "",
      feedback: Array.isArray(payload.feedback)
        ? payload.feedback.filter(
            (item): item is { category: string; accepted: boolean } =>
              !!item && typeof item.category === "string" && typeof item.accepted === "boolean",
          )
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to suggest categories" },
      { status: 500 },
    );
  }
}
