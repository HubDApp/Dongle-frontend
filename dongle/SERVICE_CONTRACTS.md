# Dongle Frontend Service API Contracts & Architecture Documentation

This document defines the formal API contracts for all core services in the `Dongle-frontend` application. It specifies method signatures, expected inputs, return types, error handling contracts, UI integration expectations, and differences between mock (local development) and production modes.

---

## Table of Contents
1. [Architecture Overview & Persistence Strategy](#1-architecture-overview--persistence-strategy)
2. [Project Services](#2-project-services)
   - [ProjectService](#projectservice)
   - [ProjectSubmissionService](#projectsubmissionservice)
   - [ProjectClaimService](#projectclaimservice)
   - [ProjectOwnerService](#projectownerservice)
   - [ProjectReportService](#projectreportservice)
3. [Review Services](#3-review-services)
   - [ReviewService](#reviewservice)
   - [ReviewReportService](#reviewreportservice)
   - [ReviewApiService](#reviewapiservice)
4. [Stellar & Soroban Services](#4-stellar--soroban-services)
   - [StellarService](#stellarservice)
   - [SorobanService](#sorobanservice)
   - [VerificationService](#verificationservice)
   - [LazyStellarService & LazySorobanService](#lazystellarservice--lazysorobanservice)
5. [Wallet Service](#5-wallet-service)
   - [WalletService](#walletservice)
6. [Draft Services](#6-draft-services)
   - [DraftService](#draftservice)
   - [DraftApiService](#draftapiservice)
7. [Recent Views Service](#7-recent-views-service)
   - [RecentViewsService](#recentviewsservice)
8. [Repository Metadata Service](#8-repository-metadata-service)
   - [RepositoryService](#repositoryservice)
9. [Update Service](#9-update-service)
   - [UpdateService](#updateservice)
10. [Audit Log Service](#10-audit-log-service)
    - [AuditLogService](#auditlogservice)
11. [Data Access Abstraction Layer](#11-data-access-abstraction-layer)
    - [Registry & Repository Interfaces](#registry--repository-interfaces)

---

## 1. Architecture Overview & Persistence Strategy

The application uses a **Pluggable Data Access Layer**:
- **UI Components** consume domain services (`projectService`, `reviewService`, `walletService`, etc.).
- **Domain Services** delegate data fetching to abstraction interfaces registered in `DataAccessRegistry` (`IProjectRepository`, `IReviewRepository`, `IUpdateRepository`).
- **Environment Modes**:
  - **Local Development / Mock Mode**: Services operate in-memory or fallback to `localStorage` (AES-256 encrypted using `crypto-storage.ts`).
  - **Production Mode**: Repositories connect directly to Soroban RPC smart contracts, Horizon REST endpoints, and backend API servers.

---

## 2. Project Services

### ProjectService
`services/project/project.service.ts`

Single source of truth for project catalog data, search, filtering, and sorting.

#### Methods & API Contracts

##### `getAllProjects(): Project[]`
- **Inputs**: None
- **Outputs**: Array of `Project` objects.
- **Error Cases**: Returns empty array `[]` if no projects exist. Never throws.
- **UI Expectations**: Populates directory catalog and count badges.

##### `getProjectById(id: string): Project | null`
- **Inputs**: `id: string` - Unique project identifier.
- **Outputs**: `Project` object or `null` if not found. Applies active `projectOwnerService` address overrides if present.
- **Error Cases**: Returns `null` on missing ID or empty string.
- **UI Expectations**: Powers Project Detail pages (`/projects/[id]`). Triggers 404 page when returning `null`.

##### `getProjectsByCategory(category: string): Project[]`
- **Inputs**: `category: string` (e.g., `"DeFi"`, `"NFT"`, `"All"`).
- **Outputs**: Array of matching `Project` items. Passing `"All"` returns all projects.
- **Error Cases**: Returns `[]` if category matches no items.

##### `getProjectsByTags(tags: string[]): Project[]`
- **Inputs**: `tags: string[]` - Array of tag strings.
- **Outputs**: Projects matching at least one tag. Passing empty array returns all projects.

##### `getProjectsByOwner(ownerAddress: string): Project[]`
- **Inputs**: `ownerAddress: string` - Stellar G-address.
- **Outputs**: Projects where `ownerAddress` matches (trimmed case-insensitive match).

##### `getDiscoverableProjects(): Project[]`
- **Inputs**: None
- **Outputs**: Filtered array excluding moderated/hidden submissions.

##### `searchProjects(query: string): Project[]`
- **Inputs**: `query: string` - Case-insensitive query.
- **Outputs**: Projects where `name`, `description`, or `tags` match `query`.

##### `sortProjects(projects: Project[], sortBy: "rating" | "newest" | "popular"): Project[]`
- **Inputs**: `projects: Project[]`, `sortBy` criteria.
- **Outputs**: New sorted array without mutating input array.

##### `async fetchAll(): Promise<Project[]>` / `fetchById(id)` / `fetchByCategory(cat)` / `fetchSearch(query)`
- **Inputs**: Corresponding parameters.
- **Outputs**: Promise resolving to domain projects from active `IProjectRepository`.
- **Mock vs. Production**: Reads from `mockProjects` in mock mode; executes RPC/REST calls in production mode.

---

### ProjectSubmissionService
`services/project/project-submission.service.ts`

Manages project submission lifecycle, validation, and moderation status.

#### Methods & API Contracts

##### `submitProject(draftData: ProjectDraftData, ownerAddress: string): Promise<{ success: boolean; id?: string; error?: string }>`
- **Inputs**: `draftData` (fields: `name`, `primaryCategory`, `description`, `websiteUrl`, etc.), `ownerAddress` (Stellar public key).
- **Outputs**: Result object with generated submission ID on success.
- **Error Cases**:
  - Rejects if `name`, `description`, or `primaryCategory` are blank.
  - Rejects if `websiteUrl` is malformed.
  - Rejects if `ownerAddress` is invalid Stellar address format.
- **UI Expectations**: Shows inline field errors in `ProjectForm` and loading spinner during submission.

##### `isDiscoverable(projectId: string): boolean`
- **Inputs**: `projectId: string`
- **Outputs**: `true` if approved/pending; `false` if rejected or hidden by moderators.

##### `updateStatus(id: string, status: "pending" | "approved" | "rejected", notes?: string): void`
- **Inputs**: Submission ID, status enum, optional moderation notes.
- **Mock vs. Production**: Saved to `localStorage` in mock mode; sent to Admin REST endpoint in production.

---

### ProjectClaimService
`services/project/project-claim.service.ts`

Handles project ownership claim workflows and verification proofs.

#### Methods & API Contracts

##### `initiateClaim(projectId: string, claimerAddress: string, proofData: ClaimProof): Promise<ClaimResult>`
- **Inputs**:
  - `projectId: string`
  - `claimerAddress: string` (Stellar G-address)
  - `proofData: { proofType: "dns" | "github" | "signature"; proofValue: string }`
- **Outputs**: `{ claimId: string; status: "pending_verification" | "verified" | "failed"; message?: string }`
- **Error Cases**:
  - `INVALID_ADDRESS`: Claimer address fails Stellar StrKey checksum.
  - `ALREADY_CLAIMED`: Project already has verified owner.
  - `PROOF_INVALID`: Proof value empty or DNS TXT record missing.
- **UI Expectations**: Renders step-by-step Claim Modal with copyable verification tokens.

##### `finalizeClaim(claimId: string): Promise<boolean>`
- **Outputs**: `true` when ownership override is stored in `ProjectOwnerService`.

##### **Mock vs Production**:
- **Mock**: Simulates verification with 1500ms delay and auto-approves valid DNS strings.
- **Production**: Interacts with Soroban Ownership Registry contract and verifies DNS TXT records / GitHub Gists.

---

### ProjectOwnerService
`services/project/project-owner.service.ts`

Manages local runtime overrides and persistence for project ownership addresses.

#### Methods & API Contracts
- `getProjectOwnerOverride(projectId: string): string | null`
- `setProjectOwnerOverride(projectId: string, ownerAddress: string): void`
- `clearProjectOwnerOverride(projectId: string): void`
- **Error Handling**: SSR safe (checks `typeof window === "undefined"`).
- **UI Expectations**: Instant UI reflection on project header upon claiming.

---

### ProjectReportService
`services/project/project-report.service.ts`

Manages user reports against fraudulent or broken projects.

#### Methods & API Contracts
- `submitReport(report: { projectId: string; reporterAddress: string; reason: string; details: string }): Promise<{ success: boolean; reportId?: string; error?: string }>`
- **Error Cases**:
  - `DUPLICATE_REPORT`: Same wallet reported project within 24 hours.
  - `EMPTY_REASON`: Missing report category/reason.
- **UI Expectations**: Displays Report Modal and toast confirmation.

---

## 3. Review Services

### ReviewService
`services/review/review.service.ts`

Manages project reviews, ratings, upvotes/downvotes, and aggregated stats.

#### Methods & API Contracts

##### `getReviewsForProject(projectId: string): Review[]`
- **Inputs**: `projectId: string`
- **Outputs**: Array of `Review` objects sorted newest first.

##### `addReview(reviewData: Omit<Review, "id" | "createdAt" | "upvotes" | "downvotes">): Promise<Review>`
- **Inputs**: `{ projectId: string; authorAddress: string; rating: number; title: string; body: string }`
- **Outputs**: Created `Review` object.
- **Error Cases**:
  - `DUPLICATE_REVIEW`: Author already submitted a review for this project.
  - `INVALID_RATING`: Rating not between 1 and 5.
  - `SHORT_BODY`: Review text less than 10 characters.
- **UI Expectations**: Form validation on review submit dialog, updating project rating summary live.

##### `voteReview(reviewId: string, userAddress: string, voteType: "upvote" | "downvote"): void`
- **Inputs**: `reviewId`, `userAddress`, `voteType`.
- **Error Cases**: Toggles or updates existing vote if user already voted.

##### `getReviewStats(projectId: string): { averageRating: number; totalReviews: number; ratingDistribution: Record<number, number> }`
- **Outputs**: Rating metrics object for visual charts and star rating widgets.

##### **Mock vs Production**:
- **Mock**: Persisted in `MockReviewRepository` (`localStorage`).
- **Production**: Interacts with Soroban Review Contract / backend API indexer.

---

### ReviewReportService
`services/review/review-report.service.ts`

Manages reporting inappropriate or spam reviews.

#### Methods & API Contracts
- `reportReview(reviewId: string, reporterAddress: string, reason: string): Promise<boolean>`
- `getReportsForReview(reviewId: string): ReviewReport[]`
- **Error Handling**: Throws on missing parameters; logs warning on network error.

---

### ReviewApiService
`services/review/review-api.service.ts`

Remote REST HTTP transport service for review backend integration.

#### Methods & API Contracts
- `fetchProjectReviews(projectId: string): Promise<ApiResult<Review[]>>`
- `submitReviewRemote(payload: ReviewPayload): Promise<ApiResult<Review>>`
- **Error Cases**:
  - `HTTP 401`: Wallet signature / auth missing.
  - `HTTP 429`: Rate limit exceeded.
  - `HTTP 500`: Server error (UI falls back to local storage).

---

## 4. Stellar & Soroban Services

### StellarService
`services/stellar/stellar.service.ts`

Utility service for Horizon RPC queries and Stellar address validation.

#### Methods & API Contracts

##### `getAccountInfo(address: string): Promise<StellarAccountInfo | null>`
- **Inputs**: `address: string` (Stellar public key, starting with `G`).
- **Outputs**: Account sequence, balances, and signers.
- **Error Cases**:
  - `INVALID_ADDRESS`: Address fails StrKey checksum validation.
  - `ACCOUNT_NOT_FOUND`: HTTP 404 from Horizon (account not funded).
- **UI Expectations**: Displays XLM balance and funding warnings.

##### `isValidAddress(address: string): boolean`
- **Inputs**: `address: string`
- **Outputs**: `true` if valid Stellar StrKey G-address format.

##### **Mock vs Production**:
- **Mock**: Returns simulated 100.0 XLM balance for test addresses.
- **Production**: Queries `https://horizon-testnet.stellar.org` or Mainnet Horizon node.

---

### SorobanService
`services/soroban/soroban.service.ts`

Executes smart contract invocations and transaction simulations on Soroban.

#### Methods & API Contracts

##### `callContract(params: ContractCallParams): Promise<SorobanResult>`
- **Inputs**: `{ contractId: string; method: string; args: ScVal[]; signerAddress?: string }`
- **Outputs**: `{ success: boolean; result?: ScVal; txHash?: string; error?: string }`
- **Error Cases**:
  - `SIMULATION_FAILED`: Smart contract panic / abort during simulation.
  - `USER_REJECTED`: User cancelled signature request in Freighter.
  - `TX_FAILED`: Soroban transaction error code on ledger submission.
- **UI Expectations**: Displays transaction progress modal ("Simulating", "Awaiting Wallet Signature", "Submitting to Ledger", "Confirmed").

---

### VerificationService
`services/stellar/verification.service.ts`

Verifies project Stellar addresses, domains, and `stellar.toml` metadata.

#### Methods & API Contracts

##### `verifyDomainAssociation(domain: string, expectedAddress: string): Promise<VerificationResult>`
- **Inputs**: `domain: string`, `expectedAddress: string`.
- **Outputs**: `{ isVerified: boolean; domain: string; address: string; checkedAt: string; details?: string }`
- **Error Cases**:
  - `TOML_MISSING`: `/.well-known/stellar.toml` not found on domain.
  - `CORS_ERROR`: Domain blocks cross-origin fetches.
  - `ADDRESS_MISMATCH`: TOML does not contain expected address.
- **UI Expectations**: Renders Verified Badge checkmark on project header.

---

### LazyStellarService & LazySorobanService
`services/stellar/lazy-stellar.service.ts`, `services/stellar/lazy-soroban.service.ts`

Dynamic chunk loaders for heavy SDK dependencies (`stellar-sdk`).

#### API Contract
- Dynamically imports `stellar-sdk` modules on demand to prevent heavy initial bundle loads.
- Ensures fast First Contentful Paint (FCP) on mobile and web browsers.

---

## 5. Wallet Service

### WalletService
`services/wallet/wallet.service.ts`

Integrates with Stellar Freighter browser extension.

#### Methods & API Contracts

##### `isFreighterAvailable(): Promise<boolean>`
- **Outputs**: `true` if Freighter extension is detected in browser.

##### `connectWallet(): Promise<string>`
- **Outputs**: Resolves to user's Stellar public key address (`G...`).
- **Error Cases**:
  - `FREIGHTER_NOT_INSTALLED`: Extension missing. User prompted with installation link.
  - `USER_DENIED`: User closed prompt without approving connection.
- **UI Expectations**: Updates `WalletContext` state, button label, and triggers toast notification.

##### `getNetworkPassphrase(): Promise<string>`
- **Outputs**: Network passphrase string (e.g., `"Test SDF Network ; September 2015"`).
- **Error Cases**: Returns `null` when disconnected.
- **UI Expectations**: Compares against `EXPECTED_NETWORK_PASSPHRASE`. Renders network mismatch warning if wallet is on incorrect network.

---

## 6. Draft Services

### DraftService
`services/draft/draft.service.ts`

Manages auto-saved project submission drafts with hybrid server + encrypted local persistence.

#### Methods & API Contracts

##### `getAllDrafts(publicKey?: string | null, options?: DecryptOptions): ProjectDraft[]`
- **Inputs**: Optional Stellar public key address.
- **Outputs**: Array of `ProjectDraft` objects. Automatically migrates legacy unencrypted drafts on read.
- **Error Cases**:
  - If decryption fails (key mismatch / corrupt storage), logs `[CryptoStorage Warning]` and returns `[]`.

##### `saveDraft(draft: Omit<ProjectDraft, "lastSaved">, publicKey?: string | null): void`
- **Inputs**: Draft payload and optional Stellar public key.
- **Behavior**: Encrypts payload with AES-256 using SHA-256 hash of Stellar public key via `crypto-storage.ts` and saves to `localStorage`.

##### `saveDraftRemote(walletAddress: string, draft: ProjectDraft): Promise<ProjectDraft | null>`
- **Inputs**: Connected wallet address and draft object.
- **Outputs**: Saved draft with server timestamp, or `null` if remote sync fails (falls back to encrypted local storage).

##### `deleteDraft(draftId: string, publicKey?: string | null): void`
- **Behavior**: Removes specified draft from encrypted storage and remote backend.

##### **UI Expectations**:
- Debounced auto-save (2-second debounce).
- Displays status badge ("Draft saved 10:30 AM", "Saving...", "Sync Error - Saved Locally").

---

### DraftApiService
`services/draft/draft-api.service.ts`

Server-side API client for remote draft synchronization.

#### Methods & API Contracts
- `getDraft(walletAddress: string, draftId: string): Promise<ApiResult<ProjectDraft>>`
- `saveDraft(walletAddress: string, draft: Omit<ProjectDraft, "lastSaved">): Promise<ApiResult<ProjectDraft>>`
- `deleteDraft(walletAddress: string, draftId: string): Promise<ApiResult<{ success: boolean }>>`
- **Error Cases**: Returns `{ ok: false, status: number, error: string }` on HTTP errors (e.g., 404, 500).

---

## 7. Recent Views Service

### RecentViewsService
`services/recent-views/recent-views.service.ts`

Tracks user's recently viewed projects with encrypted local storage.

#### Methods & API Contracts

##### `getRecentViews(walletAddress?: string): RecentView[]`
- **Inputs**: Optional wallet address for wallet-scoped history.
- **Outputs**: Array of up to 10 most recent project view records `{ projectId, viewedAt, walletAddress }`.

##### `addView(projectId: string, walletAddress?: string): void`
- **Behavior**: Prepends new view record, deduplicates existing entry for project, limits history to 10 items, and encrypts result in `localStorage`.

##### `clearViews(walletAddress?: string): void`
- **Behavior**: Clears all or wallet-scoped view history.

##### **UI Expectations**:
- Powers "Recently Viewed" horizontal project cards carousel.

---

## 8. Repository Metadata Service

### RepositoryService
`services/repository/repository.service.ts`

Fetches external repository details from GitHub API.

#### Methods & API Contracts

##### `fetchRepoMetadata(githubUrl: string): Promise<RepoMetadata | null>`
- **Inputs**: `githubUrl: string` (e.g., `"https://github.com/stellar/soroban-example"`).
- **Outputs**: `{ stars: number; forks: number; openIssues: number; language: string; lastCommit: string }` or `null`.
- **Error Cases**:
  - `INVALID_URL`: URL is not a valid GitHub repository link.
  - `NOT_FOUND`: Repository is private or deleted (HTTP 404).
  - `RATE_LIMITED`: GitHub API rate limit reached (HTTP 403). UI shows fallback metadata.

##### **Mock vs Production**:
- **Mock**: Returns simulated GitHub stats for mock URLs.
- **Production**: Calls GitHub REST API v3.

---

## 9. Update Service

### UpdateService
`services/update/update.service.ts`

Manages project updates and announcements posted by verified project owners.

#### Methods & API Contracts

##### `getUpdatesForProject(projectId: string): Promise<ProjectUpdate[]>`
- **Outputs**: List of project updates sorted by `createdAt` descending.

##### `postUpdate(projectId: string, update: { title: string; content: string; authorAddress: string }): Promise<ProjectUpdate>`
- **Error Cases**:
  - `UNAUTHORIZED`: `authorAddress` does not match project owner.
  - `EMPTY_CONTENT`: Title or content is empty.
- **UI Expectations**: Project Timeline Tab, "Post Update" button (rendered only for verified project owner).

---

## 10. Audit Log Service

### AuditLogService
`services/audit/audit-log.service.ts`

Records critical security and admin actions for transparency.

#### Methods & API Contracts

##### `logEvent(event: Omit<AuditEvent, "id" | "timestamp">): void`
- **Inputs**: `{ action: string; actorAddress: string; targetId?: string; metadata?: Record<string, unknown> }`
- **Behavior**: Appends timestamped log entry.

##### `getLogs(filter?: AuditFilter): AuditEvent[]`
- **Outputs**: Filtered audit events list.

---

## 11. Data Access Abstraction Layer

`services/data-access/`

### Abstraction Interfaces
- `IProjectRepository`: `getAll()`, `getById(id)`, `getByCategory(category)`, `search(query)`
- `IReviewRepository`: `getByProjectId(projectId)`, `add(review)`, `vote(reviewId, voteType)`
- `IUpdateRepository`: `getByProjectId(projectId)`, `add(update)`

### Registry (`registry.ts`)
Allows dynamic dependency injection of backend implementations:
```typescript
import { registry } from "@/services/data-access/registry";
// In production app initialization:
registry.setProjectRepository(new SorobanProjectRepository());
```

---
*Documentation compiled and validated for Dongle Frontend Services API.*
