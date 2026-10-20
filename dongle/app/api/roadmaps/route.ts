import { NextResponse } from "next/server";
import {
  isProjectRoadmap,
  ROADMAP_STATUSES,
  type RoadmapMilestone,
} from "@/types/roadmap";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_MILESTONES = 30;
const requestsByClient = new Map<string, number[]>();

function isValidRoadmap(value: unknown): value is { milestones: RoadmapMilestone[] } {
  if (!isProjectRoadmap(value) || value.milestones.length > MAX_MILESTONES) return false;

  return value.milestones.every((milestone) => {
    const parsedTargetDate = milestone.targetDate
      ? new Date(`${milestone.targetDate}T00:00:00Z`)
      : null;
    const targetDateValid =
      milestone.targetDate === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(milestone.targetDate) &&
        parsedTargetDate !== null &&
        !Number.isNaN(parsedTargetDate.getTime()) &&
        parsedTargetDate.toISOString().slice(0, 10) === milestone.targetDate);

    return (
      milestone.title.trim().length > 0 &&
      milestone.title.length <= 120 &&
      milestone.description.length <= 2000 &&
      (ROADMAP_STATUSES as readonly string[]).includes(milestone.status) &&
      targetDateValid
    );
  });
}

function isRateLimited(request: Request): boolean {
  const client = request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const now = Date.now();
  const recent = (requestsByClient.get(client) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestsByClient.set(client, recent);
    return true;
  }

  recent.push(now);
  requestsByClient.set(client, recent);
  return false;
}

export async function POST(request: Request) {
  if (!process.env.PINATA_JWT) {
    return NextResponse.json(
      { error: "Roadmap storage is not configured." },
      { status: 503 },
    );
  }

  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "Too many roadmap uploads. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 80_000) {
      return NextResponse.json({ error: "Roadmap upload is too large." }, { status: 413 });
    }
    const body: unknown = JSON.parse(rawBody);
    if (!isValidRoadmap(body)) {
      return NextResponse.json({ error: "Invalid roadmap data." }, { status: 400 });
    }

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: body,
        pinataMetadata: { name: "dongle-project-roadmap" },
        pinataOptions: { cidVersion: 1 },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Pinata roadmap upload failed", {
        status: response.status,
      });
      return NextResponse.json(
        { error: "Roadmap storage service is temporarily unavailable." },
        { status: 502 },
      );
    }

    const result = (await response.json()) as { IpfsHash?: unknown };
    if (typeof result.IpfsHash !== "string" || !result.IpfsHash) {
      console.error("Pinata roadmap upload returned no CID");
      return NextResponse.json(
        { error: "Roadmap storage service returned an invalid response." },
        { status: 502 },
      );
    }

    return NextResponse.json({ cid: result.IpfsHash });
  } catch (error) {
    console.error("Roadmap upload failed", error);
    return NextResponse.json(
      { error: "Could not store the roadmap. Please try again." },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
