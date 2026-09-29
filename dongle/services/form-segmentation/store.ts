/**
 * Persistent Storage for Submission Segments & Custom Rules
 */

import { generateId } from "@/lib/id-generator";
import { nowUTC } from "@/lib/date";
import { DEFAULT_SEGMENTS } from "./default-segments";
import type { SubmissionSegment, SubmissionSegmentAssignment } from "./types";
import type { ProjectSubmission } from "@/types/project";
import { assignSegmentsToSubmission } from "./engine";

const CUSTOM_SEGMENTS_STORAGE_KEY = "dongle_custom_submission_segments";
const SEGMENT_ASSIGNMENTS_STORAGE_KEY = "dongle_submission_segment_assignments";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Load all segments (default + active custom segments)
 */
export function getAllSegments(): SubmissionSegment[] {
  if (!isBrowser()) return DEFAULT_SEGMENTS;

  try {
    const raw = localStorage.getItem(CUSTOM_SEGMENTS_STORAGE_KEY);
    if (!raw) return DEFAULT_SEGMENTS;
    const customSegments: SubmissionSegment[] = JSON.parse(raw);
    if (!Array.isArray(customSegments)) return DEFAULT_SEGMENTS;

    return [...DEFAULT_SEGMENTS, ...customSegments];
  } catch {
    return DEFAULT_SEGMENTS;
  }
}

/**
 * Save a custom segment (create or update)
 */
export function saveCustomSegment(
  segment: Omit<SubmissionSegment, "id" | "createdAt" | "updatedAt" | "isCustom"> & {
    id?: string;
  },
): SubmissionSegment {
  if (!isBrowser()) {
    throw new Error("Cannot save custom segment in non-browser environment");
  }

  const all = getAllSegments();
  const customOnly = all.filter((s) => s.isCustom);

  const isEditing = Boolean(segment.id && customOnly.some((s) => s.id === segment.id));
  const id = isEditing && segment.id ? segment.id : `seg_custom_${generateId()}`;
  const now = nowUTC();

  const savedSegment: SubmissionSegment = {
    ...segment,
    id,
    isCustom: true,
    createdAt: isEditing
      ? customOnly.find((s) => s.id === id)?.createdAt || now
      : now,
    updatedAt: now,
  };

  const updatedCustom = isEditing
    ? customOnly.map((s) => (s.id === id ? savedSegment : s))
    : [...customOnly, savedSegment];

  localStorage.setItem(CUSTOM_SEGMENTS_STORAGE_KEY, JSON.stringify(updatedCustom));
  return savedSegment;
}

/**
 * Delete a custom segment
 */
export function deleteCustomSegment(segmentId: string): boolean {
  if (!isBrowser()) return false;

  const all = getAllSegments();
  const customOnly = all.filter((s) => s.isCustom && s.id !== segmentId);
  localStorage.setItem(CUSTOM_SEGMENTS_STORAGE_KEY, JSON.stringify(customOnly));
  return true;
}

/**
 * Load cached segment assignments
 */
export function loadSegmentAssignments(): Record<string, string[]> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(SEGMENT_ASSIGNMENTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Auto-assign and save segments for a submission
 */
export function autoAssignSegments(
  submission: ProjectSubmission,
): string[] {
  const segments = getAllSegments();
  const matched = assignSegmentsToSubmission(submission, segments);
  const matchedIds = matched.map((s) => s.id);

  if (isBrowser()) {
    try {
      const assignments = loadSegmentAssignments();
      assignments[submission.projectId] = matchedIds;
      localStorage.setItem(
        SEGMENT_ASSIGNMENTS_STORAGE_KEY,
        JSON.stringify(assignments),
      );
    } catch (error) {
      console.error("[SegmentationStore] Failed to save segment assignments:", error);
    }
  }

  return matchedIds;
}

/**
 * Get assigned segments for a project ID
 */
export function getSegmentsForProject(
  projectId: string,
  submission?: ProjectSubmission,
): SubmissionSegment[] {
  const allSegments = getAllSegments();
  const assignments = loadSegmentAssignments();
  let assignedIds = assignments[projectId];

  if (!assignedIds && submission) {
    assignedIds = autoAssignSegments(submission);
  }

  if (!assignedIds) return [];
  const idSet = new Set(assignedIds);
  return allSegments.filter((s) => idSet.has(s.id));
}
