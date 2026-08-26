import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/types/project";
import { verificationService, type VerificationRequest } from "@/services/stellar/verification.service";
import { reviewService } from "@/services/review/review.service";
import { draftService, type ProjectDraft } from "@/services/draft/draft.service";
import { projectOwnerService } from "@/services/project/project-owner.service";
import { projectSubmissionService, type ProjectSubmission } from "@/services/project/project-submission.service";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const mockWallet = {
  getPublicKey: vi.fn(),
  signTransaction: vi.fn(),
  getNetworkPassphrase: vi.fn(),
};

vi.mock("@/services/wallet/wallet.service", () => ({
  walletService: mockWallet,
}));

const mockRpcServer = {
  getAccount: vi.fn(),
  simulateTransaction: vi.fn(),
  prepareTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
};

vi.mock("stellar-sdk", () => {
  class MockAccount {
    publicKey: string;
    sequence: string;
    constructor(publicKey: string, sequence: string) {
      this.publicKey = publicKey;
      this.sequence = sequence;
    }
    sequenceNumber() { return this.sequence; }
  }

  class MockContract {
    id: string;
    constructor(id: string) { this.id = id; }
    call(method: string, ...args: unknown[]) {
      return { type: "invokeHostFunctionOp", method, args };
    }
  }

  class MockTransactionBuilder {
    source: MockAccount;
    ops: unknown[] = [];
    timeoutValue = 0;
    constructor(source: MockAccount, _opts: Record<string, unknown>) {
      this.source = source;
    }
    addOperation(op: unknown) { this.ops.push(op); return this; }
    setTimeout(t: number) { this.timeoutValue = t; return this; }
    build() { return { toXDR: () => "UNSIGNED_XDR" }; }
    static fromXDR(xdr: string, _passphrase: string) {
      return { toXDR: () => xdr };
    }
    toXDR() { return "PREPARED_XDR"; }
  }

  return {
    rpc: {
      Server: function () { return mockRpcServer; },
    },
    Contract: MockContract,
    TransactionBuilder: MockTransactionBuilder,
    Account: MockAccount,
    BASE_FEE: 100,
    nativeToScVal: (v: unknown) => ({ type: "scval", value: v }),
  };
});

const WALLET_OWNER = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
const WALLET_REVIEWER = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674CH";
const WALLET_NEW_OWNER = "GDNYOB2GKMEBSCMHIGS7Y5BTYBTLXOR2766OYHTTA3H2HMYHIXZ2R4VQ";
const ADMIN_WALLET = "GA5WBPYA5Y4WAHXBCJNLQ66VCUCUHM65EPOREO6X22NHBZXGIHED56Y7";

const EXPECTED_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

interface RealisticSorobanResponse {
  status: "SUCCESS" | "ERROR" | "PENDING";
  hash?: string;
  latestLedger?: number;
  latestLedgerCloseTime?: number;
  oldestLedger?: number;
  resultXdr?: string;
  errorResult?: Record<string, unknown>;
}

interface DatabaseStateSnapshot {
  verificationRequests: VerificationRequest[];
  reviews: import("@/types/review").Review[];
  drafts: ProjectDraft[];
  ownerOverrides: Record<string, string>;
  projectSubmissions: ProjectSubmission[];
  moderationLog: ProjectSubmissionModerationAction[];
}

type ProjectSubmissionModerationAction = ReturnType<typeof projectSubmissionService.getModerationLog>[number];

function captureDatabaseState(): DatabaseStateSnapshot {
  const verRequestsRaw = localStorage.getItem("dongle_verification_requests");
  const reviewsRaw = localStorage.getItem("dongle_reviews");
  const draftsRaw = localStorage.getItem("dongle_project_drafts");
  const ownerOverridesRaw = localStorage.getItem("dongle_project_owner_overrides");
  const submissionsRaw = localStorage.getItem("dongle_project_submissions");
  const modLogRaw = localStorage.getItem("dongle_submission_moderation_log");

  return {
    verificationRequests: verRequestsRaw ? JSON.parse(verRequestsRaw) : [],
    reviews: reviewsRaw ? JSON.parse(reviewsRaw) : [],
    drafts: [],
    ownerOverrides: ownerOverridesRaw ? JSON.parse(ownerOverridesRaw) : {},
    projectSubmissions: submissionsRaw ? JSON.parse(submissionsRaw) : [],
    moderationLog: modLogRaw ? JSON.parse(modLogRaw) : [],
  };
}

