import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/reviews/route";
import { REVIEW_CONSTRAINTS } from "@/types/review";

vi.mock("@/services/review/review.service", () => ({
  reviewService: {
    addReview: vi.fn(),
  },
}));

describe("POST /api/reviews", () => {
  beforeEach(() => {
    // Clear the in-memory store before each test
    // The store is module-level, so we need to reset it
    // In a real scenario, this would be handled by the test setup
  });

  it("should add a valid review with all required fields", async () => {
    const validReview = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user1",
      rating: 5,
      comment: "This is a great project with excellent features",
    };

    const request = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validReview),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data?.id).toBeDefined();
    expect(data.data?.rating).toBe(5);
    expect(data.data?.comment).toBe(validReview.comment);
    expect(data.data?.createdAt).toBeDefined();
  });

  it("should reject review with missing required fields", async () => {
    const incompleteReview = {
      projectId: "proj1",
      // Missing projectName, userAddress, rating, comment
    };

    const request = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incompleteReview),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
    expect(data.errors?.[0].field).toBe("comment");
  });

  it("should reject review with rating outside valid range (1-5)", async () => {
    const invalidRating = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user1",
      rating: 0,
      comment: "This is a great project with excellent features",
    };

    const request = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidRating),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors?.[0].field).toBe("rating");
    expect(data.errors?.[0].message).toContain("between");
  });

  it("should reject review with rating too high (6)", async () => {
    const invalidRating = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user1",
      rating: 6,
      comment: "This is a great project with excellent features",
    };

    const request = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidRating),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors?.[0].field).toBe("rating");
  });

  it("should reject review with non-integer rating", async () => {
    const invalidRating = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user1",
      rating: 3.5,
      comment: "This is a great project with excellent features",
    };

    const request = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidRating),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors?.[0].field).toBe("rating");
  });

  it("should reject review with comment too short (less than 10 chars)", async () => {
    const shortComment = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user1",
      rating: 5,
      comment: "Too short",
    };

    const request = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shortComment),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors?.[0].field).toBe("comment");
    expect(data.errors?.[0].message).toContain("at least");
  });

  it("should reject review with comment too long (more than 1000 chars)", async () => {
    const longComment = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user1",
      rating: 5,
      comment: "a".repeat(REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH + 1),
    };

    const request = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(longComment),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors?.[0].field).toBe("comment");
    expect(data.errors?.[0].message).toContain("cannot exceed");
  });

  it("should reject duplicate review from same user for same project", async () => {
    // First review
    const firstReview = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user1",
      rating: 5,
      comment: "This is a great project with excellent features",
    };

    const firstRequest = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firstReview),
      }
    );

    await POST(firstRequest);

    // Second review from same user for same project
    const secondRequest = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firstReview),
      }
    );

    const response = await POST(secondRequest);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.errors?.[0].message).toContain("already reviewed");
  });

  it("should allow different users to review the same project", async () => {
    const review1 = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user1",
      rating: 5,
      comment: "Great project!",
    };

    const review2 = {
      projectId: "proj1",
      projectName: "Test Project",
      userAddress: "user2",
      rating: 4,
      comment: "Good project with some minor issues",
    };

    const request1 = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review1),
      }
    );

    await POST(request1);

    const request2 = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review2),
      }
    );

    const response = await POST(request2);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it("should allow same user to review different projects", async () => {
    const review1 = {
      userAddress: "user1",
      rating: 5,
      comment: "Great project!",
    };

    const review2 = {
      ...review1,
      projectId: "proj2",
      projectName: "Project 2",
    };

    const request1 = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...review1, projectId: "proj1", projectName: "Project 1" }),
      }
    );

    await POST(request1);

    const request2 = new Request(
      "http://localhost/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review2),
      }
    );

    const response = await POST(request2);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });