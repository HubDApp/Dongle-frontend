import { describe, it, expect, beforeEach, vi } from "vitest";
import { PROJECT_CATEGORIES, type Project } from "@/types/project";
import { REVIEW_CONSTRAINTS } from "@/types/review";
import { verificationService } from "@/services/stellar/verification.service";
import { reviewService } from "@/services/review/review.service";
import { draftService, type ProjectDraft } from "@/services/draft/draft.service";
import { projectOwnerService } from "@/services/project/project-owner.service";
import { projectSubmissionService } from "@/services/project/project-submission.service";

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

const mockServer = {
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
      return { type: "operation", method, args };
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
      Server: function () { return mockServer; },
    },
    Contract: MockContract,
    TransactionBuilder: MockTransactionBuilder,
    Account: MockAccount,
    BASE_FEE: 100,
    nativeToScVal: (v: unknown) => ({ scval: v }),
  };
});

const WALLET_OWNER = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
const WALLET_REVIEWER = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674CH";
const WALLET_NEW_OWNER = "GDNYOB2GKMEBSCMHIGS7Y5BTYBTLXOR2766OYHTTA3H2HMYHIXZ2R4VQ";
const ADMIN_WALLET = "GA5WBPYA5Y4WAHXBCJNLQ66VCUCUHM65EPOREO6X22NHBZXGIHED56Y7";

const TEST_PROJECT_ID = "soroban-swap";
const TEST_PROJECT_NAME = "Soroban Swap";
const TEST_PROJECT: Project = {
  id: TEST_PROJECT_ID,
  name: TEST_PROJECT_NAME,
  primaryCategory: PROJECT_CATEGORIES.DEFI,
  description: "Next-generation automated market maker on Soroban.",
  rating: 4.5,
  reviews: 12,
  createdAt: "2024-11-10T00:00:00Z",
  websiteUrl: "https://soroban-swap.com",
  githubUrl: "https://github.com/example/soroban-swap",
  logoUrl: "https://example.com/logo1.png",
  docsUrl: "https://docs.soroban-swap.com",
  ownerAddress: WALLET_OWNER,
  tags: ["AMM", "DEX", "Liquidity"],
};

