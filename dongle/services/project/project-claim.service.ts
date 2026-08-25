import { generateId } from "@/lib/id-generator";
import { projectService } from "./project.service";
import { projectOwnerService } from "./project-owner.service";
import { auditLogService } from "@/services/audit/audit-log.service";
import { notificationService } from "@/services/notification/notification.service";
import {
  ClaimProofType,
  ProjectClaimRequest,
  ProjectClaimRequestStatus,
  ProjectClaimRequestValidationError,
  PROJECT_CLAIM_CONSTRAINTS,
} from "@/types/project";

const STORAGE_KEY_CLAIMS = "dongle_project_claim_requests";

function validateClaim(
  projectId: string,
  proofType: string,
  proofValue: string,
  explanation: string
): ProjectClaimRequestValidationError[] {
  const errors: ProjectClaimRequestValidationError[] = [];

  if (!projectService.getProjectById(projectId)) {
    errors.push({ field: "projectId", message: "Project not found" });
  }

  const validProofTypes: ClaimProofType[] = ["website", "repository", "admin_review"];
  if (!validProofTypes.includes(proofType as ClaimProofType)) {
    errors.push({ field: "proofType", message: "Please select a valid proof type" });
  }

  if (!proofValue.trim()) {
    errors.push({ field: "proofValue", message: "Proof details are required" });
  }

  if (explanation.length > PROJECT_CLAIM_CONSTRAINTS.EXPLANATION_MAX_LENGTH) {
    errors.push({
      field: "explanation",
      message: `Explanation cannot exceed ${PROJECT_CLAIM_CONSTRAINTS.EXPLANATION_MAX_LENGTH} characters`,
    });
  }

  return errors;
}

