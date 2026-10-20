import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/tags/suggest/route";

describe("POST /api/tags/suggest", () => {
  it("recommends category-relevant tags from the project description", async () => {
    const request = new NextRequest("http://localhost/api/tags/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Soroban Swap",
        category: "DeFi / DEX",
        description: "A decentralized automated market maker for swapping tokens, with liquidity pools and yield farming.",
        existingTags: ["defi"],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.suggestions.length).toBeGreaterThan(0);
    expect(payload.data.suggestions.slice(0, 10).every((tag: string) => typeof tag === "string")).toBe(true);
  });

  it("accepts not relevant feedback to de-prioritize tags", async () => {
    const request = new NextRequest("http://localhost/api/tags/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "DeFi / DEX",
        description: "Lending and borrowing protocol for synthetic assets.",
        feedback: [{ tag: "yield", relevant: false }],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.data.suggestions)).toBe(true);
  });
});
