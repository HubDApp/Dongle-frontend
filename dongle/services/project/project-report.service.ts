import { generateId } from "@/lib/id-generator";
import { nowUTC } from "@/lib/date";
import { projectService } from "./project.service";
import {
  ProjectModerationAction,
  ProjectReport,
  ProjectReportReason,
  ProjectReportStatus,
  ProjectReportValidationError,
  PROJECT_REPORT_CONSTRAINTS,
} from "@/types/project";

const STORAGE_KEY_REPORTS = "dongle_project_reports";
const STORAGE_KEY_MODERATION_LOG = "dongle_project_moderation_log";

function validateReport(
  reason: string,
  explanation: string
): ProjectReportValidationError[] {
  const errors: ProjectReportValidationError[] = [];

  const validReasons: ProjectReportReason[] = [
    "phishing",
    "impersonation",
    "broken_links",
    "fraud",
    "inappropriate",
  ];

  if (!validReasons.includes(reason as ProjectReportReason)) {
    errors.push({
      field: "reason",
      message: "Please select a valid reason for reporting",
    });
  }

  if (explanation.length > PROJECT_REPORT_CONSTRAINTS.EXPLANATION_MAX_LENGTH) {
    errors.push({
      field: "explanation",
      message: `Explanation cannot exceed ${PROJECT_REPORT_CONSTRAINTS.EXPLANATION_MAX_LENGTH} characters`,
    });
  }

  return errors;
}

export const projectReportService = {
  getReports(): ProjectReport[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!stored) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validatedReports: ProjectReport[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;

      const record = item as Record<string, unknown>;

      if (typeof record.id !== "string" || !record.id) continue;
      if (typeof record.projectId !== "string" || !record.projectId) continue;
      if (typeof record.reporterAddress !== "string" || !record.reporterAddress) continue;
      if (typeof record.reason !== "string") continue;
      if (typeof record.explanation !== "string") continue;
      if (typeof record.status !== "string") continue;
      if (typeof record.createdAt !== "string") continue;

      validatedReports.push({
        id: record.id,
        projectId: record.projectId,
        reporterAddress: record.reporterAddress,
        reason: record.reason as ProjectReportReason,
        explanation: record.explanation,
        status: record.status as ProjectReportStatus,
        createdAt: record.createdAt,
      });
    }

    return validatedReports;
  },

  getReportById(id: string): ProjectReport | null {
    return this.getReports().find((report) => report.id === id) ?? null;
  },

  getReportsByProject(projectId: string): ProjectReport[] {
    return this.getReports().filter((report) => report.projectId === projectId);
  },

  getReportsByReporter(reporterAddress: string): ProjectReport[] {
    return this.getReports().filter((report) => report.reporterAddress === reporterAddress);
  },

  getPendingReports(): ProjectReport[] {
    return this.getReports().filter((report) => report.status === "pending");
  },

  hasUserReportedProject(projectId: string, userAddress: string): boolean {
    return this.getReports().some(
      (report) => report.projectId === projectId && report.reporterAddress === userAddress
    );
  },

  createReport(
    data: {
      projectId: string;
      reason: string;
      explanation: string;
    },
    reporterAddress: string
  ): {
    success: boolean;
    data?: ProjectReport;
    errors?: ProjectReportValidationError[];
  } {
    const validationErrors = validateReport(data.reason, data.explanation);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const project = projectService.getProjectById(data.projectId);
    if (!project) {
      return {
        success: false,
        errors: [{ field: "reason", message: "Project not found" }],
      };
    }

    if (project.ownerAddress && project.ownerAddress === reporterAddress) {
      return {
        success: false,
        errors: [{ field: "reason", message: "You cannot report your own project" }],
      };
    }

    if (this.hasUserReportedProject(data.projectId, reporterAddress)) {
      return {
        success: false,
        errors: [{ field: "reason", message: "You have already reported this project" }],
      };
    }

    const newReport: ProjectReport = {
      id: generateId(),
      projectId: data.projectId,
      reporterAddress,
      reason: data.reason as ProjectReportReason,
      explanation: data.explanation,
      status: "pending",
      createdAt: nowUTC(),
    };

    const reports = this.getReports();
    const updatedReports = [newReport, ...reports];
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updatedReports));

    return { success: true, data: newReport };
  },

  resolveReport(
    reportId: string,
    moderatorAddress: string,
    reason: string
  ): { success: boolean; error?: string } {
    const reports = this.getReports();
    const index = reports.findIndex((report) => report.id === reportId);

    if (index === -1) {
      return { success: false, error: "Report not found" };
    }

    if (reports[index].status !== "pending") {
      return { success: false, error: "Report has already been moderated" };
    }

    reports[index] = {
      ...reports[index],
      status: "resolved",
    };
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));

    const action: ProjectModerationAction = {
      id: generateId(),
      reportId,
      moderatorAddress,
      action: "resolved",
      reason,
      timestamp: nowUTC(),
    };

    const log = this.getModerationLog();
    const updatedLog = [...log, action];
    localStorage.setItem(STORAGE_KEY_MODERATION_LOG, JSON.stringify(updatedLog));

    return { success: true };
  },

  dismissReport(
    reportId: string,
    moderatorAddress: string,
    reason: string
  ): { success: boolean; error?: string } {
    const reports = this.getReports();
    const index = reports.findIndex((report) => report.id === reportId);

    if (index === -1) {
      return { success: false, error: "Report not found" };
    }

    if (reports[index].status !== "pending") {
      return { success: false, error: "Report has already been moderated" };
    }

    reports[index] = {
      ...reports[index],
      status: "dismissed",
    };
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));

    const action: ProjectModerationAction = {
      id: generateId(),
      reportId,
      moderatorAddress,
      action: "dismissed",
      reason,
      timestamp: nowUTC(),
    };

    const log = this.getModerationLog();
    const updatedLog = [...log, action];
    localStorage.setItem(STORAGE_KEY_MODERATION_LOG, JSON.stringify(updatedLog));

    return { success: true };
  },

  getModerationLog(): ProjectModerationAction[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_MODERATION_LOG);
    if (!stored) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validatedActions: ProjectModerationAction[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;

      const record = item as Record<string, unknown>;

      if (typeof record.id !== "string" || !record.id) continue;
      if (typeof record.reportId !== "string" || !record.reportId) continue;
      if (typeof record.moderatorAddress !== "string" || !record.moderatorAddress) continue;
      if (typeof record.action !== "string") continue;
      if (typeof record.reason !== "string") continue;
      if (typeof record.timestamp !== "string") continue;

      validatedActions.push({
        id: record.id,
        reportId: record.reportId,
        moderatorAddress: record.moderatorAddress,
        action: record.action as ProjectModerationAction["action"],
        reason: record.reason,
        timestamp: record.timestamp,
      });
    }

    return validatedActions;
  },

  getModerationLogByReport(reportId: string): ProjectModerationAction[] {
    return this.getModerationLog().filter((action) => action.reportId === reportId);
  },
};
