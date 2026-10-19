import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/updates/reactions/route";
import { verifySignature } from "@/lib/verify-signature";
import { updateService } from "@/services/update/update.service";

vi.mock("@/lib/verify-signature", () => ({ verifySignature: vi.fn() }));

describe("/api/updates/reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (updateService as unknown as { updates: unknown[] }).updates = [];
    vi.mocked(verifySignature).mockReturnValue(true);
  });

  function createUpdate() {
    const projectId = `project-${crypto.randomUUID()}`;
    const update = updateService.addUpdate({
      projectId,
      type: "Announcement",
      title: "Update",
      content: "Content",
    }, "GOWNER");
    return { projectId, updateId: update.id };
  }

  function signedRequest(
    projectId: string,
    updateId: string,
    reaction: string,
    nonce: string,
  ) {
    const timestamp = new Date().toISOString();
    const publicKey = "GUSER";
    const payload = JSON.stringify({
      action: "toggle-update-reaction",
      projectId,
      updateId,
      reaction,
      nonce,
      timestamp,
      publicKey,
    });
    return new NextRequest("http://localhost/api/updates/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        updateId,
        reaction,
        publicKey,
        payload,
        signature: "signed",
        nonce,
        timestamp,
      }),
    });
  }

  it("requires a valid wallet signature to toggle a reaction", async () => {
    vi.mocked(verifySignature).mockReturnValue(false);
    const { projectId, updateId } = createUpdate();

    const response = await POST(signedRequest(projectId, updateId, "👍", crypto.randomUUID()));

    expect(response.status).toBe(401);
  });

  it("adds and removes one reaction while preserving other emoji reactions", async () => {
    const { projectId, updateId } = createUpdate();
    const addResponse = await POST(signedRequest(projectId, updateId, "👍", crypto.randomUUID()));
    const addData = await addResponse.json();
    expect(addData.data.counts["👍"]).toBe(1);
    expect(addData.data.userReactions).toContain("👍");

    const heartResponse = await POST(signedRequest(projectId, updateId, "❤️", crypto.randomUUID()));
    expect((await heartResponse.json()).data.userReactions).toEqual(["👍", "❤️"]);

    const removeResponse = await POST(signedRequest(projectId, updateId, "👍", crypto.randomUUID()));
    const removeData = await removeResponse.json();
    expect(removeData.data.counts["👍"]).toBeUndefined();
    expect(removeData.data.userReactions).toEqual(["❤️"]);
  });

  it("returns counts and the requesting wallet's reactions by project", async () => {
    const { projectId, updateId } = createUpdate();
    await POST(signedRequest(projectId, updateId, "🎉", crypto.randomUUID()));

    const response = await GET(new NextRequest(
      `http://localhost/api/updates/reactions?projectId=${projectId}&updateIds=${updateId}&userAddress=GUSER`,
    ));
    const data = await response.json();

    expect(data.data).toEqual([
      { updateId, counts: { "🎉": 1 }, userReactions: ["🎉"] },
    ]);
  });
});