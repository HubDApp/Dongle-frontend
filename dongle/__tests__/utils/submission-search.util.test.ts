import { describe, it, expect } from "vitest";
import {
  applySubmissionFilters,
  exportSubmissionsToCsv,
} from "@/utils/submission-search.util";
import type { ProjectSubmission } from "@/types/project";

const mockSubmissions: ProjectSubmission[] = [
  {
    id: "sub-1",
    projectId: "alpha-dex",
    projectName: "Alpha DEX",
    submittedBy: "GABC123",
    submittedAt: "2026-01-10T10:00:00Z",
    status: "pending",
    qualityScore: 85,
    flagReasons: [],
  },
  {
    id: "sub-2",
    projectId: "beta-pay",
    projectName: "Beta Payments",
    submittedBy: "GXYZ789",
    submittedAt: "2026-02-15T12:00:00Z",
    status: "approved",
    qualityScore: 95,
    flagReasons: [],
  },
  {
    id: "sub-3",
    projectId: "gamma-scam",
    projectName: "Gamma Scam",
    submittedBy: "GBAD999",
    submittedAt: "2026-03-01T08:00:00Z",
    status: "flagged",
    qualityScore: 40,
    flagReasons: ["Suspicious volume"],
  },
];

describe("submission-search.util", () => {
  it("searches by field value (project name, ID, submitter)", () => {
    const res1 = applySubmissionFilters(mockSubmissions, {
      query: "alpha",
      status: "all",
      flaggedOnly: false,
    });
    expect(res1.length).toBe(1);
    expect(res1[0].projectId).toBe("alpha-dex");

    const res2 = applySubmissionFilters(mockSubmissions, {
      query: "GXYZ",
      status: "all",
      flaggedOnly: false,
    });
    expect(res2.length).toBe(1);
    expect(res2[0].projectId).toBe("beta-pay");
  });

  it("searches by status", () => {
    const res = applySubmissionFilters(mockSubmissions, {
      query: "",
      status: "approved",
      flaggedOnly: false,
    });
    expect(res.length).toBe(1);
    expect(res[0].status).toBe("approved");
  });

  it("searches by date range", () => {
    const res = applySubmissionFilters(mockSubmissions, {
      query: "",
      status: "all",
      submittedFrom: "2026-02-01",
      submittedTo: "2026-02-28",
      flaggedOnly: false,
    });
    expect(res.length).toBe(1);
    expect(res[0].projectId).toBe("beta-pay");
  });

  it("filters by advanced filters (quality score range, flagged only)", () => {
    const resScore = applySubmissionFilters(mockSubmissions, {
      query: "",
      status: "all",
      qualityScoreMin: 90,
      flaggedOnly: false,
    });
    expect(resScore.length).toBe(1);
    expect(resScore[0].qualityScore).toBe(95);

    const resFlagged = applySubmissionFilters(mockSubmissions, {
      query: "",
      status: "all",
      flaggedOnly: true,
    });
    expect(resFlagged.length).toBe(1);
    expect(resFlagged[0].status).toBe("flagged");
  });

  it("exports results to CSV", () => {
    const csv = exportSubmissionsToCsv(mockSubmissions);
    expect(csv).toContain("Alpha DEX");
    expect(csv).toContain("beta-pay");
    expect(csv).toContain("Suspicious volume");
  });
});