describe("Service Layer Integration Tests", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_REVIEW_PERSISTENCE = undefined;
  });

  describe("Flow 1: Project Registration → Verification Request Submission", () => {
    it("records project submission and submits verification request with consistent state", async () => {
      const submission = projectSubmissionService.recordSubmission({
        projectId: TEST_PROJECT_ID,
        projectName: TEST_PROJECT_NAME,
        submittedBy: WALLET_OWNER,
        qualityScore: 0.92,
        flagReasons: [],
      });

      expect(submission.projectId).toBe(TEST_PROJECT_ID);
      expect(submission.status).toBe("approved");
      expect(submission.qualityScore).toBe(0.92);

      const retrievedSubmission = projectSubmissionService.getSubmissionByProjectId(TEST_PROJECT_ID);
      expect(retrievedSubmission).toEqual(submission);

      const isDiscoverable = projectSubmissionService.isDiscoverable(TEST_PROJECT_ID);
      expect(isDiscoverable).toBe(true);

      const requestId = await verificationService.submitVerificationRequest(
        TEST_PROJECT_ID,
        TEST_PROJECT_NAME,
        WALLET_OWNER,
      );

      expect(requestId).toMatch(/^ver-soroban-swap-/);

      const verificationRequest = await verificationService.getVerificationRequest(TEST_PROJECT_ID);
      expect(verificationRequest).not.toBeNull();
      expect(verificationRequest?.projectId).toBe(TEST_PROJECT_ID);
      expect(verificationRequest?.projectName).toBe(TEST_PROJECT_NAME);
      expect(verificationRequest?.submittedBy).toBe(WALLET_OWNER);
      expect(verificationRequest?.status).toBe("PENDING");

      const status = await verificationService.getVerificationStatus(TEST_PROJECT_ID);
      expect(status).toBe("PENDING");

      const requestStatus = await verificationService.getRequestStatus(TEST_PROJECT_ID);
      expect(requestStatus.requestExists).toBe(true);
      expect(requestStatus.request?.status).toBe("PENDING");

      const userRequests = await verificationService.getVerificationRequestsByUser(WALLET_OWNER);
      expect(userRequests).toHaveLength(1);
      expect(userRequests[0].id).toBe(verificationRequest?.id);

      const allRequests = await verificationService.getAllRequests();
      expect(allRequests).toHaveLength(1);

      const pendingRequests = await verificationService.getPendingRequests();
      expect(pendingRequests).toHaveLength(1);
      expect(pendingRequests[0].id).toBe(verificationRequest?.id);
    });

    it("flows through verification lifecycle with admin approve (consistent state)", async () => {
      projectSubmissionService.recordSubmission({
        projectId: TEST_PROJECT_ID,
        projectName: TEST_PROJECT_NAME,
        submittedBy: WALLET_OWNER,
        qualityScore: 0.88,
        flagReasons: [],
      });

      await verificationService.submitVerificationRequest(
        TEST_PROJECT_ID,
        TEST_PROJECT_NAME,
        WALLET_OWNER,
      );

      const assigned = await verificationService.assignRequest(
        TEST_PROJECT_ID,
        ADMIN_WALLET,
        ADMIN_WALLET,
      );
      expect(assigned.assignedTo).toBe(ADMIN_WALLET);
      expect(assigned.assignedAt).toBeTruthy();

      const assignedRequests = await verificationService.getRequestsAssignedTo(ADMIN_WALLET);
      expect(assignedRequests).toHaveLength(1);

      const approved = await verificationService.approveRequest(
        TEST_PROJECT_ID,
        ADMIN_WALLET,
      );
      expect(approved.status).toBe("VERIFIED");
      expect(approved.statusUpdatedBy).toBe(ADMIN_WALLET);

      const statusAfterApprove = await verificationService.getVerificationStatus(TEST_PROJECT_ID);
      expect(statusAfterApprove).toBe("VERIFIED");

      const stats = await verificationService.getStats();
      expect(stats.total).toBe(1);
      expect(stats.verified).toBe(1);
      expect(stats.pending).toBe(0);
      expect(stats.rejected).toBe(0);

      const pendingAfterApprove = await verificationService.getPendingRequests();
      expect(pendingAfterApprove).toHaveLength(0);
    });

    it("flows through verification lifecycle with admin reject and reset", async () => {
      projectSubmissionService.recordSubmission({
        projectId: TEST_PROJECT_ID,
        projectName: TEST_PROJECT_NAME,
        submittedBy: WALLET_OWNER,
        qualityScore: 0.45,
        flagReasons: ["incomplete-info"],
      });

      await verificationService.submitVerificationRequest(
        TEST_PROJECT_ID,
        TEST_PROJECT_NAME,
        WALLET_OWNER,
      );

      const rejected = await verificationService.rejectRequest(
        TEST_PROJECT_ID,
        ADMIN_WALLET,
        "Missing audit report and incomplete documentation",
      );
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.rejectionReason).toBe("Missing audit report and incomplete documentation");

      const statusAfterReject = await verificationService.getVerificationStatus(TEST_PROJECT_ID);
      expect(statusAfterReject).toBe("REJECTED");

      const requestStatus = await verificationService.getRequestStatus(TEST_PROJECT_ID);
      expect(requestStatus.request?.rejectionReason).toBe("Missing audit report and incomplete documentation");

      await verificationService.resetVerification(TEST_PROJECT_ID);

      const statusAfterReset = await verificationService.getVerificationStatus(TEST_PROJECT_ID);
      expect(statusAfterReset).toBe("NONE");

      const requestAfterReset = await verificationService.getVerificationRequest(TEST_PROJECT_ID);
      expect(requestAfterReset).toBeNull();

      const newRequestId = await verificationService.submitVerificationRequest(
        TEST_PROJECT_ID,
        TEST_PROJECT_NAME,
        WALLET_OWNER,
      );
      expect(newRequestId).toMatch(/^ver-soroban-swap-/);
      const newStatus = await verificationService.getVerificationStatus(TEST_PROJECT_ID);
      expect(newStatus).toBe("PENDING");
    });

    it("prevents duplicate pending verification requests", async () => {
      projectSubmissionService.recordSubmission({
        projectId: TEST_PROJECT_ID,
        projectName: TEST_PROJECT_NAME,
        submittedBy: WALLET_OWNER,
        qualityScore: 0.8,
        flagReasons: [],
      });

      await verificationService.submitVerificationRequest(
        TEST_PROJECT_ID,
        TEST_PROJECT_NAME,
        WALLET_OWNER,
      );

      await expect(
        verificationService.submitVerificationRequest(
          TEST_PROJECT_ID,
          TEST_PROJECT_NAME,
          WALLET_REVIEWER,
        ),
      ).rejects.toThrow("already pending");

      const allRequests = await verificationService.getAllRequests();
      expect(allRequests).toHaveLength(1);
    });

    it("moderation log is maintained through status transitions", async () => {
      const submission = projectSubmissionService.recordSubmission({
        projectId: TEST_PROJECT_ID,
        projectName: TEST_PROJECT_NAME,
        submittedBy: WALLET_OWNER,
        qualityScore: 0.7,
        flagReasons: ["needs-review"],
      });
      expect(submission.status).toBe("pending");

      const approveResult = projectSubmissionService.updateStatus(
        TEST_PROJECT_ID,
        "approved",
        ADMIN_WALLET,
        "All checks passed",
      );
      expect(approveResult.success).toBe(true);
      expect(approveResult.submission?.status).toBe("approved");

      const log = projectSubmissionService.getModerationLog();
      expect(log).toHaveLength(1);
      expect(log[0].projectId).toBe(TEST_PROJECT_ID);
      expect(log[0].moderatorAddress).toBe(ADMIN_WALLET);
      expect(log[0].action).toBe("approved");
      expect(log[0].reason).toBe("All checks passed");

      const updatedSubmission = projectSubmissionService.getSubmissionByProjectId(TEST_PROJECT_ID);
      expect(updatedSubmission?.statusUpdatedBy).toBe(ADMIN_WALLET);
    });

    it("verification service getRequestStatus distinguishes project existence", async () => {
      const nonExistent = await verificationService.getRequestStatus("non-existent-project");
      expect(nonExistent.projectExists).toBe(false);
      expect(nonExistent.requestExists).toBe(false);
      expect(nonExistent.request).toBeNull();
    });
  });

  describe("Flow 2: Review Submission → Review List Update", () => {
    it("submits a review and updates project review list with data consistency", async () => {
      const comment = "This is an excellent project with great documentation and active development.";
      const rating = 5;

      const addResult = await reviewService.addReview(
        {
          projectId: TEST_PROJECT_ID,
          projectName: TEST_PROJECT_NAME,
          rating,
          comment,
        },
        WALLET_REVIEWER,
      );

      expect(addResult.success).toBe(true);
      expect(addResult.data).toBeDefined();
      expect(addResult.data?.projectId).toBe(TEST_PROJECT_ID);
      expect(addResult.data?.userAddress).toBe(WALLET_REVIEWER);
      expect(addResult.data?.rating).toBe(rating);
      expect(addResult.data?.comment).toBe(comment);
      expect(addResult.data?.id).toBeTruthy();
      expect(addResult.data?.createdAt).toBeTruthy();

      const projectReviews = await reviewService.getReviewsByProject(TEST_PROJECT_ID);
      expect(projectReviews).toHaveLength(1);
      expect(projectReviews[0].id).toBe(addResult.data?.id);
      expect(projectReviews[0].rating).toBe(rating);

      const userReviews = await reviewService.getReviewsByUser(WALLET_REVIEWER);
      expect(userReviews).toHaveLength(1);
      expect(userReviews[0].projectId).toBe(TEST_PROJECT_ID);

      const allReviews = await reviewService.getReviews();
      expect(allReviews).toHaveLength(1);
    });

    it("prevents duplicate reviews from same user on same project", async () => {
      const comment1 = "Great project with solid fundamentals.";
      const comment2 = "Actually I changed my mind, still great though.";

      await reviewService.addReview(
        {
          projectId: TEST_PROJECT_ID,
          projectName: TEST_PROJECT_NAME,
          rating: 4,
          comment: comment1,
        },
        WALLET_REVIEWER,
      );

      const duplicateResult = await reviewService.addReview(
        {
          projectId: TEST_PROJECT_ID,
          projectName: TEST_PROJECT_NAME,
          rating: 5,
          comment: comment2,
        },
        WALLET_REVIEWER,
      );

      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.errors).toBeDefined();
      expect(duplicateResult.errors?.[0].message).toContain("already reviewed");

      const projectReviews = await reviewService.getReviewsByProject(TEST_PROJECT_ID);
      expect(projectReviews).toHaveLength(1);
      expect(projectReviews[0].comment).toBe(comment1);
    });

    it("submits multiple reviews from different users and maintains list integrity", async () => {
      const reviewsData = [
        { user: WALLET_REVIEWER, rating: 5, comment: "Exceptional project, best in class for DeFi on Stellar." },
        { user: WALLET_OWNER, rating: 4, comment: "Solid foundations, room for improvement on UX." },
        { user: WALLET_NEW_OWNER, rating: 3, comment: "Decent project, had some issues but overall functional." },
      ];

      for (const r of reviewsData) {
        const result = await reviewService.addReview(
          {
            projectId: TEST_PROJECT_ID,
            projectName: TEST_PROJECT_NAME,
            rating: r.rating,
            comment: r.comment,
          },
          r.user,
        );
        expect(result.success).toBe(true);
      }

      const projectReviews = await reviewService.getReviewsByProject(TEST_PROJECT_ID);
      expect(projectReviews).toHaveLength(3);

      const userAddresses = projectReviews.map(r => r.userAddress);
      expect(userAddresses).toContain(WALLET_REVIEWER);
      expect(userAddresses).toContain(WALLET_OWNER);
      expect(userAddresses).toContain(WALLET_NEW_OWNER);

      const reviewer1Reviews = await reviewService.getReviewsByUser(WALLET_REVIEWER);
      expect(reviewer1Reviews).toHaveLength(1);
      expect(reviewer1Reviews[0].rating).toBe(5);

      const totalReviews = await reviewService.getReviews();
      expect(totalReviews).toHaveLength(3);
    });

    it("updates existing review and reflects changes in review list", async () => {
      const addResult = await reviewService.addReview(
        {
          projectId: TEST_PROJECT_ID,
          projectName: TEST_PROJECT_NAME,
          rating: 3,
          comment: "Initial review - decent but needs work.",
        },
        WALLET_REVIEWER,
      );

      const reviewId = addResult.data!.id;

      const updateResult = await reviewService.updateReview(
        reviewId,
        {
          rating: 5,
          comment: "Updated review: Team addressed all my concerns, excellent now!",
        },
        WALLET_REVIEWER,
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.rating).toBe(5);
      expect(updateResult.data?.comment).toBe("Updated review: Team addressed all my concerns, excellent now!");

      const projectReviews = await reviewService.getReviewsByProject(TEST_PROJECT_ID);
      expect(projectReviews).toHaveLength(1);
      expect(projectReviews[0].rating).toBe(5);
      expect(projectReviews[0].comment).toContain("Team addressed all my concerns");
    });

    it("helpful/unhelpful votes are tracked and persisted consistently", async () => {
      const addResult = await reviewService.addReview(
        {
          projectId: TEST_PROJECT_ID,
          projectName: TEST_PROJECT_NAME,
          rating: 4,
          comment: "A very thorough and honest review of the project quality.",
        },
        WALLET_REVIEWER,
      );
      const reviewId = addResult.data!.id;

      const helpfulVote1 = await reviewService.voteHelpful(reviewId, WALLET_OWNER);
      expect(helpfulVote1.success).toBe(true);
      expect(helpfulVote1.data?.helpfulVotes).toContain(WALLET_OWNER);

      const helpfulVote2 = await reviewService.voteHelpful(reviewId, WALLET_NEW_OWNER);
      expect(helpfulVote2.success).toBe(true);
      expect(helpfulVote2.data?.helpfulVotes).toHaveLength(2);

      const unhelpfulVote = await reviewService.voteUnhelpful(reviewId, ADMIN_WALLET);
      expect(unhelpfulVote.success).toBe(true);
      expect(unhelpfulVote.data?.unhelpfulVotes).toContain(ADMIN_WALLET);

      const helpfulToggle = await reviewService.voteHelpful(reviewId, WALLET_OWNER);
      expect(helpfulToggle.data?.helpfulVotes).not.toContain(WALLET_OWNER);
      expect(helpfulToggle.data?.helpfulVotes).toHaveLength(1);

      const projectReviews = await reviewService.getReviewsByProject(TEST_PROJECT_ID);
      expect(projectReviews[0].helpfulVotes).toHaveLength(1);
      expect(projectReviews[0].unhelpfulVotes).toHaveLength(1);
    });

    it("deletes review and maintains list consistency", async () => {
      await reviewService.addReview(
        {
          projectId: TEST_PROJECT_ID,
          projectName: TEST_PROJECT_NAME,
          rating: 5,
          comment: "Amazing project with incredible team support.",
        },
        WALLET_REVIEWER,
      );

      await reviewService.addReview(
        {
          projectId: "another-project",
          projectName: "Another Project",
          rating: 3,
          comment: "Not bad, could use some more features to be competitive.",
        },
        WALLET_REVIEWER,
      );

      const userReviews = await reviewService.getReviewsByUser(WALLET_REVIEWER);
      expect(userReviews).toHaveLength(2);

      const toDelete = userReviews.find(r => r.projectId === TEST_PROJECT_ID)!;
      const deleteResult = await reviewService.deleteReview(toDelete.id, WALLET_REVIEWER);
      expect(deleteResult.success).toBe(true);

      const projectReviewsAfter = await reviewService.getReviewsByProject(TEST_PROJECT_ID);
      expect(projectReviewsAfter).toHaveLength(0);

      const userReviewsAfter = await reviewService.getReviewsByUser(WALLET_REVIEWER);
      expect(userReviewsAfter).toHaveLength(1);
      expect(userReviewsAfter[0].projectId).toBe("another-project");
    });

    it("validates review constraints before accepting submission", async () => {
      const shortCommentResult = await reviewService.addReview(
        {
          projectId: TEST_PROJECT_ID,
          projectName: TEST_PROJECT_NAME,
          rating: 5,
          comment: "too short",
        },
        WALLET_REVIEWER,
      );
      expect(shortCommentResult.success).toBe(false);
      expect(shortCommentResult.errors).toBeDefined();
      expect(shortCommentResult.errors?.[0].field).toBe("comment");

      const invalidRatingResult = await reviewService.addReview(
        {
          projectId: TEST_PROJECT_ID,
          projectName: TEST_PROJECT_NAME,
          rating: 99,
          comment: "This is a valid comment length for testing purposes.",
        },
        WALLET_REVIEWER,
      );
      expect(invalidRatingResult.success).toBe(false);
      expect(invalidRatingResult.errors?.[0].field).toBe("rating");

      const allReviews = await reviewService.getReviews();
      expect(allReviews).toHaveLength(0);
    });

    it("maintains consistent project isolation between review sets", async () => {
      await reviewService.addReview(
        {
          projectId: "project-a",
          projectName: "Project A",
          rating: 5,
          comment: "Absolutely loved this project, would highly recommend to everyone.",
        },
        WALLET_REVIEWER,
      );
      await reviewService.addReview(
        {
          projectId: "project-b",
          projectName: "Project B",
          rating: 4,
          comment: "Very solid implementation with clean documentation and good support.",
        },
        WALLET_REVIEWER,
      );
      await reviewService.addReview(
        {
          projectId: "project-a",
          projectName: "Project A",
          rating: 3,
          comment: "It is an okay project, nothing too special but functional enough.",
        },
        WALLET_OWNER,
      );

      const reviewsA = await reviewService.getReviewsByProject("project-a");
      const reviewsB = await reviewService.getReviewsByProject("project-b");

      expect(reviewsA).toHaveLength(2);
      expect(reviewsB).toHaveLength(1);

      const ratingsA = reviewsA.map(r => r.rating).sort((a, b) => b - a);
      expect(ratingsA).toEqual([5, 3]);
    });
  });

  describe("Flow 3: Ownership Transfer → Project Data Consistency", () => {
    it("transfers ownership and maintains consistent project data across services", () => {
      const initialOwner = projectOwnerService.getProjectOwnerOverride(TEST_PROJECT_ID);
      expect(initialOwner).toBeUndefined();

      projectOwnerService.setProjectOwnerOverride(TEST_PROJECT_ID, WALLET_NEW_OWNER);

      const newOwner = projectOwnerService.getProjectOwnerOverride(TEST_PROJECT_ID);
      expect(newOwner).toBe(WALLET_NEW_OWNER);

      const rawStorage = JSON.parse(localStorage.getItem("dongle_project_owner_overrides") || "{}");
      expect(rawStorage[TEST_PROJECT_ID]).toBe(WALLET_NEW_OWNER);
    });

    it("clears ownership override and reverts to original owner", () => {
      projectOwnerService.setProjectOwnerOverride(TEST_PROJECT_ID, WALLET_NEW_OWNER);
      expect(projectOwnerService.getProjectOwnerOverride(TEST_PROJECT_ID)).toBe(WALLET_NEW_OWNER);

      projectOwnerService.setProjectOwnerOverride(TEST_PROJECT_ID, null);
      expect(projectOwnerService.getProjectOwnerOverride(TEST_PROJECT_ID)).toBeUndefined();

      const rawStorage = JSON.parse(localStorage.getItem("dongle_project_owner_overrides") || "{}");
      expect(rawStorage[TEST_PROJECT_ID]).toBeUndefined();
    });

    it("maintains ownership consistency across multiple project transfers", () => {
      const projectIds = ["project-1", "project-2", "project-3"];

      projectIds.forEach((id, idx) => {
        const owners = [WALLET_OWNER, WALLET_NEW_OWNER, WALLET_REVIEWER];
        projectOwnerService.setProjectOwnerOverride(id, owners[idx]);
      });

      expect(projectOwnerService.getProjectOwnerOverride("project-1")).toBe(WALLET_OWNER);
      expect(projectOwnerService.getProjectOwnerOverride("project-2")).toBe(WALLET_NEW_OWNER);
      expect(projectOwnerService.getProjectOwnerOverride("project-3")).toBe(WALLET_REVIEWER);

      projectOwnerService.setProjectOwnerOverride("project-2", ADMIN_WALLET);
      expect(projectOwnerService.getProjectOwnerOverride("project-2")).toBe(ADMIN_WALLET);

      expect(projectOwnerService.getProjectOwnerOverride("project-1")).toBe(WALLET_OWNER);
      expect(projectOwnerService.getProjectOwnerOverride("project-3")).toBe(WALLET_REVIEWER);

      projectOwnerService.setProjectOwnerOverride("project-3", undefined);
      expect(projectOwnerService.getProjectOwnerOverride("project-3")).toBeUndefined();
    });

    it("ownership transfer verification with combined submission state", async () => {
      projectOwnerService.setProjectOwnerOverride(TEST_PROJECT_ID, WALLET_NEW_OWNER);

      const submission = projectSubmissionService.recordSubmission({
        projectId: TEST_PROJECT_ID,
        projectName: TEST_PROJECT_NAME,
        submittedBy: WALLET_NEW_OWNER,
        qualityScore: 0.95,
        flagReasons: [],
      });

      expect(submission.submittedBy).toBe(WALLET_NEW_OWNER);
      expect(submission.status).toBe("approved");

      projectOwnerService.setProjectOwnerOverride(TEST_PROJECT_ID, WALLET_REVIEWER);

      const requestId = await verificationService.submitVerificationRequest(
        TEST_PROJECT_ID,
        TEST_PROJECT_NAME,
        WALLET_REVIEWER,
      );
      expect(requestId).toBeTruthy();

      const verificationRequest = await verificationService.getVerificationRequest(TEST_PROJECT_ID);
      expect(verificationRequest?.submittedBy).toBe(WALLET_REVIEWER);
      expect(verificationRequest?.status).toBe("PENDING");
    });
  });

  describe("Flow 4: Draft Save → Project Form Auto-Populate", () => {
    const DRAFT_DATA: ProjectDraft["data"] = {
      name: "My New DeFi Protocol",
      primaryCategory: "defi",
      tags: ["AMM", "Staking", "Yield"],
      description: "An innovative DeFi protocol that combines automated market making with sustainable yield strategies.",
      websiteUrl: "https://mydefi.io",
      githubUrl: "https://github.com/mydefi/protocol",
      logoUrl: "https://mydefi.io/logo.png",
      docsUrl: "https://docs.mydefi.io",
      auditReportUrl: "https://mydefi.io/audit.pdf",
      bugBountyUrl: "https://mydefi.io/bounty",
    };

    it("saves a create-mode draft and retrieves it for form auto-populate", () => {
      const draftInput: Omit<ProjectDraft, "lastSaved"> = {
        id: "draft-create-001",
        mode: "create",
        data: DRAFT_DATA,
      };

      draftService.saveDraft(draftInput, WALLET_OWNER);

      const retrieved = draftService.getDraft("draft-create-001", WALLET_OWNER);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("draft-create-001");
      expect(retrieved?.mode).toBe("create");
      expect(retrieved?.lastSaved).toBeTruthy();

      expect(retrieved?.data.name).toBe(DRAFT_DATA.name);
      expect(retrieved?.data.primaryCategory).toBe(DRAFT_DATA.primaryCategory);
      expect(retrieved?.data.tags).toEqual(DRAFT_DATA.tags);
      expect(retrieved?.data.description).toBe(DRAFT_DATA.description);
      expect(retrieved?.data.websiteUrl).toBe(DRAFT_DATA.websiteUrl);
      expect(retrieved?.data.githubUrl).toBe(DRAFT_DATA.githubUrl);
      expect(retrieved?.data.logoUrl).toBe(DRAFT_DATA.logoUrl);
      expect(retrieved?.data.docsUrl).toBe(DRAFT_DATA.docsUrl);
      expect(retrieved?.data.auditReportUrl).toBe(DRAFT_DATA.auditReportUrl);
      expect(retrieved?.data.bugBountyUrl).toBe(DRAFT_DATA.bugBountyUrl);

      const forProject = draftService.getDraftForProject("create", undefined, WALLET_OWNER);
      expect(forProject?.id).toBe("draft-create-001");
    });

    it("saves an edit-mode draft and retrieves it by projectId", () => {
      const draftInput: Omit<ProjectDraft, "lastSaved"> = {
        id: "draft-edit-001",
        mode: "edit",
        projectId: TEST_PROJECT_ID,
        data: {
          name: TEST_PROJECT_NAME + " Updated",
          primaryCategory: "defi",
          tags: ["DeFi", "Update"],
          description: "Updated description with more details about the protocol features.",
          websiteUrl: "https://updated-soroban-swap.com",
          githubUrl: "https://github.com/example/updated-soroban-swap",
          logoUrl: "https://example.com/updated-logo.png",
          docsUrl: "https://docs-updated.soroban-swap.com",
          auditReportUrl: "https://example.com/audit-v2.pdf",
          bugBountyUrl: "https://example.com/bounty-v2",
        },
      };

      draftService.saveDraft(draftInput, WALLET_OWNER);

      const byId = draftService.getDraft("draft-edit-001", WALLET_OWNER);
      expect(byId).not.toBeNull();
      expect(byId?.mode).toBe("edit");
      expect(byId?.projectId).toBe(TEST_PROJECT_ID);

      const forEdit = draftService.getDraftForProject("edit", TEST_PROJECT_ID, WALLET_OWNER);
      expect(forEdit?.id).toBe("draft-edit-001");
      expect(forEdit?.projectId).toBe(TEST_PROJECT_ID);
      expect(forEdit?.data.name).toBe(TEST_PROJECT_NAME + " Updated");

      const forOtherProject = draftService.getDraftForProject("edit", "other-project", WALLET_OWNER);
      expect(forOtherProject).toBeNull();

      const createDraftStill = draftService.getDraftForProject("create", undefined, WALLET_OWNER);
      expect(createDraftStill).toBeNull();
    });

    it("updates existing draft content and reflects changes immediately", () => {
      const firstSave: Omit<ProjectDraft, "lastSaved"> = {
        id: "draft-evolving",
        mode: "create",
        data: {
          name: "Project Alpha",
          primaryCategory: "infrastructure",
          tags: [],
          description: "First pass description, just getting started.",
          websiteUrl: "",
          githubUrl: "",
          logoUrl: "",
          docsUrl: "",
        },
      };

      draftService.saveDraft(firstSave, WALLET_OWNER);
      const firstRetrieve = draftService.getDraft("draft-evolving", WALLET_OWNER);
      expect(firstRetrieve?.data.name).toBe("Project Alpha");
      expect(firstRetrieve?.data.tags).toHaveLength(0);

      const updatedSave: Omit<ProjectDraft, "lastSaved"> = {
        id: "draft-evolving",
        mode: "create",
        data: {
          name: "Project Omega - Infrastructure Suite",
          primaryCategory: "infrastructure",
          tags: ["Infrastructure", "Node", "API"],
          description: "Comprehensive infrastructure platform for Stellar ecosystem projects.",
          websiteUrl: "https://omega-infra.io",
          githubUrl: "https://github.com/omega-infra/core",
          logoUrl: "https://omega-infra.io/branding/logo.png",
          docsUrl: "https://docs.omega-infra.io/v1",
          auditReportUrl: "https://omega-infra.io/security/audit-report.pdf",
          bugBountyUrl: "https://omega-infra.io/security/bug-bounty",
        },
      };

      draftService.saveDraft(updatedSave, WALLET_OWNER);

      const afterUpdate = draftService.getDraft("draft-evolving", WALLET_OWNER);
      expect(afterUpdate?.data.name).toBe("Project Omega - Infrastructure Suite");
      expect(afterUpdate?.data.tags).toEqual(["Infrastructure", "Node", "API"]);
      expect(afterUpdate?.data.description).toBe("Comprehensive infrastructure platform for Stellar ecosystem projects.");
      expect(afterUpdate?.data.websiteUrl).toBe("https://omega-infra.io");
      expect(afterUpdate?.data.auditReportUrl).toBe("https://omega-infra.io/security/audit-report.pdf");
      expect(afterUpdate?.lastSaved).not.toBe(firstRetrieve?.lastSaved);
    });

    it("maintains draft isolation across different wallets", () => {
      draftService.saveDraft({
        id: "wallet-1-draft",
        mode: "create",
        data: { ...DRAFT_DATA, name: "Wallet 1 Project" },
      }, WALLET_OWNER);

      draftService.saveDraft({
        id: "wallet-2-draft",
        mode: "create",
        data: { ...DRAFT_DATA, name: "Wallet 2 Project" },
      }, WALLET_REVIEWER);

      const wallet1Drafts = draftService.getAllDrafts(WALLET_OWNER);
      expect(wallet1Drafts).toHaveLength(1);
      expect(wallet1Drafts[0].data.name).toBe("Wallet 1 Project");

      const wallet2Drafts = draftService.getAllDrafts(WALLET_REVIEWER);
      expect(wallet2Drafts).toHaveLength(1);
      expect(wallet2Drafts[0].data.name).toBe("Wallet 2 Project");

      const retrieved1 = draftService.getDraft("wallet-2-draft", WALLET_OWNER);
      expect(retrieved1).toBeNull();
    });

    it("deletes draft and confirms form will no longer auto-populate", () => {
      draftService.saveDraft({
        id: "draft-to-delete",
        mode: "create",
        data: DRAFT_DATA,
      }, WALLET_OWNER);

      expect(draftService.getDraft("draft-to-delete", WALLET_OWNER)).not.toBeNull();

      draftService.deleteDraft("draft-to-delete", WALLET_OWNER);

      const afterDelete = draftService.getDraft("draft-to-delete", WALLET_OWNER);
      expect(afterDelete).toBeNull();

      const allAfter = draftService.getAllDrafts(WALLET_OWNER);
      expect(allAfter).toHaveLength(0);

      const forCreate = draftService.getDraftForProject("create", undefined, WALLET_OWNER);
      expect(forCreate).toBeNull();
    });

    it("clearAllDrafts wipes every draft across all modes", () => {
      draftService.saveDraft({
        id: "create-draft-1",
        mode: "create",
        data: DRAFT_DATA,
      }, WALLET_OWNER);

      draftService.saveDraft({
        id: "edit-draft-1",
        mode: "edit",
        projectId: TEST_PROJECT_ID,
        data: DRAFT_DATA,
      }, WALLET_OWNER);

      expect(draftService.getAllDrafts(WALLET_OWNER)).toHaveLength(2);

      draftService.clearAllDrafts();

      expect(draftService.getAllDrafts(WALLET_OWNER)).toHaveLength(0);
      expect(draftService.getDraftForProject("create", undefined, WALLET_OWNER)).toBeNull();
      expect(draftService.getDraftForProject("edit", TEST_PROJECT_ID, WALLET_OWNER)).toBeNull();
    });

    it("hasContent correctly detects populated vs empty draft forms", () => {
      const emptyData: ProjectDraft["data"] = {
        name: "",
        primaryCategory: "defi",
        tags: [],
        description: "",
        websiteUrl: "",
        githubUrl: "",
        logoUrl: "",
        docsUrl: "",
      };
      expect(draftService.hasContent(emptyData)).toBe(false);

      const withName: ProjectDraft["data"] = { ...emptyData, name: "A" };
      expect(draftService.hasContent(withName)).toBe(true);

      const withDescription: ProjectDraft["data"] = { ...emptyData, description: "Short" };
      expect(draftService.hasContent(withDescription)).toBe(true);

      const withWebsite: ProjectDraft["data"] = { ...emptyData, websiteUrl: "https://x.com" };
      expect(draftService.hasContent(withWebsite)).toBe(true);

      const withTags: ProjectDraft["data"] = { ...emptyData, tags: ["one"] };
      expect(draftService.hasContent(withTags)).toBe(true);

      const withAuditUrl: ProjectDraft["data"] = { ...emptyData, auditReportUrl: "https://audit.pdf" };
      expect(draftService.hasContent(withAuditUrl)).toBe(true);
    });

    it("multiple drafts with different modes coexist and are retrievable", () => {
      draftService.saveDraft({
        id: "draft-create-new",
        mode: "create",
        data: { ...DRAFT_DATA, name: "Brand New Project" },
      }, WALLET_OWNER);

      draftService.saveDraft({
        id: "draft-edit-existing",
        mode: "edit",
        projectId: TEST_PROJECT_ID,
        data: { ...DRAFT_DATA, name: TEST_PROJECT_NAME + " (edited)" },
      }, WALLET_OWNER);

      const all = draftService.getAllDrafts(WALLET_OWNER);
      expect(all).toHaveLength(2);

      const createOnly = draftService.getDraftForProject("create", undefined, WALLET_OWNER);
      expect(createOnly?.mode).toBe("create");
      expect(createOnly?.data.name).toBe("Brand New Project");

      const editOnly = draftService.getDraftForProject("edit", TEST_PROJECT_ID, WALLET_OWNER);
      expect(editOnly?.mode).toBe("edit");
      expect(editOnly?.projectId).toBe(TEST_PROJECT_ID);
      expect(editOnly?.data.name).toBe(TEST_PROJECT_NAME + " (edited)");
    });
  });

  describe("Cross-Service Consistency: Combined Flows", () => {
    it("runs registration + draft + review flow with consistent cross-service state", async () => {
      const projectId = "cross-test-project";
      const projectName = "Cross Test Project";
      const owner = WALLET_OWNER;
      const reviewer = WALLET_REVIEWER;

      draftService.saveDraft({
        id: "cross-draft",
        mode: "create",
        data: {
          name: projectName,
          primaryCategory: "defi",
          tags: ["Cross", "Test"],
          description: "A project used to test end-to-end cross-service consistency.",
          websiteUrl: "https://cross-test.io",
          githubUrl: "https://github.com/cross/test",
          logoUrl: "",
          docsUrl: "",
        },
      }, owner);

      const draftCheck = draftService.getDraftForProject("create", undefined, owner);
      expect(draftCheck).not.toBeNull();
      expect(draftCheck?.data.name).toBe(projectName);

      projectSubmissionService.recordSubmission({
        projectId,
        projectName,
        submittedBy: owner,
        qualityScore: 0.9,
        flagReasons: [],
      });

      await verificationService.submitVerificationRequest(projectId, projectName, owner);
      const verStatus = await verificationService.getVerificationStatus(projectId);
      expect(verStatus).toBe("PENDING");

      await verificationService.approveRequest(projectId, ADMIN_WALLET);
      const verApproved = await verificationService.getVerificationStatus(projectId);
      expect(verApproved).toBe("VERIFIED");

      const addResult = await reviewService.addReview({
        projectId,
        projectName,
        rating: 5,
        comment: "Great cross-service test project, everything works seamlessly together.",
      }, reviewer);
      expect(addResult.success).toBe(true);

      projectOwnerService.setProjectOwnerOverride(projectId, WALLET_NEW_OWNER);
      expect(projectOwnerService.getProjectOwnerOverride(projectId)).toBe(WALLET_NEW_OWNER);

      const projectReviews = await reviewService.getReviewsByProject(projectId);
      expect(projectReviews).toHaveLength(1);

      const verFinal = await verificationService.getVerificationStatus(projectId);
      expect(verFinal).toBe("VERIFIED");

      const submission = projectSubmissionService.getSubmissionByProjectId(projectId);
      expect(submission?.status).toBe("approved");

      draftService.deleteDraft("cross-draft", owner);
      expect(draftService.getDraft("cross-draft", owner)).toBeNull();
    });

    it("review count stays consistent when adding and deleting reviews with verification active", async () => {
      const projectId = "count-test-project";
      const projectName = "Count Test Project";

      projectSubmissionService.recordSubmission({
        projectId,
        projectName,
        submittedBy: WALLET_OWNER,
        qualityScore: 0.85,
        flagReasons: [],
      });

      await verificationService.submitVerificationRequest(projectId, projectName, WALLET_OWNER);

      const reviewIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const r = await reviewService.addReview({
          projectId,
          projectName,
          rating: (i % 5) + 1,
          comment: `Review number ${i + 1} with enough content to satisfy minimum length validation requirements properly.`,
        }, WALLET_REVIEWER);
        expect(r.success).toBe(false);
        if (r.success && r.data) {
          reviewIds.push(r.data.id);
        }
      }

      expect(reviewIds).toHaveLength(0);

      const r1 = await reviewService.addReview({
        projectId,
        projectName,
        rating: 4,
        comment: "First review from user one with a sufficiently long descriptive comment body.",
      }, WALLET_REVIEWER);
      const r2 = await reviewService.addReview({
        projectId,
        projectName,
        rating: 5,
        comment: "Second review from user two also with proper length and enough detail to pass.",
      }, WALLET_OWNER);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);

      const after2 = await reviewService.getReviewsByProject(projectId);
      expect(after2).toHaveLength(2);

      await reviewService.deleteReview(r1.data!.id, WALLET_REVIEWER);

      const afterDelete = await reviewService.getReviewsByProject(projectId);
      expect(afterDelete).toHaveLength(1);
      expect(afterDelete[0].id).toBe(r2.data?.id);

      const verStatus = await verificationService.getVerificationStatus(projectId);
      expect(verStatus).toBe("PENDING");
    });
  });
});
