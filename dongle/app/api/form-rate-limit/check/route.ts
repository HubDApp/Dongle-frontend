/**
 * POST /api/form-rate-limit/check
 * Enforces configurable per-IP and per-user form submission limits (Issue #554).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import {
  createCustomConfig,
  createRateLimiter,
  DEFAULT_RATE_LIMIT_CONFIG,
  type FormRateLimitConfig,
} from "@/services/form-rate-limit";

export const dynamic = "force-dynamic";

let limiter = createRateLimiter(DEFAULT_RATE_LIMIT_CONFIG);

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

interface CheckBody {
  formId?: string;
  userId?: string;
  /** When true, only check; when false/omitted, consume a slot. */
  dryRun?: boolean;
  config?: Partial<FormRateLimitConfig>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckBody;
    const formId = String(body.formId || "").trim();

    if (!formId) {
      return NextResponse.json(
        {
          allowed: false,
          message: "formId is required",
          limit: 0,
          remaining: 0,
          resetAt: Date.now(),
          retryAfterSeconds: 0,
        },
        { status: 400 },
      );
    }

    if (body.config) {
      limiter = createRateLimiter(createCustomConfig(body.config));
    }

    const identity = {
      formId,
      ip: hashIp(clientIp(request)),
      userId: body.userId ? String(body.userId) : null,
    };

    const decision = body.dryRun
      ? limiter.check(identity)
      : limiter.consume(identity);

    const status = decision.allowed ? 200 : 429;
    const headers: HeadersInit = {};
    if (!decision.allowed) {
      headers["Retry-After"] = String(decision.retryAfterSeconds);
    }

    return NextResponse.json(decision, { status, headers });
  } catch {
    return NextResponse.json(
      {
        allowed: false,
        message: "Rate limit check failed. Please try again.",
        limit: 0,
        remaining: 0,
        resetAt: Date.now(),
        retryAfterSeconds: 60,
      },
      { status: 500 },
    );
  }
}
