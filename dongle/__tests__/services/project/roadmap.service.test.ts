import { describe, expect, it } from "vitest";
import { getMilestoneStatusChanges } from "@/services/project/roadmap.service";
import { isProjectRoadmap } from "@/types/roadmap";

describe("project roadmap", () => {
  it("validates the published roadmap shape", () => {
    expect(isProjectRoadmap({
      milestones: [{
        title: "Launch",
        description: "Release the first version",
        status: "planned",
        targetDate: "2026-12-01",
      }],
    })).toBe(true);
    expect(isProjectRoadmap({ milestones: [{ title: "Invalid", status: "blocked" }] })).toBe(false);
  });

  it("detects milestone status changes without flagging unchanged entries", () => {
    const previous = [{
      title: "Launch",
      description: "Release",
      status: "planned" as const,
      targetDate: "2026-12-01",
    }];
    const next = [{
      ...previous[0],
      status: "in-progress" as const,
    }];

    expect(getMilestoneStatusChanges(previous, next)).toEqual([{
      title: "Launch",
      previousStatus: "planned",
      status: "in-progress",
    }]);
    expect(getMilestoneStatusChanges(next, next)).toEqual([]);
  });
});
