# Type Definition Reference

This document centralizes the type definitions, validation schemas, and type patterns used across the Dongle frontend.

## Core Domain Types

### Project (`types/project.ts`)

```typescript
export interface Project {
  id: string;
  name: string;
  primaryCategory: ProjectCategory;
  tags?: string[];
  description: string;
  rating: number;
  reviews: number;
  createdAt: string;              // ISO date string
  websiteUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  docsUrl?: string;
  auditReportUrl?: string;
  bugBountyUrl?: string;
  domain?: string;
  ownerAddress?: string;          // Stellar G... public key
  repositoryMetadata?: RepositoryMetadata;
  contractAddresses?: string[];   // Soroban contract IDs (C..., 56 chars)
}
```

**Categories:**

```typescript
export const PROJECT_CATEGORIES = {
  DEFI: "DeFi / DEX",
  GAMING: "Gaming / NFT",
  INFRASTRUCTURE: "Infrastructure",
  PAYMENTS: "Payments",
  DAO: "DAO",
} as const;

export type ProjectCategory = typeof PROJECT_CATEGORIES[keyof typeof PROJECT_CATEGORIES];
```

### Review (`types/review.ts`)

```typescript
export interface Review {
  id: string;
  projectId: string;
  projectName: string;
  userAddress: string;            // Stellar G... public key
  rating: number;                 // 1-5 integer
  comment: string;
  createdAt: string;
  helpfulVotes?: string[];
  unhelpfulVotes?: string[];
}

export const REVIEW_CONSTRAINTS = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  COMMENT_MIN_LENGTH: 10,
  COMMENT_MAX_LENGTH: 1000,
} as const;
```

### Repository Metadata (`types/repository.ts`)

```typescript
export interface RepositoryMetadata {
  url: string;
  host: "github" | "gitlab" | "bitbucket";
  owner: string;
  repo: string;
  stars?: number;
  forks?: number;
  license?: string;
  lastUpdate?: string;
  description?: string;
  language?: string;
  topics?: string[];
}

export const SUPPORTED_HOSTS = ["github.com", "gitlab.com", "bitbucket.org"] as const;
```

### Verification (`services/stellar/verification.service.ts`)

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

### Audit Log (`types/audit-log.ts`)

```typescript
export type AuditAction =
  | "admin_login"
  | "admin_logout"
  | "verification_approved"
  | "verification_rejected"
  | "verification_assigned"
  | "verification_unassigned"
  | "fee_updated"
  | "report_resolved"
  | "report_dismissed"
  | "report_assigned"
  | "report_unassigned"
  | "submission_moderated"
  | "claim_submitted"
  | "claim_approved"
  | "claim_rejected"
  | "ownership_transferred";

export interface AuditLogEntry {
  id: string;
  actor: string;                  // Stellar G... public key
  action: AuditAction;
  targetId: string;
  targetLabel: string;
  timestamp: string;              // ISO 8601
  reason?: string;
  metadata?: Record<string, string | number | boolean>;
}
```

### Notifications (`types/notification.ts`)

```typescript
export type NotificationType =
  | "claim_received"
  | "claim_approved"
  | "claim_rejected";

export interface AppNotification {
  id: string;
  recipientAddress: string;       // Stellar G... public key
  type: NotificationType;
  title: string;
  message?: string;
  createdAt: string;
  read: boolean;
  claimRequestId: string;
  projectId: string;
  projectName: string;
}
```

### Project Updates (`types/update.ts`)

```typescript
export const UPDATE_TYPES = {
  RELEASE: "Release",
  AUDIT: "Security Audit",
  MILESTONE: "Milestone",
  ANNOUNCEMENT: "Announcement",
} as const;

export type UpdateType = typeof UPDATE_TYPES[keyof typeof UPDATE_TYPES];

export interface ProjectUpdate {
  id: string;
  projectId: string;
  type: UpdateType;
  title: string;
  content: string;
  version?: string;
  publishedAt: string;
  authorAddress: string;
}
```

## Zod Schemas

### Contract ID Validation (`constants/contracts.ts`)

```typescript
// Validates Soroban contract ID: C + 55 base-32 chars (A-Z, 2-7)
export const ContractIdSchema = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, "Invalid Stellar Contract ID format");

// Validates Stellar public key: G + 55 base-32 chars
export const PublicKeySchema = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar Public Key format");

// Production rejects the dev placeholder
export const ProductionContractIdSchema = ContractIdSchema.refine(
  (id) => id !== DEV_CONTRACT_PLACEHOLDER,
  { message: "Development placeholder contract ID is not allowed in production" },
);
```

