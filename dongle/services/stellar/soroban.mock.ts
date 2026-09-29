/**
 * Mock Soroban service for unit and integration tests (#422).
 *
 * Implements `ISorobanService` with in-memory state so that consumers can
 * be tested without hitting a real Stellar network or wallet extension.
 */

import type {
  ISorobanService,
  ProjectData,
  ProjectRegistrationParams,
  SorobanTransactionOptions,
  TransactionResult,
  VerificationStatusResponse,
} from "./soroban.interface";

export class MockSorobanService implements ISorobanService {
  private projects = new Map<string, ProjectData>();
  private verificationStatuses = new Map<
    string,
    "NONE" | "PENDING" | "VERIFIED" | "REJECTED"
  >();
  private nextId = 1;

  /** Seed a project into the mock store. */
  seedProject(project: ProjectData): void {
    this.projects.set(project.id, project);
  }

  /** Set the verification status for a project. */
  seedVerification(
    projectId: string,
    status: "NONE" | "PENDING" | "VERIFIED" | "REJECTED",
  ): void {
    this.verificationStatuses.set(projectId, status);
  }

  /** Reset all internal state. */
  reset(): void {
    this.projects.clear();
    this.verificationStatuses.clear();
    this.nextId = 1;
  }

  async registerProject(
    params: ProjectRegistrationParams,
    _options?: SorobanTransactionOptions,
  ): Promise<TransactionResult> {
    const id = `mock-project-${this.nextId++}`;
    const now = new Date().toISOString();
    this.projects.set(id, {
      id,
      name: params.name,
      category: params.category,
      description: params.description,
      websiteUrl: params.websiteUrl,
      githubUrl: params.githubUrl,
      logoUrl: params.logoUrl ?? "",
      docsUrl: params.docsUrl ?? "",
      owner: "GMOCKADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      createdAt: now,
    });
    return { hash: `mock-tx-${id}`, status: "SUCCESS" };
  }

  async updateProject(
    projectId: string,
    params: ProjectRegistrationParams,
    _options?: SorobanTransactionOptions,
  ): Promise<TransactionResult> {
    const existing = this.projects.get(projectId);
    if (!existing) throw new Error("Project not found");
    this.projects.set(projectId, { ...existing, ...params });
    return { hash: `mock-tx-update-${projectId}`, status: "SUCCESS" };
  }

  async transferOwnership(
    projectId: string,
    _newOwnerAddress: string,
    _options?: SorobanTransactionOptions,
  ): Promise<TransactionResult> {
    if (!this.projects.has(projectId)) throw new Error("Project not found");
    return { hash: `mock-tx-transfer-${projectId}`, status: "SUCCESS" };
  }

  async requestVerification(
    projectId: string,
    _projectName: string,
  ): Promise<TransactionResult> {
    this.verificationStatuses.set(projectId, "PENDING");
    return { hash: `mock-verify-${projectId}`, status: "SUCCESS" };
  }

  async getVerificationStatus(
    projectId: string,
  ): Promise<"NONE" | "PENDING" | "VERIFIED" | "REJECTED"> {
    return this.verificationStatuses.get(projectId) ?? "NONE";
  }

  async getVerificationRequestStatus(
    projectId: string,
  ): Promise<VerificationStatusResponse> {
    const status = this.verificationStatuses.get(projectId) ?? "NONE";
    return {
      projectExists: this.projects.has(projectId),
      requestExists: status !== "NONE",
      status,
    };
  }

  async getProject(projectId: string): Promise<ProjectData | null> {
    return this.projects.get(projectId) ?? null;
  }
}
