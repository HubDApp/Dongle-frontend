import { describe, it, expect } from "vitest";
import {
  calculateReviewerBadges,
  REVIEWER_BADGES,
} from "@/types/reviewer-badge";
import { computeDiff, formatDiff, MAX_EDITS_PER_REVIEW } from "@/types/review-edit-history";
import { REVIEW_TEMPLATES, TEMPLATE_CATEGORIES } from "@/types/review-template";

// ── #678: Reviewer badges ─────────────────────────────────────────────────────

describe("Reviewer badges (#678)", () => {
  it("awards Top Reviewer for 100+ helpful votes", () => {
    const badges = calculateReviewerBadges({
      helpfulVotes: 100,
      isVerified: false,
      reviewedDuringBeta: false,
      reviewsByCategory: {},
    });
    expect(badges.map((b) => b.type)).toContain("top-reviewer");
  });

  it("does not award Top Reviewer for fewer than 100 helpful votes", () => {
    const badges = calculateReviewerBadges({
      helpfulVotes: 99,
      isVerified: false,
      reviewedDuringBeta: false,
      reviewsByCategory: {},
    });
    expect(badges.map((b) => b.type)).not.toContain("top-reviewer");
  });

  it("awards Verified User for OAuth + wallet linked", () => {
    const badges = calculateReviewerBadges({
      helpfulVotes: 0,
      isVerified: true,
      reviewedDuringBeta: false,
      reviewsByCategory: {},
    });
    expect(badges.map((b) => b.type)).toContain("verified-user");
  });

  it("awards Early Adopter for beta reviewers", () => {
    const badges = calculateReviewerBadges({
      helpfulVotes: 0,
      isVerified: false,
      reviewedDuringBeta: true,
      reviewsByCategory: {},
    });
    expect(badges.map((b) => b.type)).toContain("early-adopter");
  });

  it("awards Domain Expert for 10+ reviews in one category", () => {
    const badges = calculateReviewerBadges({
      helpfulVotes: 0,
      isVerified: false,
      reviewedDuringBeta: false,
      reviewsByCategory: { defi: 10 },
    });
    expect(badges.map((b) => b.type)).toContain("domain-expert");
  });

  it("does not award Domain Expert for fewer than threshold reviews", () => {
    const badges = calculateReviewerBadges({
      helpfulVotes: 0,
      isVerified: false,
      reviewedDuringBeta: false,
      reviewsByCategory: { defi: 9 },
    });
    expect(badges.map((b) => b.type)).not.toContain("domain-expert");
  });

  it("all badge types have label, description, and icon", () => {
    for (const badge of Object.values(REVIEWER_BADGES)) {
      expect(badge.label).toBeTruthy();
      expect(badge.description).toBeTruthy();
      expect(badge.icon).toBeTruthy();
    }
  });
});

// ── #681: Edit history ────────────────────────────────────────────────────────

describe("Review edit history (#681)", () => {
  it("computeDiff detects added words", () => {
    const diff = computeDiff("hello world", "hello brave new world");
    expect(diff.added).toContain("brave");
    expect(diff.added).toContain("new");
  });

  it("computeDiff detects removed words", () => {
    const diff = computeDiff("hello brave new world", "hello world");
    expect(diff.removed).toContain("brave");
    expect(diff.removed).toContain("new");
  });

  it("formatDiff marks additions with + and removals with -", () => {
    const result = formatDiff("hello world", "hello brave world");
    expect(result).toContain("+brave+");
  });

  it("MAX_EDITS_PER_REVIEW is 3", () => {
    expect(MAX_EDITS_PER_REVIEW).toBe(3);
  });
});

// ── #680: Review templates ────────────────────────────────────────────────────

describe("Review templates (#680)", () => {
  it("has templates for all 4 categories", () => {
    expect(TEMPLATE_CATEGORIES).toEqual(["defi", "nft", "gaming", "tools"]);
  });

  it("each template has at least 4 prompts", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(REVIEW_TEMPLATES[cat].prompts.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("DeFi template covers security, fees, liquidity, UX", () => {
    const defi = REVIEW_TEMPLATES.defi;
    const text = defi.prompts.join(" ").toLowerCase();
    expect(text).toContain("security");
    expect(text).toContain("fee");
    expect(text).toContain("liquid");
    expect(text).toContain("experience");
  });

  it("NFT template covers collection, rarity, community, roadmap", () => {
    const nft = REVIEW_TEMPLATES.nft;
    const text = nft.prompts.join(" ").toLowerCase();
    expect(text).toContain("collection");
    expect(text).toContain("rarity");
    expect(text).toContain("community");
    expect(text).toContain("roadmap");
  });

  it("Gaming template covers gameplay, graphics, economy, bugs", () => {
    const gaming = REVIEW_TEMPLATES.gaming;
    const text = gaming.prompts.join(" ").toLowerCase();
    expect(text).toContain("gameplay");
    expect(text).toContain("graphic");
    expect(text).toContain("economy");
    expect(text).toContain("bug");
  });

  it("Tools template covers features, performance, support, pricing", () => {
    const tools = REVIEW_TEMPLATES.tools;
    const text = tools.prompts.join(" ").toLowerCase();
    expect(text).toContain("feature");
    expect(text).toContain("performance");
    expect(text).toContain("support");
    expect(text).toContain("pricing");
  });
});
