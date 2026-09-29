import { describe, it, expect, beforeEach, vi } from "vitest";
import { projectSubmissionService } from "@/services/project/project-submission.service";

describe("projectSubmissionService", () => {
  beforeEach(() => {
    const memoryStorage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return memoryStorage.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        memoryStorage.store[key] = value;
      },
      removeItem(key: string) {
        delete memoryStorage.store[key];
      },
      clear() {
        memoryStorage.store = {};
      },
    };
    vi.stubGlobal("localStorage", memoryStorage);
    localStorage.clear();
  });

  it("auto-flags submissions with multiple suspicious signals", () => {
    const submission = projectSubmissionService.recordSubmission({
      projectId: "scam-dex",
      projectName: "Scam DEX",
      submittedBy: "GTEST123",
      qualityScore: 30,
      flagReasons: ["Low quality score", "No audit report provided"],
    });

    expect(submission.status).toBe("flagged");
    expect(projectSubmissionService.isDiscoverable("scam-dex")).toBe(false);
  });

  it("approves clean submissions and hides rejected ones from discover", () => {
    projectSubmissionService.recordSubmission({
      projectId: "clean-app",
      projectName: "Clean App",
      submittedBy: "GTEST123",
      qualityScore: 90,
      flagReasons: [],
    });

    expect(projectSubmissionService.isDiscoverable("clean-app")).toBe(true);

    projectSubmissionService.updateStatus(
      "clean-app",
      "rejected",
      "GADMIN123",
      "Spam",
    );

    expect(projectSubmissionService.isDiscoverable("clean-app")).toBe(false);
  });

  it("returns discoverable for projects without moderation records", () => {
    expect(projectSubmissionService.isDiscoverable("legacy-project")).toBe(true);
  });
});
