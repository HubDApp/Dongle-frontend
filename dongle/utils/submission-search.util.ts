import type { ProjectSubmission, ProjectSubmissionModerationStatus } from "@/types/project";
import { downloadCsv } from "@/utils/csv-export.util";

export interface SubmissionSearchFilters {
  query: string;
  status: ProjectSubmissionModerationStatus | "all";
  submittedFrom?: string;
  submittedTo?: string;
  qualityScoreMin?: number;
  qualityScoreMax?: number;
  flaggedOnly: boolean;
}

export const DEFAULT_SUBMISSION_FILTERS: SubmissionSearchFilters = {
  query: "",
  status: "all",
  submittedFrom: undefined,
  submittedTo: undefined,
  qualityScoreMin: undefined,
  qualityScoreMax: undefined,
  flaggedOnly: false,
};

function withinDateRange(isoDate: string, from?: string, to?: string): boolean {
  const time = new Date(isoDate).getTime();
  if (from && time < new Date(from).getTime()) return false;
  if (to && time > new Date(to).getTime()) return false;
  return true;
}

export function applySubmissionFilters(
  submissions: ProjectSubmission[],
  filters: SubmissionSearchFilters,
): ProjectSubmission[] {
  let result = [...submissions];

  if (filters.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.projectName.toLowerCase().includes(q) ||
        s.projectId.toLowerCase().includes(q) ||
        s.submittedBy.toLowerCase().includes(q) ||
        s.flagReasons.some((f) => f.toLowerCase().includes(q)) ||
        (s.rejectionReason && s.rejectionReason.toLowerCase().includes(q)),
    );
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter((s) => s.status === filters.status);
  }

  if (filters.flaggedOnly) {
    result = result.filter((s) => s.status === "flagged");
  }

  if (filters.submittedFrom || filters.submittedTo) {
    result = result.filter((s) =>
      withinDateRange(s.submittedAt, filters.submittedFrom, filters.submittedTo),
    );
  }

  if (filters.qualityScoreMin !== undefined) {
    result = result.filter((s) => s.qualityScore >= filters.qualityScoreMin!);
  }

  if (filters.qualityScoreMax !== undefined) {
    result = result.filter((s) => s.qualityScore <= filters.qualityScoreMax!);
  }

  return result;
}

function escapeCsvValue(value: string | number | undefined): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSubmissionsToCsv(submissions: ProjectSubmission[]): string {
  const headers = [
    "id",
    "projectId",
    "projectName",
    "submittedBy",
    "submittedAt",
    "status",
    "qualityScore",
    "flagReasons",
    "statusUpdatedAt",
    "statusUpdatedBy",
    "rejectionReason",
  ];

  const rows = submissions.map((s) =>
    [
      s.id,
      s.projectId,
      s.projectName,
      s.submittedBy,
      s.submittedAt,
      s.status,
      s.qualityScore,
      s.flagReasons.join("; "),
      s.statusUpdatedAt ?? "",
      s.statusUpdatedBy ?? "",
      s.rejectionReason ?? "",
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
