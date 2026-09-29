/**
 * ISorobanService — interface for all Soroban / Project Registry operations (#422).
 *
 * Consumers depend on this interface rather than the concrete `sorobanService`
 * so that a mock implementation can be injected during testing.
 */

import type { ProjectCategory } from "@/types/project";
import type { TransactionPhase } from "@/lib/transaction-progress";

export type TransactionPhaseHandler = (
  phase: TransactionPhase,
  meta?: { txHash?: string; error?: Error },
) => void;

export interface SorobanTransactionOptions {
  onPhaseChange?: TransactionPhaseHandler;
  signal?: AbortSignal;
  timeoutMs?: number;
  intervalMs?: number;
}

export interface ProjectData {
  id: string;
  name: string;
  category: ProjectCategory;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  logoUrl: string;
  docsUrl: string;
  auditReportUrl?: string;
  bugBountyUrl?: string;
  owner: string;
  createdAt: string;
}

export interface ProjectRegistrationParams {
  name: string;
  category: ProjectCategory;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  logoUrl?: string;
  docsUrl?: string;
  contractAddresses?: string[];
}

export interface TransactionResult {
  hash: string;
  status: "SUCCESS";
}

export interface VerificationStatusResponse {
  projectExists: boolean;
  requestExists: boolean;
  status: "NONE" | "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
}

/**
 * Public interface for the Soroban service.
 *
 * All service consumers should accept `ISorobanService` instead of the
 * concrete module so that mocks can be injected in tests.
 */
export interface ISorobanService {
  registerProject(
    params: ProjectRegistrationParams,
    options?: SorobanTransactionOptions,
  ): Promise<TransactionResult>;

  updateProject(
    projectId: string,
    params: ProjectRegistrationParams,
    options?: SorobanTransactionOptions,
  ): Promise<TransactionResult>;

  transferOwnership(
    projectId: string,
    newOwnerAddress: string,
    options?: SorobanTransactionOptions,
  ): Promise<TransactionResult>;

  requestVerification(
    projectId: string,
    projectName: string,
  ): Promise<TransactionResult>;

  getVerificationStatus(
    projectId: string,
    signal?: AbortSignal,
  ): Promise<"NONE" | "PENDING" | "VERIFIED" | "REJECTED">;

  getVerificationRequestStatus(
    projectId: string,
    signal?: AbortSignal,
  ): Promise<VerificationStatusResponse>;

  getProject(projectId: string): Promise<ProjectData | null>;
}
