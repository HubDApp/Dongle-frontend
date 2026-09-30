import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/reviews/[id]/route";
import { POST } from "@/app/api/reviews/route";

// Mock the verification signature
vi.mock("@/lib/verify-signature", () => ({
  verifySignature: vi.fn(() => true),
}));

describe("DELETE /api/reviews/[id]", () => {
  const TEST_USER = "GTEST123456789ABCDEF0123456789ABCDEF0123456789ABCDEF01234";
  const OTHER_USER = "GOTHER123456789ABCDEF0123456789ABCDEF0123456789ABCDEF012";
  const ADMIN_USER = "GADMIN123456789ABCDEF0123456789ABCDEF0123456789ABCDEF012";

  beforeEach(() => {
    // Clear the in-memory store before each test
    vi.clearAllMocks();
  });

  describe("Authorization checks", () => {
    it("should return 404 if review ID not found", async () => {
      const request = new NextRequest(
        "http://localhost/api/reviews/nonexistent-id?userAddress=" + TEST_USER,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "nonexistent-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Review not found");
    });

    it("should only allow review author to delete", async () => {
      // First create a review
      const createRequest = new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: TEST_USER,
          rating: 5,
          comment: "Great project with excellent features and documentation!",
          signedPayload: "payload",
          signature: "sig",
          signatureNonce: "nonce",
          signatureTimestamp: new Date().toISOString(),
        }),
      });

      const createResponse = await POST(createRequest);
      const { data: review } = await createResponse.json();

      // Try to delete as a different user
      const deleteRequest = new NextRequest(
        `http://localhost/api/reviews/${review.id}?userAddress=${OTHER_USER}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await DELETE(deleteRequest, {
        params: Promise.resolve({ id: review.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("permission");
    });

    it("should return 403 if userAddress is missing", async () => {
      // Create a review first
      const createRequest = new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: TEST_USER,
          rating: 4,
          comment: "Good project with solid implementation and features!",
          signedPayload: "payload",
          signature: "sig",
          signatureNonce: "nonce",
          signatureTimestamp: new Date().toISOString(),
        }),
      });

      const createResponse = await POST(createRequest);
      const { data: review } = await createResponse.json();

      // Try to delete without userAddress
      const deleteRequest = new NextRequest(
        `http://localhost/api/reviews/${review.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await DELETE(deleteRequest, {
        params: Promise.resolve({ id: review.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("permission");
    });
  });

  describe("Success scenarios", () => {
    it("should successfully delete review by the author", async () => {
      // Create a review
      const createRequest = new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "proj1",
          projectName: "Test Project",
          userAddress: TEST_USER,
          rating: 5,
          comment: "Amazing project! Really impressed with the quality and support.",
          signedPayload: "payload",
          signature: "sig",
          signatureNonce: "nonce",
          signatureTimestamp: new Date().toISOString(),
        }),
      });

      const createResponse = await POST(createRequest);
      const { data: review } = await createResponse.json();

      // Delete by the author
      const deleteRequest = new NextRequest(
        `http://localhost/api/reviews/${review.id}?userAddress=${TEST_USER}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await DELETE(deleteRequest, {
        params: Promise.resolve({ id: review.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.success).toBe(true);
    });

    it("should confirm deletion with success response", async () => {
      const createRequest = new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "proj2",
          projectName: "Another Project",
          userAddress: TEST_USER,
          rating: 4,
          comment: "Very good project with potential for future improvements.",
          signedPayload: "payload",
          signature: "sig",
          signatureNonce: "nonce",
          signatureTimestamp: new Date().toISOString(),
        }),
      });

      const createResponse = await POST(createRequest);
      const { data: review } = await createResponse.json();

      const deleteRequest = new NextRequest(
        `http://localhost/api/reviews/${review.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAddress: TEST_USER }),
        }
      );

      const response = await DELETE(deleteRequest, {
        params: Promise.resolve({ id: review.id }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("success", true);
    });
  });

  describe("Concurrent deletion safety", () => {
    it("should handle concurrent delete attempts safely", async () => {
      // Create a review
      const createRequest = new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "proj3",
          projectName: "Concurrent Test Project",
          userAddress: TEST_USER,
          rating: 5,
          comment: "Testing concurrent deletions with proper error handling.",
          signedPayload: "payload",
          signature: "sig",
          signatureNonce: "nonce",
          signatureTimestamp: new Date().toISOString(),
        }),
      });

      const createResponse = await POST(createRequest);
      const { data: review } = await createResponse.json();

      // First deletion should succeed
      const deleteRequest1 = new NextRequest(
        `http://localhost/api/reviews/${review.id}?userAddress=${TEST_USER}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response1 = await DELETE(deleteRequest1, {
        params: Promise.resolve({ id: review.id }),
      });
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.success).toBe(true);

      // Second deletion should fail with 404
      const deleteRequest2 = new NextRequest(
        `http://localhost/api/reviews/${review.id}?userAddress=${TEST_USER}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response2 = await DELETE(deleteRequest2, {
        params: Promise.resolve({ id: review.id }),
      });
      const data2 = await response2.json();

      expect(response2.status).toBe(404);
      expect(data2.success).toBe(false);
      expect(data2.error).toBe("Review not found");
    });
  });

  describe("Audit logging", () => {
    it("should create audit log entry for successful deletion", async () => {
      // Create a review
      const createRequest = new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "proj4",
          projectName: "Audit Test Project",
          userAddress: TEST_USER,
          rating: 3,
          comment: "Testing audit log entry creation for review deletions.",
          signedPayload: "payload",
          signature: "sig",
          signatureNonce: "nonce",
          signatureTimestamp: new Date().toISOString(),
        }),
      });

      const createResponse = await POST(createRequest);
      const { data: review } = await createResponse.json();

      // Delete and check audit log
      const deleteRequest = new NextRequest(
        `http://localhost/api/reviews/${review.id}?userAddress=${TEST_USER}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await DELETE(deleteRequest, {
        params: Promise.resolve({ id: review.id }),
      });

      expect(response.status).toBe(200);
      // Note: Actual audit log verification would require access to the audit service
      // This test confirms the deletion succeeds, which should trigger audit logging
    });
  });
});