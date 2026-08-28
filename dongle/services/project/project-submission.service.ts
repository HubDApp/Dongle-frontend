import { generateId } from "@/lib/id-generator";
import { nowUTC } from "@/lib/date";
import {
  ProjectSubmission,
  ProjectSubmissionModerationAction,
  ProjectSubmissionModerationStatus,
} from "@/types/project";

const STORAGE_KEY = "dongle_project_submissions";
const MODERATION_LOG_KEY = "dongle_submission_moderation_log";

function loadSubmissions(): ProjectSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ProjectSubmission =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.projectId === "string" &&
        typeof item.status === "string",
    );
  } catch {
    return [];
  }
}

function saveSubmissions(submissions: ProjectSubmission[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

function loadModerationLog(): ProjectSubmissionModerationAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MODERATION_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveModerationLog(log: ProjectSubmissionModerationAction[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODERATION_LOG_KEY, JSON.stringify(log));
}

function deriveInitialStatus(
  flagReasons: string[],
): ProjectSubmissionModerationStatus {
  if (flagReasons.length >= 2) return "flagged";
  if (flagReasons.length === 1) return "pending";
  return "approved";
}

export const projectSubmissionService = {
  recordSubmission(input: {
    projectId: string;
    projectName: string;
    submittedBy: string;
    qualityScore: number;
    flagReasons: string[];
  }): ProjectSubmission {
    const submissions = loadSubmissions();
    const existing = submissions.find((s) => s.projectId === input.projectId);

    const status = deriveInitialStatus(input.flagReasons);
    const submission: ProjectSubmission = {
      id: existing?.id ?? generateId(),
      projectId: input.projectId,
      projectName: input.projectName,
      submittedBy: input.submittedBy,
      submittedAt: existing?.submittedAt ?? nowUTC(),
      status,
      qualityScore: input.qualityScore,
      flagReasons: input.flagReasons,
      statusUpdatedAt: nowUTC(),
    };

    const index = submissions.findIndex((s) => s.projectId === input.projectId);
    if (index >= 0) {
      submissions[index] = submission;
    } else {
      submissions.push(submission);
    }
    saveSubmissions(submissions);
    return submission;
  },

  getSubmissionByProjectId(projectId: string): ProjectSubmission | null {
    return loadSubmissions().find((s) => s.projectId === projectId) ?? null;
  },

  getSubmissionsByUser(submittedBy: string): ProjectSubmission[] {
    return loadSubmissions()
      .filter((s) => s.submittedBy === submittedBy)
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
  },

  getAllSubmissions(): ProjectSubmission[] {
    return loadSubmissions().sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  },

  getQueue(): ProjectSubmission[] {
    return loadSubmissions()
      .filter((s) => s.status === "pending" || s.status === "flagged")
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
  },

  isDiscoverable(projectId: string): boolean {
    const submission = this.getSubmissionByProjectId(projectId);
    if (!submission) return true;
    return submission.status === "approved";
  },

  updateStatus(
    projectId: string,
    status: ProjectSubmissionModerationStatus,
    moderatorAddress: string,
    reason?: string,
  ): { success: boolean; error?: string; submission?: ProjectSubmission } {
    const submissions = loadSubmissions();
    const index = submissions.findIndex((s) => s.projectId === projectId);
    if (index < 0) {
      return { success: false, error: "Submission not found" };
    }

    const submission = submissions[index];
    submission.status = status;
    submission.statusUpdatedAt = nowUTC();
    submission.statusUpdatedBy = moderatorAddress;
    if (reason) {
      submission.rejectionReason = reason;
    }

    submissions[index] = submission;
    saveSubmissions(submissions);

    const log = loadModerationLog();
    log.unshift({
      id: generateId(),
      submissionId: submission.id,
      projectId,
      moderatorAddress,
      action: status,
      reason: reason ?? `Status updated to ${status}`,
      timestamp: nowUTC(),
    });
    saveModerationLog(log);

    return { success: true, submission };
  },

  getModerationLog(): ProjectSubmissionModerationAction[] {
    return loadModerationLog();
  },
};
