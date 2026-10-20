import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const translationRateLimiter = new Map<string, number[]>();

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  return `${forwardedFor ?? realIp ?? "anon"}:${userAgent}`;
}

function enforceRateLimit(request: Request): boolean {
  const key = getClientKey(request);
  const now = Date.now();
  const timestamps = translationRateLimiter.get(key) ?? [];
  const recent = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    translationRateLimiter.set(key, recent);
    return false;
  }

  recent.push(now);
  translationRateLimiter.set(key, recent);
  return true;
}

function extractDetectedLanguage(payload: unknown): string | null {
  if (!Array.isArray(payload) || !payload.length) return null;

  const detectionPayload = payload[2];
  if (Array.isArray(detectionPayload) && detectionPayload.length > 0) {
    const detected = detectionPayload[0];
    if (Array.isArray(detected) && detected.length > 1 && typeof detected[0] === "string") {
      return detected[0];
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      targetLocale?: string;
    };

    const text = body.text?.trim();
    const targetLocale = body.targetLocale ?? "en";

    if (!text || text.length > 5000) {
      return NextResponse.json(
        { error: "Translation text is required and must be shorter than 5000 characters." },
        { status: 400 },
      );
    }

    if (!/^(en|es|pt)$/.test(targetLocale)) {
      return NextResponse.json({ error: "Unsupported translation locale." }, { status: 400 });
    }

    if (!enforceRateLimit(request)) {
      return NextResponse.json(
        { error: "Too many translation requests. Please slow down." },
        { status: 429 },
      );
    }

    const params = new URLSearchParams({
      client: "gtx",
      sl: "auto",
      tl: targetLocale,
      dt: "t",
      ie: "UTF-8",
      oe: "UTF-8",
      q: text,
    });

    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Translation service is temporarily unavailable." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as unknown;
    const translatedText = Array.isArray(data)
      ? data[0]
          ?.map((part: unknown) => (Array.isArray(part) ? String(part[0] ?? "") : ""))
          .join("")
      : "";

    if (!translatedText || translatedText.trim().length === 0) {
      return NextResponse.json({ error: "Translation returned no text." }, { status: 502 });
    }

    return NextResponse.json({
      translatedText,
      detectedLanguage: extractDetectedLanguage(data) ?? "auto",
      targetLocale,
      provider: "Google Translate",
    });
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json(
      { error: "Translation failed. Please try again later." },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
