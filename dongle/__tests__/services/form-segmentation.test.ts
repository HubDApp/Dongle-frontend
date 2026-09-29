import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluateRule,
  evaluateRuleGroup,
  assignSegmentsToSubmission,
  computeSegmentStats,
  saveCustomSegment,
  deleteCustomSegment,
  getAllSegments,
  DEFAULT_SEGMENTS,
} from "@/services/form-segmentation";
import type { ProjectSubmission, Project } from "@/types/project";

describe("Form Submission Segmentation System", () => {
  const mockSubmissions: ProjectSubmission[] = [
    {
      id: "sub-1",
      projectId: "soroban-swap",
      projectName: "SorobanSwap DEX",
      submittedBy: "GBANK123",
      submittedAt: "2026-03-01T00:00:00Z",
      status: "approved",
      qualityScore: 92,
      flagReasons: [],
    },
    {
      id: "sub-2",
      projectId: "risky-project",
      projectName: "Risky Clone",
      submittedBy: "GBANK456",
      submittedAt: "2026-03-02T00:00:00Z",
      status: "flagged",
      qualityScore: 40,
      flagReasons: ["Suspicious fast submission", "Copied description"],
    },
    {
      id: "sub-3",
      projectId: "nft-meta",
      projectName: "Stellar Apes NFT",
      submittedBy: "GBANK789",
      submittedAt: "2026-03-03T00:00:00Z",
      status: "pending",
      qualityScore: 78,
      flagReasons: [],
    },
  ];

  const mockProject: Project = {
    id: "soroban-swap",
    name: "SorobanSwap DEX",
    primaryCategory: "DeFi / DEX",
    description: "Decentralized exchange",
    rating: 5,
    reviews: 10,
    createdAt: "2026-01-01T00:00:00Z",
    contractAddresses: ["CA3D5KRYMCMQU7YOGYSTKZSDPTZE7BM7TDTW3HMWODWH7SX7QL2NCXYZ"],
    auditReportUrl: "https://audit.com/report.pdf",
  };

  beforeEach(() => {
    localStorage.clear();
  });

  describe("Rule Evaluation Operators", () => {
    it("evaluates equals and notEquals operators correctly", () => {
      expect(
        evaluateRule(
          mockSubmissions[0],
          { field: "qualityScore", operator: "equals", value: 92 },
          mockProject,
        ),
      ).toBe(true);

      expect(
        evaluateRule(
          mockSubmissions[0],
          { field: "status", operator: "notEquals", value: "flagged" },
          mockProject,
        ),
      ).toBe(true);
    });

    it("evaluates greaterThan and lessThan operators correctly", () => {
      expect(
        evaluateRule(
          mockSubmissions[0],
          { field: "qualityScore", operator: "greaterThanOrEqual", value: 90 },
          mockProject,
        ),
      ).toBe(true);

      expect(
        evaluateRule(
          mockSubmissions[1],
          { field: "qualityScore", operator: "lessThan", value: 50 },
          null,
        ),
      ).toBe(true);
    });

    it("evaluates boolean contract address and audit checks", () => {
      expect(
        evaluateRule(
          mockSubmissions[0],
          { field: "hasContracts", operator: "equals", value: true },
          mockProject,
        ),
      ).toBe(true);

      expect(
        evaluateRule(
          mockSubmissions[0],
          { field: "hasAudit", operator: "equals", value: true },
          mockProject,
        ),
      ).toBe(true);
    });
  });

  describe("Rule Groups (AND / OR)", () => {
    it("evaluates AND logic across multiple conditions", () => {
      const isHighTrustDeFi = evaluateRuleGroup(
        mockSubmissions[0],
        {
          logic: "AND",
          rules: [
            { field: "qualityScore", operator: "greaterThanOrEqual", value: 80 },
            { field: "primaryCategory", operator: "equals", value: "DeFi / DEX" },
          ],
        },
        mockProject,
      );
      expect(isHighTrustDeFi).toBe(true);
    });

    it("evaluates OR logic correctly for moderation flags", () => {
      const isNeedsReview = evaluateRuleGroup(
        mockSubmissions[1],
        {
          logic: "OR",
          rules: [
            { field: "status", operator: "equals", value: "flagged" },
            { field: "qualityScore", operator: "lessThan", value: 50 },
          ],
        },
        null,
      );
      expect(isNeedsReview).toBe(true);
    });
  });

  describe("Auto-Assign Segments", () => {
    it("auto-assigns built-in segments to matching submissions", () => {
      const segments = assignSegmentsToSubmission(
        mockSubmissions[0],
        DEFAULT_SEGMENTS,
        mockProject,
      );

      const segmentNames = segments.map((s) => s.name);
      expect(segmentNames).toContain("DeFi Powerhouses");
      expect(segmentNames).toContain("Smart Contract Enabled");
      expect(segmentNames).toContain("High-Trust Top Tier");
    });

    it("auto-assigns moderation/risk segment to flagged submissions", () => {
      const segments = assignSegmentsToSubmission(
        mockSubmissions[1],
        DEFAULT_SEGMENTS,
        null,
      );
      const segmentNames = segments.map((s) => s.name);
      expect(segmentNames).toContain("Needs Moderation / Risk");
    });
  });

  describe("Custom Segments (CRUD)", () => {
    it("creates, saves, lists, and deletes custom segments", () => {
      const saved = saveCustomSegment({
        name: "Top Tier Staking",
        description: "Projects with staking tags and quality score >= 85",
        color: "#ec4899",
        badgeBg: "bg-pink-100 dark:bg-pink-900/30",
        badgeText: "text-pink-700 dark:text-pink-400",
        priority: 10,
        isActive: true,
        ruleGroup: {
          logic: "AND",
          rules: [{ field: "qualityScore", operator: "greaterThanOrEqual", value: 85 }],
        },
      });

      expect(saved.id).toMatch(/^seg_custom_/);
      expect(saved.isCustom).toBe(true);

      const all = getAllSegments();
      expect(all.some((s) => s.id === saved.id)).toBe(true);

      // Delete custom segment
      const deleted = deleteCustomSegment(saved.id);
      expect(deleted).toBe(true);
      expect(getAllSegments().some((s) => s.id === saved.id)).toBe(false);
    });
  });

  describe("Segment Distribution Stats", () => {
    it("computes stats, percentages, and average quality score across segments", () => {
      const stats = computeSegmentStats(mockSubmissions, DEFAULT_SEGMENTS);
      expect(stats.length).toBe(DEFAULT_SEGMENTS.length);

      const moderationStat = stats.find(
        (s) => s.segment.name === "Needs Moderation / Risk",
      );
      expect(moderationStat?.count).toBe(1);
      expect(moderationStat?.percentage).toBe(33); // 1 of 3 -> 33%
    });
  });
});
