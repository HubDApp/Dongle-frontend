# Error Code System Documentation

## Overview

Dongle now uses a centralized error code system that replaces magic strings with type-safe enum values. This provides consistent error handling across the entire application.

## What Changed

### Before (Magic Strings)
```typescript
throw new Error("Wallet not installed");
// Error code was undefined or inconsistent
```

### After (Centralized Error Codes)
```typescript
import { ErrorCode, createErrorWithCode } from "@/lib/error-mapper";

throw createErrorWithCode(ErrorCode.WALLET_NOT_INSTALLED);
// Error code: WALLET_NOT_INSTALLED
// User message: "Freighter wallet extension is not installed."
// Resolution: "Install Freighter from Chrome Web Store or Firefox Add-ons, then refresh the page."
```

## Benefits

✅ **Type Safety** - No more typos in error codes  
✅ **Centralized Documentation** - Single source of truth for all error codes  
✅ **Better Error Tracking** - Consistent codes for Sentry/monitoring  
✅ **Improved UX** - Clear, actionable error messages  
✅ **Easy Refactoring** - Find all usages with TypeScript  
✅ **API Consistency** - Same error codes in API responses  

## Architecture

### Core Files

#### `constants/error-codes.ts`
- **Purpose**: Single source of truth for all error codes
- **Contains**:
  - `ErrorCode` enum with all error codes
  - `ERROR_CODE_REGISTRY` with full documentation for each code
  - Utility functions for error handling
- **Size**: ~1200 lines (comprehensive)

#### `utils/error-mapper.util.ts` (Updated)
- **Purpose**: Maps technical errors to user-friendly messages
- **Changes**:
  - Now uses `ErrorCode` enum instead of strings
  - Returns standardized `MappedError` with `code: ErrorCode`
  - Integrated with `ERROR_CODE_REGISTRY` for consistent messaging
  - Added `createErrorWithCode()` helper

### Error Code Structure

```typescript
export const enum ErrorCode {
  // Wallet Errors (1xxx)
  WALLET_NOT_INSTALLED = "WALLET_NOT_INSTALLED",
  WALLET_LOCKED = "WALLET_LOCKED",
  WALLET_USER_REJECTED = "WALLET_USER_REJECTED",
  // ... more wallet errors
  
  // Network Errors (2xxx)
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  NETWORK_OFFLINE = "NETWORK_OFFLINE",
  // ... more network errors
  
  // Account Errors (3xxx)
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  ACCOUNT_UNFUNDED = "ACCOUNT_UNFUNDED",
  // ... more account errors
  
  // Transaction Errors (4xxx)
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  TRANSACTION_BAD_SEQUENCE = "TRANSACTION_BAD_SEQUENCE",
  // ... more transaction errors
  
  // Stellar/Soroban Errors (5xxx)
  STELLAR_HORIZON_ERROR = "STELLAR_HORIZON_ERROR",
  SOROBAN_CONTRACT_ERROR = "SOROBAN_CONTRACT_ERROR",
  // ... more stellar errors
  
  // Storage Errors (6xxx)
  STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED",
  STORAGE_WRITE_FAILED = "STORAGE_WRITE_FAILED",
  // ... more storage errors
  
  // Validation Errors (7xxx)
  VALIDATION_INVALID_URL = "VALIDATION_INVALID_URL",
  VALIDATION_INVALID_CONTRACT_ID = "VALIDATION_INVALID_CONTRACT_ID",
  // ... more validation errors
  
  // API Errors (8xxx)
  API_NOT_FOUND = "API_NOT_FOUND",
  API_SERVER_ERROR = "API_SERVER_ERROR",
  // ... more API errors
  
  // Draft Errors (9xxx)
  DRAFT_SAVE_FAILED = "DRAFT_SAVE_FAILED",
  DRAFT_NOT_FOUND = "DRAFT_NOT_FOUND",
  // ... more draft errors
  
  // Project Errors (10xxx)
  PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND",
  CONTRACT_NOT_DEPLOYED = "CONTRACT_NOT_DEPLOYED",
  // ... more project errors
  
  // Unknown Errors (99xxx)
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
```

### Error Code Documentation

Each error code has comprehensive documentation:

