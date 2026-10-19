export const MILESTONE_STATUSES = [
  "planned",
  "in-progress",
  "completed",
  "cancelled",
] as const;

export type MilestoneStatus = typeof MILESTONE_STATUSES[number];

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  targetDate: string;
  completedDate?: string;
  status: MilestoneStatus;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneAnalytics {
  total: number;
  completed: number;
  completionRate: number;
  onTime: number;
  delayed: number;
  overdue: number;
}

export type ProjectMilestoneInput = Pick<
  ProjectMilestone,
  "title" | "description" | "targetDate" | "status"
> & { progress?: number };