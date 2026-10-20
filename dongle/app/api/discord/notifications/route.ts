import { NextRequest, NextResponse } from "next/server";
import {
  notifyNewProject,
  notifyVerification,
  sendTrendingDigest,
  getDiscordConfig,
} from "@/services/discord/discord-bot.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

/**
 * POST /api/discord/notifications
 * Body: { type: 'newProject'|'verification'|'trending', project, projects }
 * Triggers a Discord notification from the admin panel (issue #721).
 */
export async function POST(request: NextRequest) {
  try {
    const config = getDiscordConfig();
    if (!config.enabled) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.SERVICE_UNAVAILABLE, "Discord bot not configured", 503),
        { status: 503 },
      );
    }

    const body = await request.json();
    const { type, project, projects } = body;

    switch (type) {
      case "newProject":
        await notifyNewProject(project);
        break;
      case "verification":
        await notifyVerification(project);
        break;
      case "trending":
        await sendTrendingDigest(projects || []);
        break;
      default:
        return NextResponse.json(
          createErrorResponse(ErrorCode.VALIDATION_ERROR, "Invalid notification type", 400),
          { status: 400 },
        );
    }

    return NextResponse.json(createSuccessResponse({ sent: true, type }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Notification failed", 500),
      { status: 500 },
    );
  }
}
