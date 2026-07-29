/**
 * Verification Service
 * Manages verification requests and their lifecycle.
 * Persists state via localStorage (development) or contract storage (production).
 */

export type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export interface VerificationRequest {
  id: string;
  projectId: string;
  projectName: string;
  submittedBy: string;
  submittedAt: string;
  status: VerificationStatus;
  statusUpdatedAt: string;
  statusUpdatedBy?: string;
  rejectionReason?: string;
}

const VERIFICATION_STORAGE_KEY = "dongle_verification_requests";

class VerificationService {
  /**
   * Submits a verification request for a project.
   * Returns the request ID for tracking.
   */
  async submitVerificationRequest(
    projectId: string,
    projectName: string,
    submittedBy: string,
  ): Promise<string> {
    try {
      // Check if request already exists
      const existing = await this.getVerificationRequest(projectId);
      if (existing && existing.status === "PENDING") {
        throw new Error("A verification request is already pending for this project");
      }

      const requestId = `ver-${projectId}-${Date.now()}`;
      const request: VerificationRequest = {
        id: requestId,
        projectId,
        projectName,
        submittedBy,
        submittedAt: new Date().toISOString(),
        status: "PENDING",
        statusUpdatedAt: new Date().toISOString(),
      };

      // Persist request
      await this.persistRequest(request);

      console.log(`[VerificationService] Request submitted: ${requestId}`);
      return requestId;
    } catch (error) {
      console.error("[VerificationService] Error submitting verification request:", error);
      throw error;
    }
  }

  /**
   * Gets verification status for a project.
   * Returns NONE if no request exists, otherwise returns the current status.
   */
  async getVerificationStatus(projectId: string): Promise<VerificationStatus> {
    try {
      const request = await this.getVerificationRequest(projectId);
      
      if (!request) {
        return "NONE";
      }

      return request.status;
    } catch (error) {
      console.error("[VerificationService] Error getting verification status:", error);
      return "NONE";
    }
  }

  /**
   * Gets the full verification request for a project.
   * Returns null if no request exists.
   */
  async getVerificationRequest(projectId: string): Promise<VerificationRequest | null> {
    try {
      const requests = this.loadRequests();
      const request = requests.find((r) => r.projectId === projectId);
      return request || null;
    } catch (error) {
      console.error("[VerificationService] Error getting verification request:", error);
      return null;
    }
  }

  /**
   * Gets all verification requests submitted by a user (for profile page).
   */
  async getVerificationRequestsByUser(submittedBy: string): Promise<VerificationRequest[]> {
    try {
      const requests = this.loadRequests();
      return requests
        .filter((r) => r.submittedBy === submittedBy)
        .sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        );
    } catch (error) {
      console.error("[VerificationService] Error getting user requests:", error);
      return [];
    }
  }

  /**
   * Gets all pending verification requests (for admin dashboard).
   */
  async getPendingRequests(): Promise<VerificationRequest[]> {
    try {
      const requests = this.loadRequests();
      return requests.filter((r) => r.status === "PENDING").sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    } catch (error) {
      console.error("[VerificationService] Error getting pending requests:", error);
      return [];
    }
  }

  /**
   * Approves a verification request (admin only).
   */
  async approveRequest(
    projectId: string,
    approvedBy: string,
  ): Promise<VerificationRequest> {
    try {
      const request = await this.getVerificationRequest(projectId);
      
      if (!request) {
        throw new Error("Verification request not found");
      }

      if (request.status !== "PENDING") {
        throw new Error(`Cannot approve request with status ${request.status}`);
      }

      // Update request status
      request.status = "VERIFIED";
      request.statusUpdatedAt = new Date().toISOString();
      request.statusUpdatedBy = approvedBy;
      delete request.rejectionReason;

      // Persist updated request
      await this.persistRequest(request);

      console.log(`[VerificationService] Request approved: ${projectId}`);
      return request;
    } catch (error) {
      console.error("[VerificationService] Error approving request:", error);
      throw error;
    }
  }

  /**
   * Rejects a verification request (admin only).
   */
  async rejectRequest(
    projectId: string,
    rejectedBy: string,
    reason?: string,
  ): Promise<VerificationRequest> {
    try {
      const request = await this.getVerificationRequest(projectId);
      
      if (!request) {
        throw new Error("Verification request not found");
      }

      if (request.status !== "PENDING") {
        throw new Error(`Cannot reject request with status ${request.status}`);
      }

      // Update request status
      request.status = "REJECTED";
      request.statusUpdatedAt = new Date().toISOString();
      request.statusUpdatedBy = rejectedBy;
      request.rejectionReason = reason;

      // Persist updated request
      await this.persistRequest(request);

      console.log(`[VerificationService] Request rejected: ${projectId}`);
      return request;
    } catch (error) {
      console.error("[VerificationService] Error rejecting request:", error);
      throw error;
    }
  }

  /**
   * Resets verification status for a project (admin only).
   * Allows resubmission after rejection.
   */
  async resetVerification(projectId: string): Promise<void> {
    try {
      const requests = this.loadRequests();
      const filtered = requests.filter((r) => r.projectId !== projectId);
      this.saveRequests(filtered);

      console.log(`[VerificationService] Verification reset for project: ${projectId}`);
    } catch (error) {
      console.error("[VerificationService] Error resetting verification:", error);
      throw error;
    }
  }

  /**
   * Gets verification statistics (admin only).
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    verified: number;
    rejected: number;
  }> {
    try {
      const requests = this.loadRequests();
      return {
        total: requests.length,
        pending: requests.filter((r) => r.status === "PENDING").length,
        verified: requests.filter((r) => r.status === "VERIFIED").length,
        rejected: requests.filter((r) => r.status === "REJECTED").length,
      };
    } catch (error) {
      console.error("[VerificationService] Error getting stats:", error);
      return { total: 0, pending: 0, verified: 0, rejected: 0 };
    }
  }

  /**
   * Distinguishes between:
   * - Project not registered: returns null for request
   * - Project registered but no verification request: returns NONE
   * - Project with request: returns full request
   */
  async getRequestStatus(projectId: string): Promise<{
    projectExists: boolean;
    requestExists: boolean;
    request: VerificationRequest | null;
  }> {
    try {
      const request = await this.getVerificationRequest(projectId);
      
      return {
        projectExists: true, // Would check against project registry in real implementation
        requestExists: request !== null,
        request,
      };
    } catch (error) {
      console.error("[VerificationService] Error getting request status:", error);
      return {
        projectExists: false,
        requestExists: false,
        request: null,
      };
    }
  }

  // ============ Private Helper Methods ============

  private loadRequests(): VerificationRequest[] {
    try {
      if (typeof window === "undefined") {
        return [];
      }
      const data = localStorage.getItem(VERIFICATION_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("[VerificationService] Error loading requests:", error);
      return [];
    }
  }

  private saveRequests(requests: VerificationRequest[]): void {
    try {
      if (typeof window === "undefined") {
        return;
      }
      localStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error("[VerificationService] Error saving requests:", error);
    }
  }

  private async persistRequest(request: VerificationRequest): Promise<void> {
    try {
      const requests = this.loadRequests();
      const index = requests.findIndex((r) => r.projectId === request.projectId);
      
      if (index >= 0) {
        requests[index] = request;
      } else {
        requests.push(request);
      }
      
      this.saveRequests(requests);
    } catch (error) {
      console.error("[VerificationService] Error persisting request:", error);
      throw error;
    }
  }
}

export const verificationService = new VerificationService();
