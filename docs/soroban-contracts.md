# Soroban Smart Contract Integration Reference

This document describes how the Dongle frontend integrates with Soroban smart contracts: contract addresses, function signatures, call patterns, error handling, and upgrade procedures.

## Overview

The Dongle protocol uses three Soroban registry contracts plus supporting infrastructure:

| Contract | Env Variable | Purpose |
|----------|--------------|---------|
| **Project Registry** | `NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT` | Register and manage dApp listings |
| **Review Registry** | `NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT` | On-chain ratings and review references |
| **Verification Registry** | `NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT` | Verification requests and status |

Configuration is centralized in `dongle/constants/contracts.ts`:

```typescript
export const DONGLE_CONTRACTS = {
  PROJECT_REGISTRY: parsedEnv.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT,
  REVIEW_REGISTRY: parsedEnv.NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT,
  VERIFICATION_REGISTRY: parsedEnv.NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT,
};

export const SOROBAN_CONFIG = {
  RPC_URL: parsedEnv.NEXT_PUBLIC_SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE: parsedEnv.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE,
};
```

### Implementation status

| Contract | On-chain calls | Current frontend backend |
|----------|----------------|--------------------------|
| Project Registry | `register_project`, `update_project` | `sorobanService` (with wallet fallback mocks) |
| Review Registry | Planned | `reviewService` (localStorage) |
| Verification Registry | Planned | `verificationService` (localStorage) |

When reading this document, treat **Implemented** sections as what `sorobanService` does today; **Target ABI** sections describe the expected contract interface for full on-chain integration.

---

## Environment Configuration

Create `.env.local` in the `dongle/` directory:

```env
NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT=C...
NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT=C...
NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT=C...
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

Contract IDs must match the Stellar format: 56-character base32 string starting with `C` (validated by `ContractIdSchema` in `constants/contracts.ts`).

In development and test, missing values fall back to a placeholder contract ID. Production builds require all values and fail fast at startup.

---

## Shared Integration Patterns

All write operations follow the same Soroban transaction pipeline implemented in `dongle/services/stellar/soroban.service.ts`:

```
1. walletService.getPublicKey()          → get signer
2. assertCorrectNetwork()                → verify Freighter network
3. server.getAccount(publicKey)          → fetch sequence number
4. Contract(DONGLE_CONTRACTS.*).call()   → build invoke operation
5. server.prepareTransaction()           → simulate + set footprint
6. walletService.signTransaction()       → user signs in Freighter
7. server.sendTransaction()              → submit to network
8. pollTransaction(hash)                 → wait for SUCCESS (≤60s)
```

### Single vs batch calls

| Pattern | When to use | Example |
|---------|-------------|---------|
| **Single invoke** | One state change, user-initiated action | `register_project`, `submit_review` |
| **Read-only simulate** | Fetch on-chain data without signing | Contract view calls via RPC simulation |
| **Batch (multi-op transaction)** | Multiple related writes that must succeed atomically | Register project + initial metadata in one tx |

**Current frontend:** All implemented writes are **single-invoke transactions**. Batch patterns are reserved for future flows where atomicity is required (e.g. pay verification fee + submit request in one transaction).

```typescript
// Single call (current pattern)
const contract = new Contract(DONGLE_CONTRACTS.PROJECT_REGISTRY);
const unsignedTx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
  .addOperation(contract.call("register_project", ...args))
  .setTimeout(30)
  .build();

// Batch call (future pattern — multiple operations, one signature)
const unsignedTx = new TransactionBuilder(source, opts)
  .addOperation(projectContract.call("register_project", ...projectArgs))
  .addOperation(feeContract.call("pay_verification_fee", ...feeArgs))
  .setTimeout(30)
  .build();
