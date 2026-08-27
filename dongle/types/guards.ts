/**
 * Type guards and narrowing utilities for the application's union types.
 *
 * Every guard uses the `x is T` predicate so TypeScript can narrow
 * automatically inside `if` / `switch` blocks.
 */

import type { VerificationStatus } from "@/components/projects/VerificationBadge";
import type {
  ProjectClaimRequestStatus,
  ProjectReportStatus,
  ProjectSubmissionModerationStatus,
} from "./project";
import type { ReviewReportStatus } from "./review";

// ─── VerificationStatus ─────────────────────────────────────────────────────

const VERIFICATION_STATUSES = new Set<string>([
  "NONE",
  "PENDING",
  "VERIFIED",
  "REJECTED",
]);

export function isVerificationStatus(value: string): value is VerificationStatus {
  return VERIFICATION_STATUSES.has(value);
}

// ─── ProjectClaimRequestStatus ───────────────────────────────────────────────

const CLAIM_STATUSES = new Set<string>(["pending", "approved", "rejected"]);

export function isProjectClaimRequestStatus(
  value: string,
): value is ProjectClaimRequestStatus {
  return CLAIM_STATUSES.has(value);
}

// ─── ProjectReportStatus ────────────────────────────────────────────────────

const REPORT_STATUSES = new Set<string>(["pending", "resolved", "dismissed"]);

export function isProjectReportStatus(
  value: string,
): value is ProjectReportStatus {
  return REPORT_STATUSES.has(value);
}

// ─── ReviewReportStatus ─────────────────────────────────────────────────────

export function isReviewReportStatus(
  value: string,
): value is ReviewReportStatus {
  return REPORT_STATUSES.has(value);
}

// ─── ProjectSubmissionModerationStatus ───────────────────────────────────────

const SUBMISSION_STATUSES = new Set<string>([
  "pending",
  "approved",
  "rejected",
  "flagged",
]);

export function isProjectSubmissionModerationStatus(
  value: string,
): value is ProjectSubmissionModerationStatus {
  return SUBMISSION_STATUSES.has(value);
}

// ─── Error type narrowing ────────────────────────────────────────────────────

/** Shape of errors with a numeric `code` (e.g. HTTP or OS errors). */
interface CodedError {
  code: number;
}

/** Shape of errors with a string `name` property. */
interface NamedError {
  name: string;
}

export function hasCode(error: unknown): error is CodedError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as CodedError).code === "number"
  );
}

export function hasName(error: unknown): error is NamedError {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof (error as NamedError).name === "string"
  );
}

export function isAbortError(error: unknown): boolean {
  return hasName(error) && error.name === "AbortError";
}

export function isNotFoundError(error: unknown): boolean {
  if (hasCode(error) && error.code === 404) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("not found") || msg.includes("404");
  }
  return false;
}
