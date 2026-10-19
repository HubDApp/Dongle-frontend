import { describe, expect, it } from "vitest";
import { reviewsToCsv } from "@/lib/review-export";
import type { Review } from "@/types/review";

describe("reviewsToCsv", () => {
  it("includes owner response content and moderation state", () => {
    const review: Review = {
      id: "review-1",
      projectId: "project-1",
      projectName: "Stellar Wallet",
      userAddress: "GUSER",
      rating: 3,
      comment: "Needs more documentation",
      createdAt: "2026-06-01T12:00:00.000Z",
      ownerResponse: {
        text: "Thanks, we have updated the docs.",
        ownerAddress: "GOWNER",
        createdAt: "2026-06-02T12:00:00.000Z",
        updatedAt: "2026-06-02T12:00:00.000Z",
        hiddenByAdmin: true,
      },
    };

    const csv = reviewsToCsv([review]);

    expect(csv).toContain("owner_response");
    expect(csv).toContain("Thanks, we have updated the docs.");
    expect(csv).toContain("2026-06-02T12:00:00.000Z");
    expect(csv).toContain("true");
  });
});
