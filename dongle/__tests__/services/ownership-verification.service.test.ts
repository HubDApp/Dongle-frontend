import { beforeEach, describe, expect, it } from "vitest";
import {
  checkOwnershipVerification,
  createOwnershipVerification,
  listOwnershipVerifications,
  resetOwnershipVerificationsForTests,
} from "@/services/project/ownership-verification.service";

const walletAddress = `G${"A".repeat(55)}`;

describe("ownership verification service", () => {
  beforeEach(() => {
    resetOwnershipVerificationsForTests();
  });

  it("generates separate tokens for multiple verification methods", async () => {
    const dns = await createOwnershipVerification({
      projectId: "project-1",
      walletAddress,
      method: "dns_txt",
      target: "https://example.com/",
    });
    const github = await createOwnershipVerification({
      projectId: "project-1",
      walletAddress,
      method: "github_file",
      target: "https://github.com/org/repo",
    });
    const listed = await listOwnershipVerifications("project-1", walletAddress);

    expect(dns.token).not.toBe(github.token);
    expect(listed.map((record) => record.method)).toEqual(["github_file", "dns_txt"]);
    expect(listed[0]).not.toHaveProperty("token");
    expect(new Date(dns.expiresAt).getTime() - new Date(dns.createdAt).getTime()).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it("marks verification expired after 90 days", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const record = await createOwnershipVerification({
      projectId: "project-1",
      walletAddress,
      method: "dns_txt",
      target: "example.com",
    }, createdAt);

    const result = await checkOwnershipVerification(
      record.id,
      "project-1",
      walletAddress,
      new Date("2026-04-02T00:00:00.000Z"),
    );
    expect(result.verification.status).toBe("expired");
    expect((await listOwnershipVerifications("project-1", walletAddress))[0].status).toBe("expired");
  });
});