```

### Read patterns

| Pattern | Mechanism | Signing required |
|---------|-----------|------------------|
| Simulate + parse result | `server.simulateTransaction()` | No |
| Indexed events | Poll RPC / future indexer | No |
| Hybrid (on-chain ref + IPFS) | Read CID from contract, fetch content from IPFS | No |

Reviews and verification evidence are stored off-chain (IPFS); contracts store references (CIDs) and aggregated state.

---

## Project Registry

**Contract ID:** `DONGLE_CONTRACTS.PROJECT_REGISTRY`  
**Service:** `dongle/services/stellar/soroban.service.ts`

### Implemented functions

#### `register_project`

Registers a new project. Called by project owners via the Submit Project form.

```
register_project(
  name: Symbol,
  category: Symbol,
  description: Symbol,
  website_url: Symbol,
  github_url: Option<Symbol>,
  logo_url: Option<Symbol>,
  docs_url: Option<Symbol>,
) → void
```

**Frontend mapping** (`ProjectRegistrationParams` → ScVal args):

| Param | Type | Required |
|-------|------|----------|
| `name` | `string` | Yes |
| `category` | `string` | Yes |
| `description` | `string` | Yes |
| `websiteUrl` | `string` | Yes |
| `githubUrl` | `string` | No |
| `logoUrl` | `string` | No |
| `docsUrl` | `string` | No |

**Return type (frontend):**

```typescript
{ hash: string; status: "SUCCESS" }
```

**Call pattern:** Single signed transaction. Requires connected wallet on the expected network.

#### `update_project`

Updates an existing project. Only the on-chain owner may call.

```
update_project(
  project_id: Symbol,
  name: Symbol,
  category: Symbol,
  description: Symbol,
  website_url: Symbol,
  github_url: Option<Symbol>,
  logo_url: Option<Symbol>,
  docs_url: Option<Symbol>,
) → void
```

**Preconditions (enforced in frontend before tx):**

- Project exists (`getProject(projectId)`)
- `project.owner === publicKey`

**Return type (frontend):** `{ hash: string; status: "SUCCESS" }`

### Target ABI (read functions)

These are expected contract view functions for full integration:

```
get_project(project_id: Symbol) → ProjectData
list_projects(offset: u32, limit: u32) → Vec<ProjectData>
get_project_count() → u32
```

**Expected `ProjectData` shape** (matches `ProjectData` interface in `soroban.service.ts`):

```typescript
interface ProjectData {
  id: string;
  name: string;
  category: string;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  logoUrl: string;
  docsUrl: string;
  owner: string;      // Stellar public key (G...)
  createdAt: string;  // ISO timestamp or ledger time
}
```

---

## Review Registry

**Contract ID:** `DONGLE_CONTRACTS.REVIEW_REGISTRY`  
**Current service:** `dongle/services/review/review.service.ts` (localStorage)  
**Target service location:** `sorobanService` or dedicated `reviewContractService`

### Target ABI

```
submit_review(
  project_id: Symbol,
  rating: u32,           // 1–5
  comment_cid: Symbol,   // IPFS CID for full review text
) → ReviewId

update_review(
  review_id: Symbol,
  rating: u32,
  comment_cid: Symbol,
) → void

delete_review(review_id: Symbol) → void

get_review(review_id: Symbol) → Review
get_reviews_by_project(project_id: Symbol, offset: u32, limit: u32) → Vec<Review>
get_aggregate_rating(project_id: Symbol) → { average: u32, count: u32 }
has_reviewed(project_id: Symbol, reviewer: Address) → bool
```

### Expected types

```typescript
interface OnChainReview {
  id: string;
  projectId: string;
  userAddress: string;
  rating: number;        // 1–5 integer
  commentCid: string;    // IPFS reference
  createdAt: string;
  updatedAt?: string;
}
```

Validation constraints (mirrored from `types/review.ts`):

```typescript
REVIEW_CONSTRAINTS = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  COMMENT_MIN_LENGTH: 10,
  COMMENT_MAX_LENGTH: 1000,
}
```

### Call patterns

| Action | Pattern | Notes |
|--------|---------|-------|
| Submit review | Single invoke | Upload comment to IPFS first, pass CID to contract |
| Update review | Single invoke | One review per user per project enforced on-chain |
| Read reviews | Simulate (no sign) | Paginate with `offset`/`limit` |
| Aggregate rating | Simulate (no sign) | Display on project cards |

### Frontend integration flow (target)

```
1. Validate review locally (reviewService.validateReview)
2. Upload comment JSON to IPFS → receive CID
3. Build submit_review(project_id, rating, comment_cid) transaction
4. Sign + submit + poll
5. Re-fetch get_aggregate_rating(project_id) for UI update
```

---

## Verification Registry

**Contract ID:** `DONGLE_CONTRACTS.VERIFICATION_REGISTRY`  
**Current service:** `dongle/services/stellar/verification.service.ts` (localStorage)  
**Partial integration:** `sorobanService.requestVerification()` delegates to `verificationService`

### Target ABI

```
request_verification(
  project_id: Symbol,
  evidence_cid: Symbol,   // IPFS CID for audit docs / links
) → VerificationRequestId

