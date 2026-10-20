import { beforeEach, describe, expect, it } from "vitest";
import { milestoneService } from "@/services/project/milestone.service";

const storageKey = "dongle_project_milestones";
const watchlistNotificationKey = "dongle_watchlist_notifications";

beforeEach(() => {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(watchlistNotificationKey);
});

describe("milestoneService", () => {
  it("creates, updates, and deletes a project milestone", () => {
    const milestone = milestoneService.create("project-1", {
      title: "Private beta",
      description: "Invite early users",
      targetDate: "2030-04-01",
      status: "planned",
    });

    expect(milestoneService.getByProject("project-1")).toHaveLength(1);
    expect(milestoneService.update(milestone.id, {
      ...milestone,
      title: "Public beta",
      targetDate: "2030-05-01",
      status: "in-progress",
    })?.title).toBe("Public beta");
    expect(milestoneService.delete(milestone.id)).toBe(true);
    expect(milestoneService.getByProject("project-1")).toHaveLength(0);
  });

  it("sets completion metadata when completed", () => {
    const milestone = milestoneService.create("project-2", {
      title: "Mainnet launch",
      description: "Deploy production contracts",
      targetDate: "2030-06-01",
      status: "planned",
    });

    const completed = milestoneService.update(milestone.id, {
      title: milestone.title,
      description: milestone.description,
      targetDate: milestone.targetDate,
      status: "completed",
    });

    expect(completed?.completedDate).toBeTruthy();
    expect(completed?.progress).toBe(100);
  });

  it("reports completion rate, on-time completions, delayed completions, and overdue items", () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    milestoneService.create("project-3", {
      title: "On time",
      description: "",
      targetDate: todayKey,
      status: "completed",
    });
    milestoneService.create("project-3", {
      title: "Late",
      description: "",
      targetDate: "2020-01-01",
      status: "completed",
    });
    milestoneService.create("project-3", {
      title: "Overdue",
      description: "",
      targetDate: "2020-01-01",
      status: "in-progress",
      progress: 50,
    });

    expect(milestoneService.getCompletionRate("project-3")).toBe(67);
    expect(milestoneService.getAnalytics("project-3", new Date())).toMatchObject({
      total: 3,
      completed: 2,
      completionRate: 67,
      onTime: 1,
      delayed: 1,
      overdue: 1,
    });
  });
});
