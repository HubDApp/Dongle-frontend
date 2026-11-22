import { describe, expect, it } from "vitest";
import {
  buildChangelog,
  changelogFileName,
  changelogToMarkdown,
  changelogToRss,
  compareSemver,
  countByCategory,
  filterChangelog,
  parseSemver,
  shortenAddress,
} from "@/lib/changelog";
import type { ProjectUpdate } from "@/types/update";

const AUTHOR = "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900000ABCDEFGHIJKLMNOPQR";

function update(id: string, type: ProjectUpdate["type"], publishedAt: string, extra: Partial<ProjectUpdate> = {}): ProjectUpdate {
  return {
    id,
    projectId: "proj-x",
    type,
    title: `Title ${id}`,
    content: `Details for ${id}`,
    publishedAt,
    authorAddress: AUTHOR,
    ...extra,
  };
}

const history: ProjectUpdate[] = [
  update("u1", "Release", "2024-01-01T00:00:00Z", { version: "v1.0.0" }),
  update("u2", "Release", "2024-02-01T00:00:00Z", { version: "1.0.1" }),
  update("u3", "Security Audit", "2024-02-15T00:00:00Z"),
  update("u4", "Release", "2024-03-01T00:00:00Z", { version: "v1.1" }),
  update("u5", "Announcement", "2024-03-05T00:00:00Z"),
  update("u6", "Milestone", "2024-03-10T00:00:00Z"),
  update("u7", "Release", "2024-03-20T00:00:00Z", { version: "v2.0.0-beta.1", title: "Hotfix for swap routing" }),
];

describe("semantic versions", () => {
  it("parses and normalises version strings", () => {
    expect(parseSemver("v2.0.0")).toEqual({ major: 2, minor: 0, patch: 0, prerelease: null });
    expect(parseSemver("1.4")).toEqual({ major: 1, minor: 4, patch: 0, prerelease: null });
    expect(parseSemver("1.0.0-beta.1+build.5")).toEqual({ major: 1, minor: 0, patch: 0, prerelease: "beta.1" });
    expect(parseSemver("latest")).toBeNull();
    expect(parseSemver(undefined)).toBeNull();
  });

  it("orders prereleases before the release and numerically", () => {
    expect(compareSemver(parseSemver("1.0.0-rc.1")!, parseSemver("1.0.0")!)).toBeLessThan(0);
    expect(compareSemver(parseSemver("1.0.0-beta.2")!, parseSemver("1.0.0-beta.10")!)).toBeLessThan(0);
    expect(compareSemver(parseSemver("1.2.0")!, parseSemver("1.10.0")!)).toBeLessThan(0);
  });
});

describe("buildChangelog", () => {
  const entries = buildChangelog(history);

  it("lists entries newest first", () => {
    expect(entries.map((e) => e.id)).toEqual(["u7", "u6", "u5", "u4", "u3", "u2", "u1"]);
  });

  it("maps update types and version bumps onto changelog categories", () => {
    const byId = Object.fromEntries(entries.map((e) => [e.id, e.category]));
    expect(byId).toEqual({
      u1: "feature", // first release
      u2: "bugfix", // patch bump over v1.0.0
      u3: "security",
      u4: "feature", // minor bump
      u5: "announcement",
      u6: "feature", // milestone
      u7: "bugfix", // titled as a hotfix
    });
  });

  it("shows semver badges only on releases, normalised to vX.Y.Z", () => {
    expect(entries.find((e) => e.id === "u4")?.version).toBe("v1.1.0");
    expect(entries.find((e) => e.id === "u7")?.version).toBe("v2.0.0-beta.1");
    expect(entries.find((e) => e.id === "u3")?.version).toBeNull();
  });

  it("keeps date, title, description and author on every entry", () => {
    const entry = entries.find((e) => e.id === "u5")!;
    expect(entry).toMatchObject({
      date: "2024-03-05T00:00:00Z",
      title: "Title u5",
      description: "Details for u5",
      author: AUTHOR,
      source: "Announcement",
    });
  });

  it("does not depend on input order", () => {
    expect(buildChangelog([...history].reverse())).toEqual(entries);
  });
});

describe("filtering", () => {
  const entries = buildChangelog(history);

  it("returns everything when no type is selected", () => {
    expect(filterChangelog(entries, new Set())).toHaveLength(7);
  });

  it("keeps only the selected types", () => {
    expect(filterChangelog(entries, new Set(["bugfix", "security"])).map((e) => e.id)).toEqual(["u7", "u3", "u2"]);
  });

  it("counts entries per type", () => {
    expect(countByCategory(entries)).toEqual({ feature: 3, bugfix: 2, security: 1, announcement: 1 });
  });
});

describe("Markdown export", () => {
  it("writes a heading per entry with version, date, type and author", () => {
    const markdown = changelogToMarkdown("Soroban Swap", buildChangelog(history).slice(0, 1), {
      generatedAt: new Date("2024-04-01T00:00:00Z"),
      projectUrl: "https://dongle.app/projects/proj-x",
    });
    expect(markdown).toContain("# Soroban Swap changelog");
    expect(markdown).toContain("Project: https://dongle.app/projects/proj-x");
    expect(markdown).toContain("Generated 2024-04-01. Newest first.");
    expect(markdown).toContain("## v2.0.0-beta.1: Hotfix for swap routing");
    expect(markdown).toContain("- **Date:** 2024-03-20");
    expect(markdown).toContain("- **Type:** Bug fix (Release)");
    expect(markdown).toContain(`- **Author:** \`${AUTHOR}\``);
  });

  it("says so when there are no entries", () => {
    expect(changelogToMarkdown("Empty", [])).toContain("_No entries yet._");
  });

  it("derives a safe file name", () => {
    expect(changelogFileName("Soroban Swap!")).toBe("soroban-swap-changelog.md");
    expect(changelogFileName("***")).toBe("project-changelog.md");
  });
});

describe("RSS", () => {
  const rss = changelogToRss({
    projectName: "Swap & <Co>",
    projectId: "proj-x",
    siteUrl: "https://dongle.app/",
    entries: buildChangelog([update("u1", "Release", "2024-03-20T00:00:00Z", { version: "v1.0.0", content: "a <b> & c" })]),
  });

  it("produces an RSS 2.0 channel with a self link", () => {
    expect(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(rss).toContain('<rss version="2.0"');
    expect(rss).toContain("<link>https://dongle.app/projects/proj-x/changelog</link>");
    expect(rss).toContain('href="https://dongle.app/projects/proj-x/changelog/rss"');
  });

  it("escapes markup and emits one item per entry", () => {
    expect(rss).toContain("<title>Swap &amp; &lt;Co&gt; changelog</title>");
    expect(rss).toContain("<title>v1.0.0: Title u1</title>");
    expect(rss).toContain("<description>a &lt;b&gt; &amp; c</description>");
    expect(rss).toContain("<pubDate>Wed, 20 Mar 2024 00:00:00 GMT</pubDate>");
    expect(rss.match(/<item>/g)).toHaveLength(1);
  });
});

describe("shortenAddress", () => {
  it("keeps the first and last four characters", () => {
    expect(shortenAddress(AUTHOR)).toBe("GABC…OPQR");
    expect(shortenAddress("GSHORT")).toBe("GSHORT");
  });
});
