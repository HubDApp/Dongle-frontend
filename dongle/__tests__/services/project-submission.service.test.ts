import { describe, it, expect, beforeEach, vi } from "vitest";
import { projectSubmissionService } from "@/services/project/project-submission.service";
import { notificationService } from "@/services/notification/notification.service";

describe("projectSubmissionService", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    });
    localStorage.clear();
    notificationService._clearForTesting();
  });

  it("auto-flags submissions with multiple suspicious signals", () => {
    const submission = projectSubmissionService.recordSubmission({
      projectId: "scam-dex",
      projectName: "Scam DEX",
      submittedBy: "GTEST123",
      qualityScore: 30,
      flagReasons: ["Low quality score", "No audit report provided"],
    });

    expect(submission.status).toBe("flagged");
    expect(projectSubmissionService.isDiscoverable("scam-dex")).toBe(false);
  });

  it("approves clean submissions and hides rejected ones from discover", () => {
    projectSubmissionService.recordSubmission({
      projectId: "clean-app",
      projectName: "Clean App",
      submittedBy: "GTEST123",
      qualityScore: 90,
      flagReasons: [],
    });

    expect(projectSubmissionService.isDiscoverable("clean-app")).toBe(true);

    projectSubmissionService.updateStatus(
      "clean-app",
      "rejected",
      "GADMIN123",
      "Spam",
    );

    expect(projectSubmissionService.isDiscoverable("clean-app")).toBe(false);
  });

  it("returns discoverable for projects without moderation records", () => {
    expect(projectSubmissionService.isDiscoverable("legacy-project")).toBe(true);
  });

  it("assigns a submission to an admin and logs assignment", () => {
    projectSubmissionService.recordSubmission({
      projectId: "new-project",
      projectName: "New Project",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: ["Minor issue"],
    });

    const result = projectSubmissionService.assignSubmission(
      "new-project",
      "GADMIN123",
      "GADMIN456",
      "Needs review",
    );

    expect(result.success).toBe(true);
    expect(result.submission?.assignedTo).toBe("GADMIN456");
    expect(result.submission?.assignedAt).toBeDefined();

    const log = projectSubmissionService.getModerationLog();
    expect(log.length).toBe(1);
    expect(log[0].action).toBe("assigned");
    expect(log[0].assignedTo).toBe("GADMIN456");
    expect(log[0].reason).toBe("Needs review");
  });

  it("reassigns a submission and logs reassignment", () => {
    projectSubmissionService.recordSubmission({
      projectId: "reassign-project",
      projectName: "Reassign Project",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });

    // First assignment
    projectSubmissionService.assignSubmission(
      "reassign-project",
      "GADMIN123",
      "GADMIN456",
    );

    // Reassign to another admin
    const result = projectSubmissionService.assignSubmission(
      "reassign-project",
      "GADMIN123",
      "GADMIN789",
      "Reassigning to specialist",
    );

    expect(result.success).toBe(true);
    expect(result.submission?.assignedTo).toBe("GADMIN789");

    const log = projectSubmissionService.getModerationLog();
    expect(log.length).toBe(2);
    // Most recent first
    expect(log[0].action).toBe("reassigned");
    expect(log[0].assignedTo).toBe("GADMIN789");
    expect(log[0].reason).toBe("Reassigning to specialist");
    expect(log[1].action).toBe("assigned");
    expect(log[1].assignedTo).toBe("GADMIN456");
  });

  it("unassigns a submission and logs unassignment", () => {
    projectSubmissionService.recordSubmission({
      projectId: "unassign-project",
      projectName: "Unassign Project",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });

    projectSubmissionService.assignSubmission(
      "unassign-project",
      "GADMIN123",
      "GADMIN456",
    );

    const result = projectSubmissionService.unassignSubmission(
      "unassign-project",
      "GADMIN123",
      "Work completed",
    );

    expect(result.success).toBe(true);
    expect(result.submission?.assignedTo).toBeUndefined();
    expect(result.submission?.assignedAt).toBeUndefined();

    const log = projectSubmissionService.getModerationLog();
    expect(log.length).toBe(2);
    expect(log[0].action).toBe("unassigned");
    expect(log[0].reason).toBe("Work completed");
    expect(log[1].action).toBe("assigned");
  });

  it("sends notification to assignee on assignment", () => {
    projectSubmissionService.recordSubmission({
      projectId: "notify-project",
      projectName: "Notify Project",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });

    projectSubmissionService.assignSubmission(
      "notify-project",
      "GADMIN123",
      "GADMIN456",
      "Please review",
    );

    const notifications = notificationService.getForUser("GADMIN456");
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe("submission_assigned");
    expect(notifications[0].title).toContain("Assigned: Notify Project");
    expect(notifications[0].message).toContain("GADMIN123");
    expect(notifications[0].projectId).toBe("notify-project");
    expect(notifications[0].projectName).toBe("Notify Project");
  });

  it("sends notification to new assignee on reassignment", () => {
    projectSubmissionService.recordSubmission({
      projectId: "reassign-notify",
      projectName: "Reassign Notify",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });

    projectSubmissionService.assignSubmission(
      "reassign-notify",
      "GADMIN123",
      "GADMIN456",
    );

    projectSubmissionService.assignSubmission(
      "reassign-notify",
      "GADMIN123",
      "GADMIN789",
    );

    const notifications = notificationService.getForUser("GADMIN789");
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe("submission_assigned");
    expect(notifications[0].title).toContain("Reassigned: Reassign Notify");
  });

  it("filters submissions assigned to a specific admin", () => {
    projectSubmissionService.recordSubmission({
      projectId: "filter-1",
      projectName: "Filter 1",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });
    projectSubmissionService.recordSubmission({
      projectId: "filter-2",
      projectName: "Filter 2",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });
    projectSubmissionService.recordSubmission({
      projectId: "filter-3",
      projectName: "Filter 3",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });

    projectSubmissionService.assignSubmission("filter-1", "GADMIN123", "GADMIN456");
    projectSubmissionService.assignSubmission("filter-2", "GADMIN123", "GADMIN456");
    projectSubmissionService.assignSubmission("filter-3", "GADMIN123", "GADMIN789");

    const assignedTo456 = projectSubmissionService.getSubmissionsAssignedTo("GADMIN456");
    expect(assignedTo456.length).toBe(2);
    expect(assignedTo456.map((s) => s.projectId)).toEqual(
      expect.arrayContaining(["filter-1", "filter-2"]),
    );

    const assignedTo789 = projectSubmissionService.getSubmissionsAssignedTo("GADMIN789");
    expect(assignedTo789.length).toBe(1);
    expect(assignedTo789[0].projectId).toBe("filter-3");
  });

  it("filters unassigned submissions", () => {
    projectSubmissionService.recordSubmission({
      projectId: "unassigned-1",
      projectName: "Unassigned 1",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });
    projectSubmissionService.recordSubmission({
      projectId: "unassigned-2",
      projectName: "Unassigned 2",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: [],
    });

    projectSubmissionService.assignSubmission("unassigned-1", "GADMIN123", "GADMIN456");

    const unassigned = projectSubmissionService.getUnassignedSubmissions();
    expect(unassigned.length).toBe(1);
    expect(unassigned[0].projectId).toBe("unassigned-2");
  });

  it("tracks status updates with moderator and timestamp", () => {
    projectSubmissionService.recordSubmission({
      projectId: "status-project",
      projectName: "Status Project",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: ["Minor issue"],
    });

    const result = projectSubmissionService.updateStatus(
      "status-project",
      "approved",
      "GADMIN123",
      "Looks good",
    );

    expect(result.success).toBe(true);
    expect(result.submission?.status).toBe("approved");
    expect(result.submission?.statusUpdatedBy).toBe("GADMIN123");
    expect(result.submission?.statusUpdatedAt).toBeDefined();

    const log = projectSubmissionService.getModerationLog();
    expect(log.length).toBe(1);
    expect(log[0].action).toBe("approved");
    expect(log[0].moderatorAddress).toBe("GADMIN123");
    expect(log[0].reason).toBe("Looks good");
  });

  it("tracks status changes in history log", () => {
    projectSubmissionService.recordSubmission({
      projectId: "history-project",
      projectName: "History Project",
      submittedBy: "GTEST123",
      qualityScore: 80,
      flagReasons: ["Issue 1"],
    });

    projectSubmissionService.updateStatus("history-project", "flagged", "GADMIN123", "Needs more review");
    projectSubmissionService.updateStatus("history-project", "approved", "GADMIN123", "All good");

    const log = projectSubmissionService.getModerationLog();
    expect(log.length).toBe(2);
    // Most recent first
    expect(log[0].action).toBe("approved");
    expect(log[1].action).toBe("flagged");
  });
});