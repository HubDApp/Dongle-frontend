/**
 * Project changelog (issue #843).
 *
 * Turns a project's updates into a version history: each entry gets a changelog
 * category, a semantic-version badge when it is a release, and can be exported
 * as Markdown or served as an RSS feed. Pure functions only, so the page, the
 * RSS route and the tests share one implementation.
 */
import type { ProjectUpdate } from "@/types/update";

export const CHANGELOG_CATEGORIES = ["feature", "bugfix", "security", "announcement"] as const;
export type ChangelogCategory = (typeof CHANGELOG_CATEGORIES)[number];

export const CHANGELOG_CATEGORY_LABELS: Record<ChangelogCategory, string> = {
  feature: "Feature",
  bugfix: "Bug fix",
  security: "Security",
  announcement: "Announcement",
};

export interface ChangelogEntry {
  id: string;
  date: string; // ISO timestamp
  title: string;
  description: string;
  author: string;
  category: ChangelogCategory;
  /** Normalised semantic version (`v1.2.3`) for releases, otherwise null. */
  version: string | null;
  /** The update type the entry came from (Release, Milestone, …). */
  source: ProjectUpdate["type"];
}

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

const SEMVER = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const FIX_WORDS = /\b(fix(es|ed)?|bug(fix)?s?|hotfix|patch(ed)?|regression)\b/i;

/** Parses `v2.0.0`, `2.1`, `3` or `1.0.0-beta.1`; returns null for anything else. */
export function parseSemver(raw: string | undefined | null): SemVer | null {
  const match = SEMVER.exec((raw ?? "").trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
    prerelease: match[4] ?? null,
  };
}

/** `v1.0.0`, `v1.0.0-beta.1`: the badge text for a version. */
export function formatSemver(version: SemVer): string {
  const core = `v${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease ? `${core}-${version.prerelease}` : core;
}

/** Negative when a < b, following semver precedence (prereleases sort first). */
export function compareSemver(a: SemVer, b: SemVer): number {
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
}

function isPatchBump(previous: SemVer | null, current: SemVer): boolean {
  return (
    previous !== null &&
    current.major === previous.major &&
    current.minor === previous.minor &&
    current.patch > previous.patch
  );
}

/**
 * Category of one update:
 * - Security Audit → security
 * - Announcement → announcement
 * - Release → bugfix when it only bumps the patch version over the previous
 *   release or describes itself as a fix; otherwise feature
 * - Milestone → feature
 */
export function categorize(
  update: Pick<ProjectUpdate, "type" | "title" | "content">,
  version: SemVer | null,
  previousRelease: SemVer | null,
): ChangelogCategory {
  switch (update.type) {
    case "Security Audit":
      return "security";
    case "Announcement":
      return "announcement";
    case "Release":
      if (version && isPatchBump(previousRelease, version)) return "bugfix";
      return FIX_WORDS.test(update.title) ? "bugfix" : "feature";
    default:
      return "feature";
  }
}

/** Changelog entries, newest first. */
export function buildChangelog(updates: ProjectUpdate[]): ChangelogEntry[] {
  const oldestFirst = [...updates].sort(
    (a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || a.id.localeCompare(b.id),
  );
  let previousRelease: SemVer | null = null;
  const entries = oldestFirst.map((update): ChangelogEntry => {
    const version = update.type === "Release" ? parseSemver(update.version) : null;
    const category = categorize(update, version, previousRelease);
    if (version) previousRelease = version;
    return {
      id: update.id,
      date: update.publishedAt,
      title: update.title,
      description: update.content,
      author: update.authorAddress,
      category,
      version: version ? formatSemver(version) : null,
      source: update.type,
    };
  });
  return entries.reverse();
}

export function filterChangelog(
  entries: ChangelogEntry[],
  categories: ReadonlySet<ChangelogCategory>,
): ChangelogEntry[] {
  if (categories.size === 0) return entries;
  return entries.filter((entry) => categories.has(entry.category));
}

export function countByCategory(entries: ChangelogEntry[]): Record<ChangelogCategory, number> {
  const counts = { feature: 0, bugfix: 0, security: 0, announcement: 0 };
  for (const entry of entries) counts[entry.category] += 1;
  return counts;
}

/** `GABC…XYZ1` for display; the full address stays available as a tooltip. */
export function shortenAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

export function formatChangelogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function isoDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Markdown export, grouped like a conventional CHANGELOG.md. */
export function changelogToMarkdown(
  projectName: string,
  entries: ChangelogEntry[],
  options: { projectUrl?: string; generatedAt?: Date } = {},
): string {
  const lines = [`# ${projectName} changelog`, ""];
  if (options.projectUrl) lines.push(`Project: ${options.projectUrl}`, "");
  lines.push(`Generated ${isoDay((options.generatedAt ?? new Date()).toISOString())}. Newest first.`, "");
  if (entries.length === 0) lines.push("_No entries yet._", "");
  for (const entry of entries) {
    const heading = entry.version ? `${entry.version}: ${entry.title}` : entry.title;
    lines.push(
      `## ${heading}`,
      "",
      `- **Date:** ${isoDay(entry.date)}`,
      `- **Type:** ${CHANGELOG_CATEGORY_LABELS[entry.category]} (${entry.source})`,
      `- **Author:** \`${entry.author}\``,
      "",
      entry.description.trim(),
      "",
    );
  }
  return lines.join("\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 document for a project's changelog. */
export function changelogToRss(options: {
  projectName: string;
  projectId: string;
  siteUrl: string;
  entries: ChangelogEntry[];
}): string {
  const site = options.siteUrl.replace(/\/+$/, "");
  const pageUrl = `${site}/projects/${encodeURIComponent(options.projectId)}/changelog`;
  const latest = options.entries[0]?.date;
  const items = options.entries.map((entry) => {
    const title = entry.version ? `${entry.version}: ${entry.title}` : entry.title;
    return [
      "    <item>",
      `      <title>${escapeXml(title)}</title>`,
      `      <link>${escapeXml(`${pageUrl}#entry-${entry.id}`)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(`${options.projectId}:${entry.id}`)}</guid>`,
      `      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>`,
      `      <category>${escapeXml(CHANGELOG_CATEGORY_LABELS[entry.category])}</category>`,
      `      <author>${escapeXml(entry.author)}</author>`,
      `      <description>${escapeXml(entry.description)}</description>`,
      "    </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(`${options.projectName} changelog`)}</title>`,
    `    <link>${escapeXml(pageUrl)}</link>`,
    `    <atom:link href="${escapeXml(`${pageUrl}/rss`)}" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(`Releases, fixes, security audits and announcements for ${options.projectName} on Dongle.`)}</description>`,
    "    <language>en</language>",
    ...(latest ? [`    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>`] : []),
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

/** File name for the Markdown export, e.g. `soroban-swap-changelog.md`. */
export function changelogFileName(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "project"}-changelog.md`;
}
