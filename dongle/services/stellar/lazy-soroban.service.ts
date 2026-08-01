/**
 * Lazy-loading wrapper for Soroban service
 * 
 * This module provides a thin wrapper that dynamically imports the full soroban.service
 * only when blockchain operations are actually needed (e.g., when the user enters wallet flows).
 * 
 * This prevents the heavy stellar-sdk from being included in the initial bundle for
 * landing, discovery, and other read-only pages.
 */

import type {
  ProjectData,
  SorobanTransactionOptions,
  NetworkMismatchError,
  WalletNotConnectedError,
} from "./soroban.service";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";

// Re-export types so consumers don't need to import from the heavy module
export type {
  ProjectData,
  SorobanTransactionOptions,
  NetworkMismatchError,
  WalletNotConnectedError,
} from "./soroban.service";

let sorobanServiceCache: typeof import("./soroban.service").sorobanService | null = null;

/**
 * Dynamically import and return the soroban service
 * Caches the result after first load
 */
async function loadSorobanService() {
  if (sorobanServiceCache) {
    return sorobanServiceCache;
  }

  const module = await import(/* webpackChunkName: "soroban-service" */ "./soroban.service");
  sorobanServiceCache = module.sorobanService;
  return sorobanServiceCache;
}

/**
 * Lazy-loading soroban service
 * 
 * All methods return promises that resolve after the service is loaded.
 * First call triggers the dynamic import; subsequent calls use the cached instance.
 * 
 * @example
 * // In a component
 * const status = await lazySorobanService.getVerificationStatus(projectId);
 * 
 * // For transaction flows
 * const result = await lazySorobanService.registerProject(data, options);
 */
export const lazySorobanService = {
  /**
   * Get verification status for a project
   */
  async getVerificationStatus(projectId: string): Promise<VerificationStatus> {
    const service = await loadSorobanService();
    return service.getVerificationStatus(projectId);
  },

  /**
   * Register a new project on-chain
   */
  async registerProject(
    data: ProjectData,
    options?: SorobanTransactionOptions
  ): Promise<boolean> {
    const service = await loadSorobanService();
    return service.registerProject(data, options);
  },

  /**
   * Update an existing project on-chain
   */
  async updateProject(
    projectId: string,
    data: ProjectData,
    options?: SorobanTransactionOptions
  ): Promise<boolean> {
    const service = await loadSorobanService();
    return service.updateProject(projectId, data, options);
  },

  /**
   * Request verification for a project
   */
  async requestVerification(
    projectId: string,
    requestedBy: string,
    options?: SorobanTransactionOptions
  ): Promise<boolean> {
    const service = await loadSorobanService();
    return service.requestVerification(projectId, requestedBy, options);
  },

  /**
   * Verify a project (admin only)
   */
  async verifyProject(
    projectId: string,
    verifiedBy: string,
    options?: SorobanTransactionOptions
  ): Promise<boolean> {
    const service = await loadSorobanService();
    return service.verifyProject(projectId, verifiedBy, options);
  },

  /**
   * Reject a verification request (admin only)
   */
  async rejectVerification(
    projectId: string,
    rejectedBy: string,
    reason: string,
    options?: SorobanTransactionOptions
  ): Promise<boolean> {
    const service = await loadSorobanService();
    return service.rejectVerification(projectId, rejectedBy, reason, options);
  },
};

/**
 * Check if the soroban service has been loaded
 * Useful for conditional UI rendering
 */
export function isSorobanServiceLoaded(): boolean {
  return sorobanServiceCache !== null;
}

/**
 * Preload the soroban service in the background
 * Call this when you know the user will need blockchain features soon
 * 
 * @example
 * // Preload when user hovers over "Submit Project" button
 * <button onMouseEnter={() => preloadSorobanService()}>
 *   Submit Project
 * </button>
 */
export function preloadSorobanService(): void {
  void loadSorobanService();
}
