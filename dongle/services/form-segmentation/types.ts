/**
 * Types for Form Submission Segmentation System
 */

export type SegmentRuleOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "in"
  | "notIn"
  | "isEmpty"
  | "isNotEmpty";

export interface SegmentRule {
  field:
    | "category"
    | "primaryCategory"
    | "qualityScore"
    | "status"
    | "hasContracts"
    | "contractCount"
    | "hasAudit"
    | "hasBugBounty"
    | "tags"
    | "flagCount"
    | "country"
    | "companySize"
    | string;
  operator: SegmentRuleOperator;
  value: unknown;
}

export interface SegmentRuleGroup {
  logic: "AND" | "OR";
  rules: (SegmentRule | SegmentRuleGroup)[];
}

export interface SubmissionSegment {
  id: string;
  name: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  icon?: string;
  priority: number;
  isActive: boolean;
  isCustom: boolean;
  ruleGroup: SegmentRuleGroup;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentStats {
  segment: SubmissionSegment;
  count: number;
  percentage: number;
  averageQualityScore: number;
}

export interface SubmissionSegmentAssignment {
  submissionId: string;
  projectId: string;
  segmentIds: string[];
  evaluatedAt: string;
}