approve_verification(
  project_id: Symbol,
) → void                    // admin / verifier only

reject_verification(
  project_id: Symbol,
  reason: Symbol,
) → void                    // admin / verifier only

revoke_verification(
  project_id: Symbol,
  reason: Symbol,
) → void                    // admin only

get_verification_status(project_id: Symbol) → VerificationStatus
get_verification_request(project_id: Symbol) → Option<VerificationRequest>
list_pending_requests(offset: u32, limit: u32) → Vec<VerificationRequest>
```

### Expected types

```typescript
type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

interface VerificationRequest {
  id: string;
  projectId: string;
  projectName: string;
  submittedBy: string;
  submittedAt: string;
  status: VerificationStatus;
  statusUpdatedAt: string;
  statusUpdatedBy?: string;
  rejectionReason?: string;
  evidenceCid?: string;
}
```

### Call patterns

| Action | Pattern | Who |
|--------|---------|-----|
| Request verification | Single invoke (+ optional fee payment in batch) | Project owner |
| Approve / reject | Single invoke | Admin (allowlisted wallet) |
| Read status | Simulate (no sign) | Anyone |
| List pending (admin) | Simulate (no sign) | Admin dashboard |

### Status state machine

```
NONE → PENDING → VERIFIED
              ↘ REJECTED → (reset) → NONE → PENDING ...
```

- `NONE`: No request on record
- `PENDING`: Awaiting admin review
- `VERIFIED`: Approved; displayed on project page
- `REJECTED`: Denied with optional reason; owner may reset and resubmit

---

## Error Handling

### Frontend error classes

| Error | Source | User-facing action |
|-------|--------|--------------------|
| `NetworkMismatchError` | Wallet on wrong network | Switch Freighter to Testnet/Mainnet per app config |
| `"Only project owner can update the project"` | Ownership check | Connect owner wallet |
| `"Project not found"` | Pre-tx validation | Verify project ID |
| `"Transaction failed: ..."` | `sendTransaction` ERROR status | Show error toast; log `errorResult` |
| `"Timeout waiting for transaction ..."` | Polling exceeded 60s | Retry or check explorer |
| `"A verification request is already pending..."` | Duplicate request guard | Show current status |
| `"Cannot approve/reject request with status ..."` | Invalid state transition | Refresh status |

### Contract-level failures

Soroban contracts return errors as failed transactions. The frontend handles these at two layers:

**1. Submission errors** (`sendResponse.status === "ERROR"`):

```typescript
if (sendResponse.status === "ERROR") {
  throw new Error(
    "Transaction failed: " + JSON.stringify(sendResponse.errorResult),
  );
}
```

**2. Execution errors** (transaction included but failed):

```typescript
if (last.status !== "SUCCESS") {
  throw new Error(
    `[SorobanService] Transaction ${hash} failed with status: ${last.status}`,
  );
}
```

### Expected contract error codes (target)

Document and map these when contract error enums are finalized:

| Code | Contract | Meaning | Frontend handling |
|------|----------|---------|-------------------|
| `1` | Project Registry | Project already exists | Show duplicate error |
| `2` | Project Registry | Unauthorized (not owner) | Prompt wallet switch |
| `3` | Review Registry | Already reviewed | Disable submit, offer update |
| `4` | Review Registry | Invalid rating | Form validation (prevent tx) |
| `5` | Verification Registry | Pending request exists | Show pending status |
| `6` | Verification Registry | Insufficient fee | Prompt funding |
| `7` | Verification Registry | Unauthorized admin | Deny admin action |

### Graceful degradation (development)

When no wallet is connected, `registerProject` and `updateProject` fall back to mock responses so UI flows remain testable:

```typescript
return { hash: "mock_hash_" + generateId(), status: "SUCCESS" };
```

Do not rely on this behavior in production — always require wallet connection for real writes.

### Error handling checklist for new contract calls

- [ ] Validate network before building transaction (`assertCorrectNetwork`)
- [ ] Validate inputs client-side before submitting (avoid wasted fees)
- [ ] Handle `sendTransaction` ERROR and polling FAILURE distinctly
- [ ] Surface user-friendly messages via toast (see `wallet.context.tsx`)
- [ ] Log detailed errors with `[SorobanService]` prefix for debugging
- [ ] Return safe defaults for read failures (e.g. verification status → `"NONE"`)

---

## Migration Guide: Contract Upgrades

When Soroban contracts are redeployed (new WASM, breaking or non-breaking changes), follow this process to migrate the frontend.

### 1. Pre-upgrade checklist

- [ ] Obtain new contract IDs for each upgraded registry
- [ ] Review changelog for breaking ABI changes (renamed functions, type changes)
- [ ] Confirm RPC endpoint supports the deployed network
- [ ] Run contract integration tests against new deployment on testnet

### 2. Update environment variables

Update `.env.local` (development) and deployment secrets (production):

```env
# Old
NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT=COLD...

