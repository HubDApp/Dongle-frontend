import { generateId } from "@/lib/id-generator";
import { projectService } from "./project.service";
import { projectOwnerService } from "./project-owner.service";
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

  getPendingRequests(): ProjectClaimRequest[] {
    return this.getRequests().filter((request) => request.status === "pending");
  },

  hasPendingRequest(projectId: string, userAddress: string): boolean {
    return this.getRequests().some(
      (request) => request.projectId === projectId && request.requestedBy === userAddress && request.status === "pending"
    );
  },

  createRequest(
    data: {
      projectId: string;
      proofType: string;
      proofValue: string;
      explanation: string;
    },
    requestedBy: string
  ): { success: boolean; data?: ProjectClaimRequest; errors?: ProjectClaimRequestValidationError[] } {
    const validationErrors = validateClaim(data.projectId, data.proofType, data.proofValue, data.explanation);
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
        errors: [{ field: "proofType", message: "You already have a pending claim request for this project" }],
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

    return { success: true, data: request };
  },

  approveRequest(requestId: string, reviewedBy: string, reviewNote?: string): { success: boolean; error?: string } {
    const requests = this.getRequests();
    const index = requests.findIndex((request) => request.id === requestId);
    if (index === -1) {
      return { success: false, error: "Claim request not found" };
    }

    if (requests[index].status !== "pending") {
      return { success: false, error: "Claim request has already been reviewed" };
    }

    requests[index] = {
      ...requests[index],
      status: "approved",
      reviewedAt: new Date().toISOString(),
      reviewedBy,
      reviewNote: reviewNote?.trim() || undefined,
    };
    localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(requests));

    const project = projectService.getProjectById(requests[index].projectId);
    if (project) {
      const ownerAddress = requests[index].requestedBy;
      projectOwnerService.setProjectOwnerOverride(project.id, ownerAddress);
    }

    return { success: true };
  },

  rejectRequest(requestId: string, reviewedBy: string, reviewNote?: string): { success: boolean; error?: string } {
    const requests = this.getRequests();
    const index = requests.findIndex((request) => request.id === requestId);
    if (index === -1) {
      return { success: false, error: "Claim request not found" };
    }

    if (requests[index].status !== "pending") {
      return { success: false, error: "Claim request has already been reviewed" };
    }

    requests[index] = {
      ...requests[index],
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy,
      reviewNote: reviewNote?.trim() || undefined,
    };
    localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(requests));

    return { success: true };
  },
};
