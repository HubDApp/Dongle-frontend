import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, PATCH } from "@/app/api/reviews/route";
import {
  getAdminTokenFromCookie,
  isAdminAllowed,
  verifyAdminToken,
} from "@/lib/admin-auth";

vi.mock("@/lib/admin-auth", () => ({
  getAdminTokenFromCookie: vi.fn(),
  isAdminAllowed: vi.fn(),
  verifyAdminToken: vi.fn(),
}));

describe("review sentiment API", () => {
  beforeEach(() => {
    vi.mocked(getAdminTokenFromCookie).mockResolvedValue("admin-token");
    vi.mocked(verifyAdminToken).mockResolvedValue({
      publicKey: "GADMIN",
      nonce: "test-nonce",
    });
    vi.mocked(isAdminAllowed).mockReturnValue(true);
  });

  it("classifies review text when a review is submitted", async () => {
    const review = {
      projectId: `sentiment-${crypto.randomUUID()}`,
      projectName: "Sentiment Test",
      userAddress: `GUSER-${crypto.randomUUID()}`,
      rating: 5,
      comment: "Excellent service, I love this product!",
    };
    const response = await POST(
      new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.sentiment).toBe("positive");
    expect(body.data.sentimentSource).toBe("automatic");
  });

  it("requires admin authentication and persists an override", async () => {
    vi.mocked(getAdminTokenFromCookie).mockResolvedValueOnce(null);
    const unauthorized = await PATCH(
      new NextRequest("http://localhost/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "missing", sentiment: "negative" }),
      }),
    );
    expect(unauthorized.status).toBe(401);

    const review = {
      projectId: `override-${crypto.randomUUID()}`,
      projectName: "Override Test",
      userAddress: `GUSER-${crypto.randomUUID()}`,
      rating: 1,
      comment: "Awful service, I hate this product.",
    };
    const submitted = await POST(
      new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      }),
    );
    const submittedBody = await submitted.json();
    const response = await PATCH(
      new NextRequest("http://localhost/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: submittedBody.data.id,
          sentiment: "positive",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sentiment).toBe("positive");
    expect(body.data.sentimentSource).toBe("admin");
  });
});
