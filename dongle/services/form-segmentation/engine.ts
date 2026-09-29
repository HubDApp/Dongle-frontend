/**
 * Rule Evaluation & Segmentation Engine
 */

import type {
  SegmentRule,
  SegmentRuleGroup,
  SubmissionSegment,
  SegmentStats,
} from "./types";
import type { ProjectSubmission, Project } from "@/types/project";
import { projectService } from "@/services/project/project.service";

/**
 * Extract a normalized field value from a submission or associated project
 */
export function extractFieldValue(
  submission: ProjectSubmission,
  field: string,
  associatedProject?: Project | null,
): unknown {
  const project =
    associatedProject ?? projectService.getProjectById(submission.projectId);

  switch (field) {
    case "category":
    case "primaryCategory":
      return project?.primaryCategory || "";

    case "qualityScore":
      return submission.qualityScore ?? 0;

    case "status":
      return submission.status || "pending";

    case "hasContracts":
      return (project?.contractAddresses?.length ?? 0) > 0;

    case "contractCount":
      return project?.contractAddresses?.length ?? 0;

    case "hasAudit":
      return Boolean(project?.auditReportUrl && project.auditReportUrl.trim().length > 0);

    case "hasBugBounty":
      return Boolean(project?.bugBountyUrl && project.bugBountyUrl.trim().length > 0);

    case "hasGithub":
      return Boolean(project?.githubUrl && project.githubUrl.trim().length > 0);

    case "hasWebsite":
      return Boolean(project?.websiteUrl && project.websiteUrl.trim().length > 0);

    case "flagCount":
      return submission.flagReasons?.length ?? 0;

    case "flags":
      return submission.flagReasons ?? [];

    case "tags":
      return project?.tags ?? [];

    case "name":
    case "projectName":
      return submission.projectName || project?.name || "";

    default:
      // Check directly on submission or project
      return (submission as any)[field] ?? (project as any)?.[field] ?? undefined;
  }
}

/**
 * Evaluate a single rule against a submission
 */
export function evaluateRule(
  submission: ProjectSubmission,
  rule: SegmentRule,
  associatedProject?: Project | null,
): boolean {
  const actual = extractFieldValue(submission, rule.field, associatedProject);
  const expected = rule.value;

  switch (rule.operator) {
    case "equals":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.trim().toLowerCase() === expected.trim().toLowerCase();
      }
      return actual === expected;

    case "notEquals":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.trim().toLowerCase() !== expected.trim().toLowerCase();
      }
      return actual !== expected;

    case "contains":
      if (Array.isArray(actual)) {
        return actual.some((item) =>
          String(item).toLowerCase().includes(String(expected).toLowerCase()),
        );
      }
      if (typeof actual === "string") {
        return actual.toLowerCase().includes(String(expected).toLowerCase());
      }
      return false;

    case "notContains":
      if (Array.isArray(actual)) {
        return !actual.some((item) =>
          String(item).toLowerCase().includes(String(expected).toLowerCase()),
        );
      }
      if (typeof actual === "string") {
        return !actual.toLowerCase().includes(String(expected).toLowerCase());
      }
      return true;

    case "greaterThan":
      return Number(actual) > Number(expected);

    case "greaterThanOrEqual":
      return Number(actual) >= Number(expected);

    case "lessThan":
      return Number(actual) < Number(expected);

    case "lessThanOrEqual":
      return Number(actual) <= Number(expected);

    case "in":
      if (Array.isArray(expected)) {
        return expected.some(
          (e) => String(e).toLowerCase() === String(actual).toLowerCase(),
        );
      }
      return false;

    case "notIn":
      if (Array.isArray(expected)) {
        return !expected.some(
          (e) => String(e).toLowerCase() === String(actual).toLowerCase(),
        );
      }
      return true;

    case "isEmpty":
      if (actual === undefined || actual === null || actual === "") return true;
      if (Array.isArray(actual) && actual.length === 0) return true;
      return false;

    case "isNotEmpty":
      if (actual === undefined || actual === null || actual === "") return false;
      if (Array.isArray(actual) && actual.length === 0) return false;
      return true;

    default:
      return false;
  }
}

/**
 * Recursively evaluate a rule group
 */
export function evaluateRuleGroup(
  submission: ProjectSubmission,
  group: SegmentRuleGroup,
  associatedProject?: Project | null,
): boolean {
  if (!group.rules || group.rules.length === 0) {
    return true;
  }

  if (group.logic === "AND") {
    return group.rules.every((ruleOrSubgroup) => {
      if ("logic" in ruleOrSubgroup) {
        return evaluateRuleGroup(submission, ruleOrSubgroup as SegmentRuleGroup, associatedProject);
      }
      return evaluateRule(submission, ruleOrSubgroup as SegmentRule, associatedProject);
    });
  }

  // Logic: OR
  return group.rules.some((ruleOrSubgroup) => {
    if ("logic" in ruleOrSubgroup) {
      return evaluateRuleGroup(submission, ruleOrSubgroup as SegmentRuleGroup, associatedProject);
    }
    return evaluateRule(submission, ruleOrSubgroup as SegmentRule, associatedProject);
  });
}

/**
 * Assign matching segments to a submission
 */
export function assignSegmentsToSubmission(
  submission: ProjectSubmission,
  segments: SubmissionSegment[],
  associatedProject?: Project | null,
): SubmissionSegment[] {
  const activeSegments = segments.filter((s) => s.isActive);
  const matched: SubmissionSegment[] = [];

  for (const segment of activeSegments) {
    if (evaluateRuleGroup(submission, segment.ruleGroup, associatedProject)) {
      matched.push(segment);
    }
  }

  // Sort by priority ascending (1 is top priority)
  matched.sort((a, b) => a.priority - b.priority);
  return matched;
}

/**
 * Compute aggregate metrics and counts for all segments
 */
export function computeSegmentStats(
  submissions: ProjectSubmission[],
  segments: SubmissionSegment[],
): SegmentStats[] {
  const total = submissions.length;

  return segments.map((segment) => {
    const matching = submissions.filter((sub) =>
      evaluateRuleGroup(sub, segment.ruleGroup),
    );
    const count = matching.length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const avgScore =
      count > 0
        ? Math.round(
            matching.reduce((acc, curr) => acc + (curr.qualityScore || 0), 0) /
              count,
          )
        : 0;

    return {
      segment,
      count,
      percentage,
      averageQualityScore: avgScore,
    };
  });
}