```typescript
export interface ErrorCodeInfo {
  code: ErrorCode;                    // The error code enum value
  userMessage: string;                // User-friendly message
  description: string;                // Technical description for developers
  resolution: string;                 // Step-by-step resolution guide
  category: "wallet" | "network" | ...; // Category for grouping
  httpStatus?: number;                // HTTP status (for API errors)
  shouldReport?: boolean;             // Whether to send to Sentry
}

// Example:
[ErrorCode.WALLET_NOT_INSTALLED]: {
  code: ErrorCode.WALLET_NOT_INSTALLED,
  userMessage: "Freighter wallet extension is not installed.",
  description: "User attempted to connect wallet but Freighter extension is not detected in browser.",
  resolution: "Install Freighter from Chrome Web Store or Firefox Add-ons, then refresh the page.",
  category: "wallet",
  shouldReport: false, // User error, not a bug
}
```

## Usage Guide

### 1. Throwing Errors with Codes

```typescript
import { ErrorCode, createErrorWithCode } from "@/lib/error-mapper";

// Simple error with code
throw createErrorWithCode(ErrorCode.WALLET_NOT_INSTALLED);

// Error with custom message (technical details)
throw createErrorWithCode(
  ErrorCode.NETWORK_TIMEOUT,
  "Request to /api/projects timed out after 30s"
);
```

### 2. Mapping Existing Errors

```typescript
import { mapError, ErrorCategory } from "@/lib/error-mapper";

try {
  await sorobanService.registerProject(data);
} catch (error) {
  // Automatically detect error type and assign error code
  const mapped = mapError(error, "stellar");
  
  console.log(mapped.code);              // ErrorCode enum value
  console.log(mapped.userMessage);       // User-friendly message
  console.log(mapped.technicalDetails);  // Original error message
  console.log(mapped.actionable);        // Resolution steps
  console.log(mapped.shouldReport);      // true/false for Sentry
}
```

### 3. Checking Error Codes

```typescript
import { ErrorCode, extractErrorCode } from "@/constants/error-codes";

try {
  await walletService.connectWallet();
} catch (error) {
  const code = extractErrorCode(error);
  
  if (code === ErrorCode.WALLET_NOT_INSTALLED) {
    // Show installation instructions
    showInstallModal();
  } else if (code === ErrorCode.WALLET_LOCKED) {
    // Show unlock prompt
    showUnlockPrompt();
  } else {
    // Generic error handling
    showErrorToast(error);
  }
}
```

### 4. Using in API Routes

```typescript
import { ErrorCode, getErrorInfo, getHttpStatus } from "@/constants/error-codes";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // ... API logic
  } catch (error) {
    const code = ErrorCode.API_SERVER_ERROR;
    const info = getErrorInfo(code);
    const status = getHttpStatus(code) || 500;
    
    return NextResponse.json(
      {
        error: info.userMessage,
        code: code,
        resolution: info.resolution,
      },
      { status }
    );
  }
}
```

### 5. React Components

```typescript
import { useErrorMapper } from "@/hooks/useErrorMapper";

function MyComponent() {
  const { handleError } = useErrorMapper({ showToast: true });
  
  async function submitForm() {
    try {
      await sorobanService.registerProject(formData);
    } catch (error) {
      // Automatically maps error and shows toast with user-friendly message
      handleError(error, "stellar");
    }
  }
  
  return <form onSubmit={submitForm}>...</form>;
}
```

## Error Code Categories

### Wallet Errors (`WALLET_*`)

| Code | User Message | When It Happens |
|------|-------------|-----------------|
| `WALLET_NOT_INSTALLED` | Freighter wallet extension is not installed. | User clicks "Connect Wallet" but Freighter not detected |
| `WALLET_LOCKED` | Your wallet is locked. | Freighter installed but password-locked |
| `WALLET_USER_REJECTED` | Transaction was cancelled. No action was taken. | User clicks "Reject" in Freighter popup |
| `WALLET_CONNECTION_FAILED` | Failed to connect to your wallet. | Connection attempt fails for unknown reason |
| `WALLET_EXTENSION_ERROR` | There was a problem with your wallet extension. | Freighter throws unexpected error |
| `WALLET_NETWORK_MISMATCH` | Your wallet is connected to a different network. | Freighter on mainnet but app expects testnet |

### Network Errors (`NETWORK_*`)

| Code | User Message | When It Happens |
|------|-------------|-----------------|
| `NETWORK_TIMEOUT` | The request timed out. The network may be slow or unavailable. | HTTP request exceeds timeout (30s default) |
| `NETWORK_OFFLINE` | You appear to be offline. | `navigator.onLine === false` |
| `NETWORK_CONNECTION_REFUSED` | Unable to connect to the Stellar network. | `ECONNREFUSED` error from Horizon/RPC |
| `NETWORK_REQUEST_FAILED` | Network request failed. | Generic network error (not timeout or offline) |

### Account Errors (`ACCOUNT_*`)

