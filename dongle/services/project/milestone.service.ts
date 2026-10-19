import { generateId } from "@/lib/id-generator";
import { MILESTONE_STATUSES } from "@/types/milestone";
import type {
  MilestoneAnalytics,
  ProjectMilestone,
  ProjectMilestoneInput,
} from "@/types/milestone";

const STORAGE_KEY = "dongle_project_milestones";
const MILESTONES_CHANGED_EVENT = "dongle:project-milestones-changed";

function readMilestones(): ProjectMilestone[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ProjectMilestone =>
      Boolean(item && typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.projectId === "string" &&
        typeof item.title === "string" &&
        typeof item.targetDate === "string" &&
        MILESTONE_STATUSES.includes(item.status)),
    );
  } catch {
    return [];
  }
}

function writeMilestones(milestones: ProjectMilestone[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(milestones));
    window.dispatchEvent(new CustomEvent(MILESTONES_CHANGED_EVENT));
  } catch {
    throw new Error("Could not save project milestones");
  }
}

function validateInput(input: ProjectMilestoneInput): void {
  if (!input.title.trim()) throw new Error("Milestone title is required");
  if (!input.targetDate || !Number.isFinite(Date.parse(input.targetDate))) {
    throw new Error("A valid target date is required");
  }
  if (input.progress !== undefined && (!Number.isInteger(input.progress) || input.progress < 0 || input.progress > 100)) {
    throw new Error("Progress must be between 0 and 100");
  }
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const milestoneService = {
  getByProject(projectId: string): ProjectMilestone[] {
    return readMilestones()
      .filter((milestone) => milestone.projectId === projectId)
      .sort((a, b) => Date.parse(a.targetDate) - Date.parse(b.targetDate));
  },

  getAll(): ProjectMilestone[] {
    return readMilestones();
  },

  create(projectId: string, input: ProjectMilestoneInput): ProjectMilestone {
    validateInput(input);
    const now = new Date().toISOString();
    const milestone: ProjectMilestone = {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      id: generateId(),
      projectId,
      completedDate: input.status === "completed" ? now : undefined,
      progress: input.status === "completed" ? 100 : input.progress,
      createdAt: now,
      updatedAt: now,
    };
    writeMilestones([...readMilestones(), milestone]);
    return milestone;
  },

  update(id: string, input: ProjectMilestoneInput): ProjectMilestone | null {
    validateInput(input);
    const milestones = readMilestones();
    const index = milestones.findIndex((milestone) => milestone.id === id);
    if (index < 0) return null;

    const previous = milestones[index];
    const now = new Date().toISOString();
    const milestone: ProjectMilestone = {
      ...previous,
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      completedDate: input.status === "completed"
        ? previous.completedDate ?? now
        : undefined,
      progress: input.status === "completed" ? 100 : input.progress,
      updatedAt: now,
    };
    milestones[index] = milestone;
    writeMilestones(milestones);
    return milestone;
  },

  delete(id: string): boolean {
    const milestones = readMilestones();
    const next = milestones.filter((milestone) => milestone.id !== id);
    if (next.length === milestones.length) return false;
    writeMilestones(next);
    return true;
  },

  getCompletionRate(projectId: string): number {
    const milestones = this.getByProject(projectId).filter((milestone) => milestone.status !== "cancelled");
    if (milestones.length === 0) return 0;
    return Math.round((milestones.filter((milestone) => milestone.status === "completed").length / milestones.length) * 100);
  },

  getAnalytics(projectId: string, now = new Date()): MilestoneAnalytics {
    const milestones = this.getByProject(projectId);
    const completedMilestones = milestones.filter((milestone) => milestone.status === "completed");
    const onTime = completedMilestones.filter((milestone) =>
      Boolean(milestone.completedDate) &&
      localDateKey(new Date(milestone.completedDate!)) <= milestone.targetDate.slice(0, 10),
    ).length;
    const delayed = completedMilestones.length - onTime;
    const overdue = milestones.filter((milestone) =>
      milestone.status !== "completed" && milestone.status !== "cancelled" &&
      milestone.targetDate.slice(0, 10) < localDateKey(now),
    ).length;
    return {
      total: milestones.length,
      completed: completedMilestones.length,
      completionRate: milestones.filter((milestone) => milestone.status !== "cancelled").length
        ? Math.round((completedMilestones.length / milestones.filter((milestone) => milestone.status !== "cancelled").length) * 100)
        : 0,
      onTime,
      delayed,
      overdue,
    };
  },
};