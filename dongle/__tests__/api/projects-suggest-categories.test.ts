import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/projects/suggest-categories/route";

describe("POST /api/projects/suggest-categories", () => {
  it("returns up to three relevant category suggestions with confidence scores", async () => {
    const request = new NextRequest("http://localhost/api/projects/suggest-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Soroban Swap",
        description: "Automated market maker for swapping tokens and providing liquidity with yield farming.",
        websiteUrl: "https://soroban-swap.example.com",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.data.suggestions)).toBe(true);
    expect(payload.data.suggestions.length).toBeGreaterThan(0);
    expect(payload.data.suggestions.length).toBeLessThanOrEqual(3);
    expect(payload.data.suggestions[0].confidence).toBeGreaterThan(0);
    expect(payload.data.suggestions[0].category).toBeTruthy();
  });

  it("uses a fallback path when text is weak or sparse", async () => {
    const request = new NextRequest("http://localhost/api/projects/suggest-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Hi",
        description: "test",
        websiteUrl: "https://example.com",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.fallbackUsed).toBeDefined();
    expect(payload.data.accuracy).toBeGreaterThanOrEqual(0);
  });
});