# New
NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT=CNEW...
```

All three registry addresses may change independently. Update only the contracts that were redeployed.

### 3. Update frontend code (if ABI changed)

| Change type | Action |
|-------------|--------|
| New function | Add method to `sorobanService` or dedicated service |
| Renamed function | Update `contract.call("new_name", ...)` |
| New/changed args | Update `nativeToScVal` mapping and TypeScript interfaces |
| Removed function | Remove UI entry points; add deprecation notice |
| Storage layout change | Update read parsers; may need re-index |

### 4. Dual-contract support (optional transition period)

During migration, support both old and new contract IDs:

```typescript
const PROJECT_REGISTRY_V1 = process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT_V1;
const PROJECT_REGISTRY_V2 = process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT_V2;

async function getProject(id: string): Promise<ProjectData | null> {
  const fromV2 = await readProject(PROJECT_REGISTRY_V2, id);
  if (fromV2) return fromV2;
  return readProject(PROJECT_REGISTRY_V1, id);
}
```

Remove V1 reads once all data is migrated on-chain.

### 5. Verification steps

```bash
cd dongle

# Validate env parsing
npm test -- __tests__/constants/contracts.test.ts

# Validate Soroban service mocks still pass
npm test -- __tests__/services/soroban.service.test.ts

# Manual smoke test
npm run dev
# → Connect wallet on testnet
# → Register a test project
# → Confirm transaction on Stellar explorer
```

### 6. Network-specific rollout

| Network | Passphrase | RPC |
|---------|------------|-----|
| Testnet | `Test SDF Network ; September 2015` | `https://soroban-testnet.stellar.org:443` |
| Mainnet | `Public Global Stellar Network ; September 2015` | Mainnet RPC URL (configure per deployment) |

Deploy frontend configuration per environment. Never mix testnet contract IDs with mainnet passphrases.

### 7. Rollback procedure

If a new contract deployment causes failures:

1. Revert env vars to previous contract IDs
2. Redeploy frontend with previous configuration
3. File issue documenting ABI incompatibility
4. Do **not** rollback on-chain state — contracts are immutable; migrate data forward

---

## Related Files

| File | Role |
|------|------|
| `dongle/constants/contracts.ts` | Contract IDs, RPC config, env validation |
| `dongle/services/stellar/soroban.service.ts` | Project Registry write operations |
| `dongle/services/stellar/verification.service.ts` | Verification state (localStorage → contract) |
| `dongle/services/review/review.service.ts` | Review state (localStorage → contract) |
| `dongle/services/wallet/wallet.service.ts` | Freighter connection and signing |
| `dongle/context/wallet.context.tsx` | Network validation, wallet UI state |
| `dongle/__tests__/services/soroban.service.test.ts` | Soroban transaction pipeline tests |
| `dongle/__tests__/constants/contracts.test.ts` | Env validation tests |

---

## Testing Contract Integration

Run contract-related tests:

```bash
cd dongle
npm test -- __tests__/constants/contracts.test.ts
npm test -- __tests__/services/soroban.service.test.ts
npm test -- __tests__/services/verification.service.test.ts
```

For manual testnet verification, fund your test account via [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test) and connect Freighter to Testnet.

See [testing-guide.md](./testing-guide.md) for full test writing standards.