export const projectClaimService = {
  getRequests(): ProjectClaimRequest[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_CLAIMS);
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

    const requests: ProjectClaimRequest[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;

      if (typeof record.id !== "string" || !record.id) continue;
      if (typeof record.projectId !== "string" || !record.projectId) continue;
      if (typeof record.requestedBy !== "string" || !record.requestedBy) continue;
      if (typeof record.proofType !== "string") continue;
      if (typeof record.proofValue !== "string") continue;
      if (typeof record.explanation !== "string") continue;
      if (typeof record.status !== "string") continue;
      if (typeof record.createdAt !== "string") continue;

      requests.push({
        id: record.id,
        projectId: record.projectId,
        requestedBy: record.requestedBy,
        proofType: record.proofType as ClaimProofType,
        proofValue: record.proofValue,
        explanation: record.explanation,
        status: record.status as ProjectClaimRequestStatus,
        createdAt: record.createdAt,
        reviewedAt: typeof record.reviewedAt === "string" ? record.reviewedAt : undefined,
        reviewedBy: typeof record.reviewedBy === "string" ? record.reviewedBy : undefined,
        reviewNote: typeof record.reviewNote === "string" ? record.reviewNote : undefined,
      });
    }

    return requests;
  },

  getRequestById(id: string): ProjectClaimRequest | null {
    return this.getRequests().find((request) => request.id === id) ?? null;
  },

  getRequestsByProject(projectId: string): ProjectClaimRequest[] {
    return this.getRequests().filter((request) => request.projectId === projectId);
  },

  /** Return the most recent pending/reviewed claim for a given user + project. */
  getLatestRequestForUser(projectId: string, userAddress: string): ProjectClaimRequest | null {
    const all = this.getRequests().filter(
      (r) => r.projectId === projectId && r.requestedBy === userAddress
    );
    if (all.length === 0) return null;
    return all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  },

  getPendingRequests(): ProjectClaimRequest[] {
    return this.getRequests().filter((request) => request.status === "pending");
  },

  hasPendingRequest(projectId: string, userAddress: string): boolean {
    return this.getRequests().some(
      (request) =>
        request.projectId === projectId &&
        request.requestedBy === userAddress &&
        request.status === "pending"
    );
  },

  /**
   * Create a new claim request, then:
   * 1. Write a `claim_submitted` audit log entry.
   * 2. Send a `claim_received` notification to the claimant.
   */
  createRequest(
    data: {
      projectId: string;
      proofType: string;
      proofValue: string;
      explanation: string;
    },
    requestedBy: string
  ): { success: boolean; data?: ProjectClaimRequest; errors?: ProjectClaimRequestValidationError[] } {
    const validationErrors = validateClaim(
      data.projectId,
      data.proofType,
      data.proofValue,
      data.explanation
    );
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const project = projectService.getProjectById(data.projectId);
    if (!project) {
      return { success: false, errors: [{ field: "projectId", message: "Project not found" }] };
    }

    const existingOwner = project.ownerAddress?.trim();
    if (existingOwner && existingOwner === requestedBy) {
      return {
        success: false,
        errors: [{ field: "projectId", message: "You already own this project" }],
      };
    }

    if (this.hasPendingRequest(data.projectId, requestedBy)) {
      return {
        success: false,
        errors: [
          {
            field: "proofType",
            message: "You already have a pending claim request for this project",
          },
        ],
      };
    }

    const request: ProjectClaimRequest = {
      id: generateId(),
      projectId: data.projectId,
      requestedBy,
      proofType: data.proofType as ClaimProofType,
      proofValue: data.proofValue.trim(),
      explanation: data.explanation.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const requests = this.getRequests();
    localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify([request, ...requests]));

    // ── Side-effects ──────────────────────────────────────────────────────────

    // 1. Audit trail
    auditLogService.append({
      actor: requestedBy,
      action: "claim_submitted",
      targetId: request.id,
      targetLabel: project.name,
      metadata: { projectId: project.id, proofType: request.proofType },
    });

    // 2. Confirmation notification to the claimant
    notificationService.create({
      recipientAddress: requestedBy,
      type: "claim_received",
      title: `Claim submitted for ${project.name}`,
      message:
        "Your ownership claim has been received and is pending admin review. " +
        "You'll be notified here once a decision is made.",
      claimRequestId: request.id,
      projectId: project.id,
      projectName: project.name,
    });

    return { success: true, data: request };
  },

  /**
   * Approve a pending claim request, then:
   * 1. Transfer ownership via projectOwnerService.
   * 2. Write `claim_approved` + `ownership_transferred` audit log entries.
   * 3. Send a `claim_approved` notification to the claimant.
   */
  approveRequest(
    requestId: string,
    reviewedBy: string,
    reviewNote?: string
  ): { success: boolean; error?: string } {
    const requests = this.getRequests();
    const index = requests.findIndex((request) => request.id === requestId);
    if (index === -1) {
      return { success: false, error: "Claim request not found" };
    }

    if (requests[index].status !== "pending") {
      return { success: false, error: "Claim request has already been reviewed" };
    }

    const trimmedNote = reviewNote?.trim() || undefined;

    requests[index] = {
      ...requests[index],
      status: "approved",
      reviewedAt: new Date().toISOString(),
      reviewedBy,
      reviewNote: trimmedNote,
    };
    localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(requests));

    const claimRequest = requests[index];
    const project = projectService.getProjectById(claimRequest.projectId);
    const projectName = project?.name ?? claimRequest.projectId;

    // 1. Transfer ownership
    projectOwnerService.setProjectOwnerOverride(claimRequest.projectId, claimRequest.requestedBy);

    // 2. Audit trail — approval
    auditLogService.append({
      actor: reviewedBy,
      action: "claim_approved",
      targetId: requestId,
      targetLabel: projectName,
      reason: trimmedNote,
      metadata: {
        projectId: claimRequest.projectId,
        newOwner: claimRequest.requestedBy,
      },
    });

    // 3. Audit trail — ownership transfer
    auditLogService.append({
      actor: reviewedBy,
      action: "ownership_transferred",
      targetId: claimRequest.projectId,
      targetLabel: projectName,
      metadata: {
        claimRequestId: requestId,
        newOwner: claimRequest.requestedBy,
        previousOwner: project?.ownerAddress ?? "",
      },
    });

    // 4. Notification to the claimant
    notificationService.create({
      recipientAddress: claimRequest.requestedBy,
      type: "claim_approved",
      title: `Your claim for ${projectName} was approved`,
      message: trimmedNote
        ? `Admin note: ${trimmedNote}`
        : "Ownership has been transferred to your wallet.",
      claimRequestId: requestId,
      projectId: claimRequest.projectId,
      projectName,
    });

    return { success: true };
  },

  /**
   * Reject a pending claim request, then:
   * 1. Write a `claim_rejected` audit log entry.
   * 2. Send a `claim_rejected` notification to the claimant with the reason.
   */
  rejectRequest(
    requestId: string,
    reviewedBy: string,
    reviewNote?: string
  ): { success: boolean; error?: string } {
    const requests = this.getRequests();
    const index = requests.findIndex((request) => request.id === requestId);
    if (index === -1) {
      return { success: false, error: "Claim request not found" };
    }

    if (requests[index].status !== "pending") {
      return { success: false, error: "Claim request has already been reviewed" };
    }

    const trimmedNote = reviewNote?.trim() || undefined;

    requests[index] = {
      ...requests[index],
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy,
      reviewNote: trimmedNote,
    };
    localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(requests));

    const claimRequest = requests[index];
    const project = projectService.getProjectById(claimRequest.projectId);
    const projectName = project?.name ?? claimRequest.projectId;

    // 1. Audit trail
    auditLogService.append({
      actor: reviewedBy,
      action: "claim_rejected",
      targetId: requestId,
      targetLabel: projectName,
      reason: trimmedNote,
      metadata: { projectId: claimRequest.projectId },
    });

    // 2. Notification to the claimant
    notificationService.create({
      recipientAddress: claimRequest.requestedBy,
      type: "claim_rejected",
      title: `Your claim for ${projectName} was not approved`,
      message: trimmedNote
        ? `Reason: ${trimmedNote}`
        : "The admin did not approve this ownership claim.",
      claimRequestId: requestId,
      projectId: claimRequest.projectId,
      projectName,
    });

    return { success: true };
  },
};
