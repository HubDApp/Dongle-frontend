export const ROADMAP_STATUSES = [
  "planned",
  "in-progress",
  "completed",
  "delayed",
] as const;

export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export interface RoadmapMilestone {
  title: string;
  description: string;
  status: RoadmapStatus;
  targetDate: string;
}

export interface ProjectRoadmap {
  milestones: RoadmapMilestone[];
}

export function isRoadmapStatus(value: unknown): value is RoadmapStatus {
  return typeof value === "string" && ROADMAP_STATUSES.includes(value as RoadmapStatus);
}

export function isProjectRoadmap(value: unknown): value is ProjectRoadmap {
  if (!value || typeof value !== "object" || !("milestones" in value)) return false;

  const milestones = (value as { milestones?: unknown }).milestones;
  return (
    Array.isArray(milestones) &&
    milestones.every(
      (milestone) =>
        milestone &&
        typeof milestone === "object" &&
        typeof milestone.title === "string" &&
        typeof milestone.description === "string" &&
        isRoadmapStatus(milestone.status) &&
        typeof milestone.targetDate === "string",
    )
  );
}
