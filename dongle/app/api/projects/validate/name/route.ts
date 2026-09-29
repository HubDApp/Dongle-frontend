import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/services/project/project.service";
import { validateProjectNameAvailability } from "@/lib/project-name-validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const currentProjectId = searchParams.get("currentProjectId");

  const result = validateProjectNameAvailability(
    name,
    projectService.getAllProjects(),
    currentProjectId,
  );

  return NextResponse.json(result, {
    status: result.error ? 400 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
