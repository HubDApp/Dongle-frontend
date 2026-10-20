import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { repositoryService } from "@/services/repository/repository.service";

describe("repositoryService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches GitHub stars, license, and last update", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        html_url: "https://github.com/org/app",
        name: "app",
        homepage: "https://app.example",
        stargazers_count: 1500,
        forks_count: 12,
        license: { spdx_id: "MIT" },
        updated_at: "2026-08-01T00:00:00Z",
        description: "A stellar app",
        language: "TypeScript",
        topics: ["stellar", "defi"],
      }),
    });

    const metadata = await repositoryService.fetchMetadata("https://github.com/org/app");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/org/app",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/vnd.github.v3+json" }),
      }),
    );
    expect(metadata).toMatchObject({
      host: "github",
      owner: "org",
      repo: "app",
      stars: 1500,
      license: "MIT",
      lastUpdate: "2026-08-01T00:00:00Z",
      language: "TypeScript",
      homepage: "https://app.example",
      name: "app",
    });
  });

  it("returns GitHub import fields for form population", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        html_url: "https://github.com/org/app",
        name: "app",
        homepage: "https://app.example",
        stargazers_count: 42,
        forks_count: 7,
        license: { spdx_id: "MIT" },
        updated_at: "2026-08-01T00:00:00Z",
        description: "Project description",
        language: "Rust",
        topics: ["stellar", "defi"],
      }),
    });

    await expect(repositoryService.fetchGitHubImport("https://github.com/org/app")).resolves.toMatchObject({
      name: "app",
      homepage: "https://app.example",
      description: "Project description",
      language: "Rust",
      topics: ["stellar", "defi"],
      license: "MIT",
      stars: 42,
      forks: 7,
    });
  });

  it("reports private or unavailable repositories clearly", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(repositoryService.fetchGitHubImport("https://github.com/private/repo"))
      .rejects.toThrow(/not found or private/i);
  });

  it("returns null for an invalid repository URL", async () => {
    const metadata = await repositoryService.fetchMetadata("https://example.com/not-a-repo");
    expect(metadata).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("formats star counts and relative update dates", () => {
    expect(repositoryService.formatStarCount(999)).toBe("999");
    expect(repositoryService.formatStarCount(1500)).toBe("1.5k");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
    expect(repositoryService.formatLastUpdate("2026-08-25T08:00:00Z")).toBe("Today");
    expect(repositoryService.formatLastUpdate("2026-08-24T08:00:00Z")).toBe("Yesterday");
    expect(repositoryService.formatLastUpdate("2026-08-20T08:00:00Z")).toBe("5 days ago");
    vi.useRealTimers();
  });
});