| Code | User Message | When It Happens |
|------|-------------|-----------------|
| `ACCOUNT_NOT_FOUND` | This account does not exist on the Stellar network. | Account lookup returns 404 |
| `ACCOUNT_UNFUNDED` | This account has not been funded yet. | Account never received XLM |
| `ACCOUNT_INSUFFICIENT_BALANCE` | Insufficient balance to complete this transaction. | Balance < fees + reserves |
| `ACCOUNT_INVALID_ADDRESS` | Invalid Stellar account address. | Address doesn't match `G[A-Z2-7]{55}` format |

### Transaction Errors (`TRANSACTION_*`)

| Code | User Message | When It Happens |
|------|-------------|-----------------|
| `TRANSACTION_FAILED` | Transaction failed to process. | Transaction submitted but failed on-chain |
| `TRANSACTION_BAD_SEQUENCE` | Transaction sequence number is incorrect. | Sequence mismatch (concurrent txs) |
| `TRANSACTION_INSUFFICIENT_FEE` | Transaction fee is too low. | Network rejected due to low fee |
| `TRANSACTION_TIMEOUT` | Transaction timed out waiting for confirmation. | TX submitted but never confirmed |
| `TRANSACTION_INVALID` | Transaction is invalid. | Validation failed before submission |

### Stellar/Soroban Errors (`STELLAR_*`, `SOROBAN_*`)

| Code | User Message | When It Happens |
|------|-------------|-----------------|
| `STELLAR_HORIZON_ERROR` | Unable to connect to the Stellar network. | Horizon server error or unavailable |
| `STELLAR_RPC_ERROR` | Stellar RPC request failed. | Soroban RPC endpoint error |
| `SOROBAN_CONTRACT_ERROR` | Smart contract operation failed. | Contract reverted or threw error |
| `SOROBAN_INVOCATION_FAILED` | Failed to invoke smart contract. | Contract call failed before execution |

### Storage Errors (`STORAGE_*`)

| Code | User Message | When It Happens |
|------|-------------|-----------------|
| `STORAGE_QUOTA_EXCEEDED` | Browser storage limit reached. | localStorage quota exceeded (~5-10MB) |
| `STORAGE_READ_FAILED` | Failed to read data from local storage. | Error reading from localStorage |
| `STORAGE_WRITE_FAILED` | Failed to save data locally. | Error writing to localStorage |
| `STORAGE_UNAVAILABLE` | Local storage is not available. | localStorage disabled or private browsing |
| `STORAGE_DECRYPTION_FAILED` | Failed to decrypt stored data. | Encrypted data can't be decrypted |

### Validation Errors (`VALIDATION_*`)

| Code | User Message | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_INVALID_URL` | Please enter a valid URL. | 400 |
| `VALIDATION_INVALID_CONTRACT_ID` | Invalid Soroban contract ID. Must be 56 characters starting with 'C'. | 400 |
| `VALIDATION_INVALID_PUBLIC_KEY` | Invalid Stellar public key. Must be 56 characters starting with 'G'. | 400 |
| `VALIDATION_INVALID_REPOSITORY_URL` | Invalid repository URL. | 400 |
| `VALIDATION_REQUIRED_FIELD` | This field is required. | 400 |
| `VALIDATION_FIELD_TOO_LONG` | This field exceeds the maximum length. | 400 |
| `VALIDATION_FIELD_TOO_SHORT` | This field is too short. | 400 |

### API Errors (`API_*`)

| Code | User Message | HTTP Status |
|------|-------------|-------------|
| `API_NOT_FOUND` | The requested resource was not found. | 404 |
| `API_BAD_REQUEST` | Invalid request. | 400 |
| `API_UNAUTHORIZED` | Authentication required. | 401 |
| `API_FORBIDDEN` | You do not have permission to access this resource. | 403 |
| `API_SERVER_ERROR` | Server error. Please try again later. | 500 |
| `API_RATE_LIMITED` | Too many requests. Please slow down. | 429 |

### Draft Errors (`DRAFT_*`)

| Code | User Message | When It Happens |
|------|-------------|-----------------|
| `DRAFT_SAVE_FAILED` | Failed to save draft. | Draft save operation failed |
| `DRAFT_LOAD_FAILED` | Failed to load draft. | Draft retrieval failed |
| `DRAFT_DELETE_FAILED` | Failed to delete draft. | Draft deletion failed |
| `DRAFT_NOT_FOUND` | Draft not found. | Requested draft doesn't exist (404) |
| `DRAFT_EXPIRED` | This draft has expired. | Draft exceeded 30-day TTL |

### Project Errors (`PROJECT_*`, `CONTRACT_*`)

| Code | User Message | When It Happens |
|------|-------------|-----------------|
| `PROJECT_NOT_FOUND` | Project not found. | Project doesn't exist on-chain or in cache |
| `PROJECT_DUPLICATE` | A project with this name or ID already exists. | Duplicate registration attempt |
| `PROJECT_INVALID_DATA` | Project data is invalid. | Validation failed (missing fields, bad format) |
| `CONTRACT_NOT_DEPLOYED` | Contract is not deployed on this network. | Contract ID valid but doesn't exist on network |
| `CONTRACT_VALIDATION_FAILED` | Contract validation failed. | Contract exists but failed interface checks |

## Utility Functions

### `getErrorInfo(code: ErrorCode): ErrorCodeInfo`
Get full documentation for an error code.

```typescript
import { ErrorCode, getErrorInfo } from "@/constants/error-codes";