function expectStateConsistency(before: DatabaseStateSnapshot, after: DatabaseStateSnapshot, diffs: {
  verificationRequests?: number;
  reviews?: number;
  drafts?: number;
  ownerOverrides?: string[];
  projectSubmissions?: number;
  moderationLog?: number;
}) {
  expect(after.verificationRequests.length).toBe(before.verificationRequests.length + (diffs.verificationRequests ?? 0));
  expect(after.reviews.length).toBe(before.reviews.length + (diffs.reviews ?? 0));
  expect(after.ownerOverrides).toBeDefined();
  expect(after.projectSubmissions.length).toBe(before.projectSubmissions.length + (diffs.projectSubmissions ?? 0));
  expect(after.moderationLog.length).toBe(before.moderationLog.length + (diffs.moderationLog ?? 0));

  if (diffs.ownerOverrides) {
    for (const key of diffs.ownerOverrides) {
      expect(after.ownerOverrides[key]).toBeDefined();
    }
  }
}

function setupRealisticSorobanMock(options?: {
  walletPublicKey?: string;
  simulateFail?: boolean;
  sendFail?: boolean;
  pollStatus?: "SUCCESS" | "ERROR" | "NOT_FOUND";
}) {
  const {
    walletPublicKey = WALLET_OWNER,
    simulateFail = false,
    sendFail = false,
    pollStatus = "SUCCESS",
  } = options ?? {};

  mockWallet.getPublicKey.mockResolvedValue(walletPublicKey);
  mockWallet.getNetworkPassphrase.mockResolvedValue(EXPECTED_NETWORK_PASSPHRASE);
  mockWallet.signTransaction.mockResolvedValue("SIGNED_XDR_DATA");

  mockRpcServer.getAccount.mockResolvedValue({
    sequenceNumber: () => "12345",
  });

  if (simulateFail) {
    mockRpcServer.prepareTransaction.mockRejectedValue(new Error("Soroban simulation failed: contract error"));
  } else {
    mockRpcServer.prepareTransaction.mockImplementation((tx: unknown) => Promise.resolve(tx));
  }

  if (sendFail) {
    mockRpcServer.sendTransaction.mockResolvedValue({
      status: "ERROR",
      errorResult: { code: "tx_failed", message: "Insufficient balance for fees" },
    });
  } else {
    mockRpcServer.sendTransaction.mockResolvedValue({
      status: "PENDING",
      hash: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    });
  }

  mockRpcServer.getTransaction.mockImplementation(async (hash: string) => {
    if (pollStatus === "NOT_FOUND") {
      return { status: "NOT_FOUND" };
    }
    if (pollStatus === "ERROR") {
      return {
        status: "ERROR",
        hash,
        errorResultXdr: "AAAAAgAAAAMAAAAB",
        resultXdr: "AAAAAgAAAAMAAAAB",
      };
    }
    return {
      status: "SUCCESS",
      hash,
      latestLedger: 58329172,
      latestLedgerCloseTime: Math.floor(Date.now() / 1000),
      oldestLedger: 58329100,
      resultXdr: "AAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAEAAAAAQAAAAEAAAAGAAAAA",
    } as const;
  });
}

