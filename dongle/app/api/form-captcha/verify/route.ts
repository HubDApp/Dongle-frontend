/**
 * POST /api/form-captcha/verify — server-side reCAPTCHA verification.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyCaptchaToken } from "@/services/form-captcha";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, minScore } = body as {
      token?: string;
      action?: string;
      minScore?: number;
    };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { valid: false, message: "token required" },
        { status: 400 },
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const remoteIp = forwarded?.split(",")[0]?.trim();

    const result = await verifyCaptchaToken({
      token,
      remoteIp,
      expectedAction: action,
      minScore,
    });

    return NextResponse.json(result, {
      status: result.valid ? 200 : 403,
    });
  } catch {
    return NextResponse.json(
      { valid: false, message: "verify_error" },
      { status: 500 },
    );
  }
}