### Environment Validation (`constants/contracts.ts`)

```typescript
export const getEnvSchema = (isDev: boolean) => {
  const contractField = isDev
    ? ContractIdSchema.default(DEV_CONTRACT_PLACEHOLDER)
    : ProductionContractIdSchema;

  return z.object({
    NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: contractField,
    NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: contractField,
    NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: contractField,
    NEXT_PUBLIC_SOROBAN_RPC_URL: z.string().url(),
    NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: z.string().min(1),
  });
};
```

### Using Zod for Form Validation

```typescript
import { z } from "zod";

const ReviewFormSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
});

// In a form handler
const result = ReviewFormSchema.safeParse(formData);
if (!result.success) {
  // result.error.issues contains field-level errors
  for (const issue of result.error.issues) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }
}
```

## Validation Helpers (`lib/validation.ts`)

```typescript
export function isRequired(value: string | null | undefined): boolean;
export function hasLengthBetween(value: string | null | undefined, min: number, max: number): boolean;
export function hasMinLength(value: string | null | undefined, min: number): boolean;
export function isValidEmail(value: string | null | undefined): boolean;
export function isValidHttpUrl(value: string | null | undefined): boolean;
```

## Type Narrowing Patterns

### Discriminated Unions

```typescript
// Verification status as discriminated union
type VerificationResult =
  | { status: "NONE" }
  | { status: "PENDING"; submittedAt: string }
  | { status: "VERIFIED"; verifiedAt: string; verifiedBy: string }
  | { status: "REJECTED"; rejectedAt: string; reason: string };

function handleResult(result: VerificationResult) {
  switch (result.status) {
    case "VERIFIED":
      // TypeScript knows verifiedAt and verifiedBy exist
      console.log(`Verified by ${result.verifiedBy} at ${result.verifiedAt}`);
      break;
    case "REJECTED":
      // TypeScript knows reason exists
      console.log(`Rejected: ${result.reason}`);
      break;
  }
}
```

### Type Guards

```typescript
// Custom type guard for project ownership
function isProjectOwner(project: Project, address: string): project is Project & { ownerAddress: string } {
  return project.ownerAddress === address;
}

// Usage
if (isProjectOwner(project, walletAddress)) {
  // project.ownerAddress is guaranteed to exist here
  console.log(`You own ${project.name}`);
}
```

### Exhaustive Switch

```typescript
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

function getCategoryColor(category: ProjectCategory): string {
  switch (category) {
    case "DeFi / DEX": return "blue";
    case "Gaming / NFT": return "purple";
    case "Infrastructure": return "gray";
    case "Payments": return "green";
    case "DAO": return "orange";
    default: return assertNever(category); // Compile error if case missing
  }
}
```

## Extension Points

### Adding a New Type

1. Create or update the type file in `dongle/types/`
2. Export from `dongle/types/index.ts`
3. Add Zod schema in `constants/contracts.ts` if needed for runtime validation
4. Update this documentation

### Adding a New Category

```typescript
// In types/project.ts
export const PROJECT_CATEGORIES = {
  // ... existing
  NEW_CATEGORY: "New Category Label",
} as const;

// Update form mappings
export const CATEGORY_FORM_MAP = {
  // ... existing
  "new-category": PROJECT_CATEGORIES.NEW_CATEGORY,
};
```

### Adding a New Audit Action

```typescript
// In types/audit-log.ts
export type AuditAction =
  // ... existing
  | "new_admin_action";

export const AUDIT_ACTION_LABELS = {
  // ... existing
  new_admin_action: "New Admin Action",
};
```

## Related Files

| File | Role |
|------|------|
| `dongle/types/project.ts` | Project types and categories |
| `dongle/types/review.ts` | Review types and constraints |
| `dongle/types/repository.ts` | Repository metadata types |
| `dongle/types/audit-log.ts` | Audit log types |
| `dongle/types/notification.ts` | Notification types |
| `dongle/types/update.ts` | Project update types |
| `dongle/constants/contracts.ts` | Zod schemas for contract IDs and env |
| `dongle/lib/validation.ts` | Validation helper functions |