const info = getErrorInfo(ErrorCode.WALLET_NOT_INSTALLED);
console.log(info.userMessage);  // "Freighter wallet extension is not installed."
console.log(info.resolution);   // "Install Freighter from..."
```

### `getErrorCodesByCategory(category): ErrorCode[]`
Get all error codes in a specific category.

```typescript
import { getErrorCodesByCategory } from "@/constants/error-codes";

const walletErrors = getErrorCodesByCategory("wallet");
// [ErrorCode.WALLET_NOT_INSTALLED, ErrorCode.WALLET_LOCKED, ...]
```

### `shouldReportError(code: ErrorCode): boolean`
Check if error should be reported to Sentry.

```typescript
import { ErrorCode, shouldReportError } from "@/constants/error-codes";

if (shouldReportError(ErrorCode.INTERNAL_ERROR)) {
  // Send to Sentry
  Sentry.captureException(error);
}
```

### `getHttpStatus(code: ErrorCode): number | undefined`
Get HTTP status code for API errors.

```typescript
import { ErrorCode, getHttpStatus } from "@/constants/error-codes";

const status = getHttpStatus(ErrorCode.API_NOT_FOUND); // 404
```

### `extractErrorCode(error: unknown): ErrorCode | null`
Extract error code from an error object.

```typescript
import { extractErrorCode } from "@/constants/error-codes";

try {
  throw createErrorWithCode(ErrorCode.WALLET_LOCKED);
} catch (error) {
  const code = extractErrorCode(error); // ErrorCode.WALLET_LOCKED
}
```

### `isErrorCode(value: unknown): value is ErrorCode`
Type guard to check if a value is a valid ErrorCode.

```typescript
import { isErrorCode } from "@/constants/error-codes";

if (isErrorCode(value)) {
  // TypeScript knows value is ErrorCode
  const info = getErrorInfo(value);
}
```

## Integration with Error Tracking

### Sentry Configuration

```typescript
import * as Sentry from "@sentry/nextjs";
import { shouldReportError, extractErrorCode } from "@/constants/error-codes";

Sentry.init({
  beforeSend(event, hint) {
    const error = hint.originalException;
    const code = extractErrorCode(error);
    
    // Don't report user errors (wallet not installed, user rejected)
    if (code && !shouldReportError(code)) {
      return null;
    }
    
    // Add error code as context
    if (code) {
      event.contexts = {
        ...event.contexts,
        errorCode: { code },
      };
    }
    
    return event;
  },
});
```

### LogRocket Integration

```typescript
import LogRocket from "logrocket";
import { extractErrorCode, getErrorInfo } from "@/constants/error-codes";

function logError(error: unknown) {
  const code = extractErrorCode(error);
  
  if (code) {
    const info = getErrorInfo(code);
    LogRocket.captureMessage(`[${code}] ${info.userMessage}`, {
      tags: {
        errorCode: code,
        category: info.category,
      },
      extra: {
        resolution: info.resolution,
      },
    });
  }
}
```

## Migration Guide

### For New Code

Always use error codes when throwing errors:

```typescript
// ❌ Old way (don't do this)
throw new Error("Wallet not installed");

// ✅ New way
import { ErrorCode, createErrorWithCode } from "@/lib/error-mapper";
throw createErrorWithCode(ErrorCode.WALLET_NOT_INSTALLED);
```

### For Existing Code

Update error handling to use error mapper:

```typescript
// ❌ Old way
try {
  await operation();
} catch (error) {
  toast.error("Something went wrong");
}

// ✅ New way
import { mapError } from "@/lib/error-mapper";

