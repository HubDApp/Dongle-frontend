import { NextRequest, NextResponse } from "next/server";
import { RepositoryImportError, repositoryService } from "@/services/repository/repository.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") ?? "";
  try {
    return NextResponse.json(await repositoryService.fetchGitHubImport(url));
  } catch (error) {
    if (error instanceof RepositoryImportError) {
      const status = error.code === "private-or-not-found" ? 404
        : error.code === "rate-limited" ? 429
          : error.code === "invalid-url" ? 400 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Could not import this GitHub repository." }, { status: 502 });
  }
}