describe("Service Integration with Realistic Soroban RPC Mocking", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_REVIEW_PERSISTENCE = undefined;
  });

  describe("Soroban RPC Realistic Response Patterns", () => {
    it("requestVerification flows through realistic phase transitions", async () => {
      setupRealisticSorobanMock({ walletPublicKey: WALLET_OWNER });

      const { sorobanService } = await import("@/services/stellar/soroban.service");

      projectSubmissionService.recordSubmission({
        projectId: "soroban-swap",
        projectName: "Soroban Swap",
        submittedBy: WALLET_OWNER,
        qualityScore: 0.9,
        flagReasons: [],
      });

      const result = await sorobanService.requestVerification("soroban-swap", "Soroban Swap");
      expect(result.status).toBe("SUCCESS");
      expect(result.hash).toMatch(/^ver-soroban-swap-/);

      const verStatus = await verificationService.getVerificationStatus("soroban-swap");
      expect(verStatus).toBe("PENDING");

      const statusDetail = await sorobanService.getVerificationRequestStatus("soroban-swap");
      expect(statusDetail.projectExists).toBeDefined();
      expect(statusDetail.requestExists).toBe(true);
      expect(statusDetail.status).toBe("PENDING");

      expect(mockWallet.getPublicKey).toHaveBeenCalled();
    });

    it("getVerificationStatus handles abort signal correctly", async () => {
      setupRealisticSorobanMock();

      const { sorobanService } = await import("@/services/stellar/soroban.service");

      await verificationService.submitVerificationRequest(
        "abort-test-project",
        "Abort Test Project",
        WALLET_OWNER,
      );

      const controller = new AbortController();
      controller.abort();

      await expect(
        sorobanService.getVerificationStatus("abort-test-project", controller.signal),
      ).rejects.toThrow("Aborted");
    });

    it("getVerificationRequestStatus returns structured context for UI", async () => {
      setupRealisticSorobanMock();

      const { sorobanService } = await import("@/services/stellar/soroban.service");

      projectSubmissionService.recordSubmission({
        projectId: "context-project",
        projectName: "Context Project",
        submittedBy: WALLET_OWNER,
        qualityScore: 0.85,
        flagReasons: [],
      });

      await verificationService.submitVerificationRequest(
        "context-project",
        "Context Project",
        WALLET_OWNER,
      );

      await verificationService.rejectRequest(
        "context-project",
        ADMIN_WALLET,
        "Needs audit report before verification",
      );

      const status = await sorobanService.getVerificationRequestStatus("context-project");
      expect(status.requestExists).toBe(true);
      expect(status.status).toBe("REJECTED");
      expect(status.rejectionReason).toBe("Needs audit report before verification");
    });
  });

  describe("Database State Consistency After Operations", () => {
    it("Flow 1: Registration + Verification maintains consistent DB state", async () => {
      const before = captureDatabaseState();

      projectSubmissionService.recordSubmission({
        projectId: "state-project-1",
        projectName: "State Project 1",
        submittedBy: WALLET_OWNER,
        qualityScore: 0.92,
        flagReasons: [],
      });

      const afterSubmission = captureDatabaseState();
      expectStateConsistency(before, afterSubmission, { projectSubmissions: 1 });

      await verificationService.submitVerificationRequest(
        "state-project-1",
        "State Project 1",
        WALLET_OWNER,
      );

      const afterVerification = captureDatabaseState();
      expectStateConsistency(afterSubmission, afterVerification, { verificationRequests: 1 });

      await verificationService.assignRequest(
        "state-project-1",
        ADMIN_WALLET,
        ADMIN_WALLET,
      );

      const afterAssign = captureDatabaseState();
      expectStateConsistency(afterVerification, afterAssign, {});
      expect(afterAssign.verificationRequests[0].assignedTo).toBe(ADMIN_WALLET);

      await verificationService.approveRequest("state-project-1", ADMIN_WALLET);

      const afterApprove = captureDatabaseState();
      expectStateConsistency(afterAssign, afterApprove, {});
      expect(afterApprove.verificationRequests[0].status).toBe("VERIFIED");
      expect(afterApprove.verificationRequests[0].statusUpdatedBy).toBe(ADMIN_WALLET);
    });

    it("Flow 2: Review submission maintains consistent review count", async () => {
      const projectId = "state-project-reviews";
      const projectName = "State Project Reviews";

      projectSubmissionService.recordSubmission({
        projectId,
        projectName,
        submittedBy: WALLET_OWNER,
        qualityScore: 0.88,
        flagReasons: [],
      });

      await verificationService.submitVerificationRequest(projectId, projectName, WALLET_OWNER);

      const beforeReviews = captureDatabaseState();
      expect(beforeReviews.reviews).toHaveLength(0);

      const reviewers = [WALLET_REVIEWER, WALLET_NEW_OWNER, ADMIN_WALLET];
      const ratings = [5, 4, 3];
      const comments = [
        "Incredible project with solid foundations and excellent documentation overall.",
        "Very good experience using their platform, some minor issues but nothing critical.",
        "Average project that delivers what it promises but lacks innovation right now.",
      ];

      for (let i = 0; i < reviewers.length; i++) {
        const beforeAdd = captureDatabaseState();
        const result = await reviewService.addReview(
          { projectId, projectName, rating: ratings[i], comment: comments[i] },
          reviewers[i],
        );
        expect(result.success).toBe(true);
        const afterAdd = captureDatabaseState();
        expectStateConsistency(beforeAdd, afterAdd, { reviews: 1 });
      }

      const afterAllReviews = captureDatabaseState();
      expect(afterAllReviews.reviews).toHaveLength(3);
      expect(afterAllReviews.reviews.every((r) => r.projectId === projectId)).toBe(true);

      const beforeDelete = captureDatabaseState();
      const reviewToDelete = afterAllReviews.reviews.find(
        (r) => r.userAddress === WALLET_NEW_OWNER,
      )!;
      await reviewService.deleteReview(reviewToDelete.id, WALLET_NEW_OWNER);
      const afterDelete = captureDatabaseState();
      expectStateConsistency(beforeDelete, afterDelete, { reviews: -1 });

      const finalReviews = await reviewService.getReviewsByProject(projectId);
      expect(finalReviews).toHaveLength(2);
    });

    it("Flow 3: Ownership transfer + transfer verification maintains state", () => {
      const projectId = "state-project-ownership";

      projectSubmissionService.recordSubmission({
        projectId,
        projectName: "Ownership Transfer Project",
        submittedBy: WALLET_OWNER,
        qualityScore: 0.75,
        flagReasons: [],
      });

      const before = captureDatabaseState();
      expect(before.ownerOverrides[projectId]).toBeUndefined();

      projectOwnerService.setProjectOwnerOverride(projectId, WALLET_NEW_OWNER);
      const afterTransfer = captureDatabaseState();
      expectStateConsistency(before, afterTransfer, { ownerOverrides: [projectId] });
      expect(afterTransfer.ownerOverrides[projectId]).toBe(WALLET_NEW_OWNER);

      projectSubmissionService.recordSubmission({
        projectId,
        projectName: "Ownership Transfer Project",
        submittedBy: WALLET_NEW_OWNER,
        qualityScore: 0.95,
        flagReasons: [],
      });

      const afterResubmit = captureDatabaseState();
      expectStateConsistency(afterTransfer, afterResubmit, { projectSubmissions: 0 });
      expect(afterResubmit.projectSubmissions[0].submittedBy).toBe(WALLET_NEW_OWNER);

      projectOwnerService.setProjectOwnerOverride(projectId, null);
      const afterClear = captureDatabaseState();
      expect(afterClear.ownerOverrides[projectId]).toBeUndefined();
    });

    it("Flow 4: Draft save / update / delete cycle maintains consistency", () => {
      const projectId = "state-project-draft";
      const draftId1 = "draft-cycle-1";
      const draftId2 = "draft-cycle-2";

      const baseData: ProjectDraft["data"] = {
        name: "Draft Cycle Project",
        primaryCategory: "defi",
        tags: ["Test"],
        description: "Testing draft save lifecycle and database consistency.",
        websiteUrl: "https://draft-cycle.io",
        githubUrl: "https://github.com/draft/cycle",
        logoUrl: "",
        docsUrl: "",
      };

      const before = captureDatabaseState();

      draftService.saveDraft(
        { id: draftId1, mode: "create", data: baseData },
        WALLET_OWNER,
      );
      const afterSave1 = captureDatabaseState();
      const draft1 = draftService.getDraft(draftId1, WALLET_OWNER);
      expect(draft1).not.toBeNull();
      expect(draft1?.data.name).toBe("Draft Cycle Project");

      draftService.saveDraft(
        {
          id: draftId1,
          mode: "create",
          data: {
            ...baseData,
            name: "Draft Cycle Project V2",
            tags: ["Test", "Updated"],
            description: "Updated description with more detail and context.",
          },
        },
        WALLET_OWNER,
      );
      const afterUpdate = captureDatabaseState();
      const updated = draftService.getDraft(draftId1, WALLET_OWNER);
      expect(updated?.data.name).toBe("Draft Cycle Project V2");
      expect(updated?.data.tags).toEqual(["Test", "Updated"]);

      draftService.saveDraft(
        { id: draftId2, mode: "edit", projectId, data: baseData },
        WALLET_OWNER,
      );
      const afterSave2 = captureDatabaseState();
      expect(draftService.getAllDrafts(WALLET_OWNER)).toHaveLength(2);
      expect(draftService.getDraftForProject("edit", projectId, WALLET_OWNER)?.id).toBe(draftId2);

      draftService.deleteDraft(draftId1, WALLET_OWNER);
      const afterDelete1 = captureDatabaseState();
      expect(draftService.getDraft(draftId1, WALLET_OWNER)).toBeNull();
      expect(draftService.getAllDrafts(WALLET_OWNER)).toHaveLength(1);

      draftService.clearAllDrafts();
      const afterClearAll = captureDatabaseState();
      expect(draftService.getAllDrafts(WALLET_OWNER)).toHaveLength(0);
    });

    it("Moderation log and status are both updated consistently", async () => {
      const projectId = "state-project-moderation";

      projectSubmissionService.recordSubmission({
        projectId,
        projectName: "Moderation Consistency Project",
        submittedBy: WALLET_OWNER,
        qualityScore: 0.6,
        flagReasons: ["needs-more-docs", "needs-audit"],
      });

      const pending = projectSubmissionService.getSubmissionByProjectId(projectId);
      expect(pending?.status).toBe("flagged");

      const beforeModeration = captureDatabaseState();
      expect(beforeModeration.moderationLog).toHaveLength(0);

      const approveResult = projectSubmissionService.updateStatus(
        projectId,
        "approved",
        ADMIN_WALLET,
        "All documentation reviewed and verified as complete.",
      );
      expect(approveResult.success).toBe(true);

      const afterModeration = captureDatabaseState();
      expectStateConsistency(beforeModeration, afterModeration, { moderationLog: 1 });

      const submission = projectSubmissionService.getSubmissionByProjectId(projectId);
      expect(submission?.status).toBe("approved");
      expect(submission?.statusUpdatedBy).toBe(ADMIN_WALLET);
      expect(submission?.rejectionReason).toBeUndefined();

      const log = projectSubmissionService.getModerationLog();
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe("approved");
      expect(log[0].moderatorAddress).toBe(ADMIN_WALLET);
      expect(log[0].reason).toBe("All documentation reviewed and verified as complete.");
      expect(log[0].projectId).toBe(projectId);
    });

    it("Verification stats aggregate correctly across lifecycle transitions", async () => {
      const projects = [
        { id: "stats-1", name: "Stats Project 1", rating: 0.95, approve: true },
        { id: "stats-2", name: "Stats Project 2", rating: 0.9, approve: false },
        { id: "stats-3", name: "Stats Project 3", rating: 0.85, approve: true },
        { id: "stats-4", name: "Stats Project 4", rating: 0.8, approve: true },
        { id: "stats-5", name: "Stats Project 5", rating: 0.7, approve: false },
      ];

      for (const p of projects) {
        projectSubmissionService.recordSubmission({
          projectId: p.id,
          projectName: p.name,
          submittedBy: WALLET_OWNER,
          qualityScore: p.rating,
          flagReasons: [],
        });
        await verificationService.submitVerificationRequest(p.id, p.name, WALLET_OWNER);
      }

      const pendingStats = await verificationService.getStats();
      expect(pendingStats.total).toBe(5);
      expect(pendingStats.pending).toBe(5);
      expect(pendingStats.verified).toBe(0);
      expect(pendingStats.rejected).toBe(0);

      for (const p of projects) {
        if (p.approve) {
          await verificationService.approveRequest(p.id, ADMIN_WALLET);
        } else {
          await verificationService.rejectRequest(p.id, ADMIN_WALLET, "Insufficient quality score");
        }
      }

      const finalStats = await verificationService.getStats();
      expect(finalStats.total).toBe(5);
      expect(finalStats.pending).toBe(0);
      expect(finalStats.verified).toBe(3);
      expect(finalStats.rejected).toBe(2);

      const pendingList = await verificationService.getPendingRequests();
      expect(pendingList).toHaveLength(0);

      const allRequests = await verificationService.getAllRequests();
      expect(allRequests).toHaveLength(5);

      const verifiedRequests = allRequests.filter((r) => r.status === "VERIFIED");
      const rejectedRequests = allRequests.filter((r) => r.status === "REJECTED");
      expect(verifiedRequests).toHaveLength(3);
      expect(rejectedRequests).toHaveLength(2);
    });
  });

  describe("Soroban Error Scenarios and Recovery", () => {
    it("handles wallet-not-connected error on registerProject gracefully", async () => {
      mockWallet.getPublicKey.mockRejectedValue(new Error("Wallet not connected"));
      mockWallet.getNetworkPassphrase.mockResolvedValue(EXPECTED_NETWORK_PASSPHRASE);

      const { sorobanService, WalletNotConnectedError } = await import(
        "@/services/stellar/soroban.service"
      );

      await expect(
        sorobanService.registerProject({
          name: "Failing Project",
          category: PROJECT_CATEGORIES.DEFI as ProjectCategory,
          description: "Test",
          websiteUrl: "https://fail.com",
        }),
      ).rejects.toBeInstanceOf(WalletNotConnectedError);
    });

    it("falls back gracefully when review persistence API is unavailable", async () => {
      process.env.NEXT_PUBLIC_REVIEW_PERSISTENCE = "api";

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error("Network unreachable"));

      try {
        const result = await reviewService.addReview(
          {
            projectId: "fallback-project",
            projectName: "Fallback Project",
            rating: 4,
            comment: "Testing localStorage fallback when API is down for maintenance.",
          },
          WALLET_REVIEWER,
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        const projectReviews = await reviewService.getReviewsByProject("fallback-project");
        expect(projectReviews).toHaveLength(1);
        expect(projectReviews[0].userAddress).toBe(WALLET_REVIEWER);
      } finally {
        global.fetch = originalFetch;
        delete process.env.NEXT_PUBLIC_REVIEW_PERSISTENCE;
      }
    });

    it("verification service handles SSR context gracefully", async () => {
      const originalWindow = global.window;
      delete (global as Partial<typeof global>).window;

      try {
        const status = await verificationService.getVerificationStatus("ssr-project");
        expect(status).toBe("NONE");

        const allRequests = await verificationService.getAllRequests();
        expect(allRequests).toHaveLength(0);

        const pending = await verificationService.getPendingRequests();
        expect(pending).toHaveLength(0);

        const stats = await verificationService.getStats();
        expect(stats).toEqual({ total: 0, pending: 0, verified: 0, rejected: 0 });
      } finally {
        (global as typeof global).window = originalWindow;
      }
    });

    it("updateProject validates ownership and throws for non-owner", async () => {
      setupRealisticSorobanMock({ walletPublicKey: WALLET_REVIEWER });

      const { sorobanService } = await import("@/services/stellar/soroban.service");

      await expect(
        sorobanService.updateProject(
          "stellar-guardians",
          {
            name: "Stellar Guardians Updated",
            category: PROJECT_CATEGORIES.GAMING as ProjectCategory,
            description: "Updated description",
            websiteUrl: "https://stellar-guardians-v2.com",
          },
        ),
      ).rejects.toThrow("Only project owner can update");
    });

    it("transferOwnership validates ownership and address format", async () => {
      setupRealisticSorobanMock({ walletPublicKey: WALLET_OWNER });

      const { sorobanService } = await import("@/services/stellar/soroban.service");

      await expect(
        sorobanService.transferOwnership("soroban-swap", "INVALID_ADDRESS_FORMAT"),
      ).rejects.toThrow();

      const setupMock2 = setupRealisticSorobanMock({ walletPublicKey: WALLET_REVIEWER });

      await expect(
        sorobanService.transferOwnership("soroban-swap", WALLET_NEW_OWNER),
      ).rejects.toThrow("Only the current project owner can transfer ownership");
    });
  });

  describe("End-to-End Combined Operation Consistency", () => {
    it("Full project lifecycle: draft → register → verify → review → transfer", async () => {
      setupRealisticSorobanMock({ walletPublicKey: WALLET_OWNER });

      const projectId = "lifecycle-project";
      const projectName = "Lifecycle Full Project";

      const state0 = captureDatabaseState();

      draftService.saveDraft(
        {
          id: "lifecycle-draft",
          mode: "create",
          data: {
            name: projectName,
            primaryCategory: "dao",
            tags: ["DAO", "Governance", "Lifecycle"],
            description: "Complete lifecycle test project covering all service operations.",
            websiteUrl: "https://lifecycle-dao.io",
            githubUrl: "https://github.com/lifecycle/dao",
            logoUrl: "https://lifecycle-dao.io/logo.png",
            docsUrl: "https://docs.lifecycle-dao.io",
            auditReportUrl: "https://lifecycle-dao.io/audit.pdf",
            bugBountyUrl: "https://lifecycle-dao.io/bounty",
          },
        },
        WALLET_OWNER,
      );

      const state1 = captureDatabaseState();
      const draft = draftService.getDraftForProject("create", undefined, WALLET_OWNER);
      expect(draft?.data.name).toBe(projectName);
      expect(draft?.data.primaryCategory).toBe("dao");

      projectSubmissionService.recordSubmission({
        projectId,
        projectName,
        submittedBy: WALLET_OWNER,
        qualityScore: 0.97,
        flagReasons: [],
      });
      const state2 = captureDatabaseState();
      expect(state2.projectSubmissions[0].status).toBe("approved");

      await verificationService.submitVerificationRequest(projectId, projectName, WALLET_OWNER);
      const state3 = captureDatabaseState();
      expect(state3.verificationRequests[0].status).toBe("PENDING");

      await verificationService.assignRequest(projectId, ADMIN_WALLET, ADMIN_WALLET);
      await verificationService.approveRequest(projectId, ADMIN_WALLET);
      const state4 = captureDatabaseState();
      expect(state4.verificationRequests[0].status).toBe("VERIFIED");

      const { sorobanService } = await import("@/services/stellar/soroban.service");
      const verStatus = await sorobanService.getVerificationStatus(projectId);
      expect(verStatus).toBe("VERIFIED");

      await reviewService.addReview(
        {
          projectId,
          projectName,
          rating: 5,
          comment: "A superb example of a well-executed DAO with transparent governance processes.",
        },
        WALLET_REVIEWER,
      );
      await reviewService.addReview(
        {
          projectId,
          projectName,
          rating: 4,
          comment: "Great overall experience, though voting interface could use some refinement.",
        },
        WALLET_NEW_OWNER,
      );
      const state5 = captureDatabaseState();
      expect(state5.reviews).toHaveLength(2);

      projectOwnerService.setProjectOwnerOverride(projectId, WALLET_NEW_OWNER);
      const state6 = captureDatabaseState();
      expect(state6.ownerOverrides[projectId]).toBe(WALLET_NEW_OWNER);

      projectSubmissionService.updateStatus(
        projectId,
        "approved",
        ADMIN_WALLET,
        "Ownership transfer confirmed, project remoderated.",
      );
      const state7 = captureDatabaseState();
      expectStateConsistency(state6, state7, { moderationLog: 1 });
      expect(state7.moderationLog[0].action).toBe("approved");

      const projectReviews = await reviewService.getReviewsByProject(projectId);
      expect(projectReviews).toHaveLength(2);

      const finalStats = await verificationService.getStats();
      expect(finalStats.verified).toBe(1);

      draftService.deleteDraft("lifecycle-draft", WALLET_OWNER);
      const stateFinal = captureDatabaseState();

      const finalSubmission = projectSubmissionService.getSubmissionByProjectId(projectId);
      expect(finalSubmission?.status).toBe("approved");
      expect(projectSubmissionService.isDiscoverable(projectId)).toBe(true);
    });
  });
});