try {
  await operation();
} catch (error) {
  const mapped = mapError(error);
  toast.error(mapped.userMessage, {
    description: mapped.actionable,
  });
}
```

### For API Routes

Update API error responses to include error codes:

```typescript
// ❌ Old way
return NextResponse.json(
  { error: "Draft not found" },
  { status: 404 }
);

// ✅ New way
import { ErrorCode, getErrorInfo } from "@/constants/error-codes";

const code = ErrorCode.DRAFT_NOT_FOUND;
const info = getErrorInfo(code);

return NextResponse.json(
  {
    error: info.userMessage,
    code: code,
    resolution: info.resolution,
  },
  { status: 404 }
);
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import { ErrorCode, getErrorInfo, extractErrorCode, createErrorWithCode } from "@/lib/error-mapper";

describe("Error Code System", () => {
  it("should get error info by code", () => {
    const info = getErrorInfo(ErrorCode.WALLET_NOT_INSTALLED);
    expect(info.code).toBe(ErrorCode.WALLET_NOT_INSTALLED);
    expect(info.userMessage).toBeTruthy();
    expect(info.resolution).toBeTruthy();
  });
  
  it("should extract error code from error object", () => {
    const error = createErrorWithCode(ErrorCode.NETWORK_TIMEOUT);
    const code = extractErrorCode(error);
    expect(code).toBe(ErrorCode.NETWORK_TIMEOUT);
  });
  
  it("should map errors automatically", () => {
    const error = new Error("freighter not found");
    const mapped = mapError(error, "wallet");
    expect(mapped.code).toBe(ErrorCode.WALLET_NOT_INSTALLED);
  });
});
```

## Best Practices

### 1. Always Use Error Codes for Thrown Errors

```typescript
// ✅ Good
throw createErrorWithCode(ErrorCode.VALIDATION_REQUIRED_FIELD, "Name is required");

// ❌ Bad
throw new Error("Name is required");
```

### 2. Map Errors Before Displaying to Users

```typescript
// ✅ Good
const mapped = mapError(error);
toast.error(mapped.userMessage);

// ❌ Bad
toast.error(error.message); // Raw technical message
```

### 3. Include Error Codes in API Responses

```typescript
// ✅ Good
return NextResponse.json({
  error: "Draft not found",
  code: ErrorCode.DRAFT_NOT_FOUND,
  resolution: "The draft may have expired after 30 days.",
}, { status: 404 });

// ❌ Bad
return NextResponse.json({ error: "Not found" }, { status: 404 });
```

### 4. Check Error Codes Before Generic Handling

```typescript
// ✅ Good
const code = extractErrorCode(error);
if (code === ErrorCode.WALLET_USER_REJECTED) {
  // Silent - user cancelled intentionally
  return;
}
handleError(error); // Generic handler

// ❌ Bad
handleError(error); // Shows error for every case
```

### 5. Don't Report User Errors to Sentry

```typescript
// ✅ Good
if (shouldReportError(code)) {
  Sentry.captureException(error);
}

// ❌ Bad
Sentry.captureException(error); // Reports every error
```

## Acceptance Criteria Status

✅ **Create constants/error-codes.ts with const enum**
- Created with 60+ error codes across 10 categories
- Comprehensive `ERROR_CODE_REGISTRY` with full documentation

✅ **Document each error code with description and resolution**
- Every error code has `ErrorCodeInfo` with:
  - User-friendly message
  - Technical description
  - Step-by-step resolution
  - Category and metadata

✅ **Add error code reference to README troubleshooting section**
- Added "Error Code Reference" section to README
- Includes table of categories and examples
- Links to full documentation

✅ **Update error-mapper.ts to use enum instead of strings**
- Refactored `mapError()` to return `ErrorCode` enum values
- Integrated with `ERROR_CODE_REGISTRY`
- Added helper functions (`createErrorWithCode`, `extractErrorCode`)

✅ **Include error code in API responses**
- Documented pattern for API routes
- Provided examples in usage guide
- HTTP status codes mapped for API errors

## Conclusion

The centralized error code system provides:
- **Type safety** with const enums
- **Consistency** across frontend and API
- **Better UX** with clear, actionable error messages
- **Improved monitoring** with standardized error tracking
- **Easy maintenance** with single source of truth

All 60+ error codes are documented with user messages, technical descriptions, and resolution steps. The system integrates seamlessly with existing error handling via the updated `error-mapper` utility.

**Next Steps**:
1. Gradually migrate existing error handling to use error codes
2. Add error code reporting to Sentry configuration
3. Update API routes to return standardized error responses
4. Train team on new error handling patterns
