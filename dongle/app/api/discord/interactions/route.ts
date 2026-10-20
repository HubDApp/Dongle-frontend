import { NextRequest, NextResponse } from "next/server";
import { handleInteraction, registerCommands } from "@/services/discord/discord-bot.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

/**
 * POST /api/discord/interactions
 * Discord slash-command interactions endpoint (issue #721).
 * Receives /watch, /unwatch, /trending, /verify commands.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleInteraction(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Interaction failed", 500),
      { status: 500 },
    );
  }
}

/**
 * POST /api/discord/register-commands
 * Registers slash commands with Discord (admin setup).
 */
export async function PUT() {
  try {
    const result = await registerCommands();
    if (!result.ok) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.SERVICE_UNAVAILABLE, result.error, 503),
        { status: 503 },
      );
    }
    return NextResponse.json(createSuccessResponse({ registered: true }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Register failed", 500),
      { status: 500 },
    );
  }
}
