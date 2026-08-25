# Error Mapper Implementation Guide

## Overview

The Error Mapper system converts technical error messages from wallet, Stellar, Soroban, network, and storage operations into user-friendly messages while preserving developer diagnostics.

## Features

✅ Converts wallet rejection messages to user-friendly text  
✅ Handles missing extension errors  
✅ Maps network timeout and connection errors  
✅ Translates account-not-found errors  
✅ Provides actionable guidance for each error type  
✅ Preserves technical details for developer debugging  
✅ Supports unknown error fallbacks  

## Components

### 1. Error Mapper (`lib/error-mapper.ts`)
Core utility that maps errors to user-friendly messages.

### 2. ErrorDisplay Component (`components/ui/ErrorDisplay.tsx`)
UI component to display mapped errors in different formats.

### 3. useErrorMapper Hook (`hooks/useErrorMapper.ts`)
React hook for easier error handling in components.

## Usage Examples

### Basic Usage

```typescript
import { mapError } from "@/lib/error-mapper";

try {
  await someStellarOperation();
} catch (error) {
  const mapped = mapError(error, "stellar");
  console.error(mapped.userMessage); // User-friendly message
  console.error(mapped.technicalDetails); // For developers
}
```

### With React Hook

```typescript
import { useErrorMapper } from "@/hooks/useErrorMapper";

function MyComponent() {
  const { error, handleError, clearError } = useErrorMapper({ 
    showToast: true,
    category: "wallet" 
  });

  const connectWallet = async () => {
    try {
      await freighter.connect();
    } catch (err) {
      handleError(err); // Automatically shows toast and sets error state
    }
  };

  return (
    <>
      {error && <ErrorDisplay error={error} onClose={clearError} />}
      <button onClick={connectWallet}>Connect Wallet</button>
    </>
  );
}
```

### Using ErrorDisplay Component

```typescript
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import { mapError } from "@/lib/error-mapper";

function Example() {
  const [error, setError] = useState(null);

  const handleOperation = async () => {
    try {
      await riskyOperation();
    } catch (err) {
      setError(mapError(err, "transaction"));
    }
  };

  return (
    <>
      {error && (
        <ErrorDisplay
          error={error}
          variant="inline" // or "banner" or "modal"
          severity="error" // or "warning" or "info"
          showTechnicalDetails={process.env.NODE_ENV === "development"}
          onClose={() => setError(null)}
        />
      )}
    </>
  );
}
```

### Simple Message Only

```typescript
import { getUserFriendlyMessage } from "@/lib/error-mapper";
import { toast } from "sonner";

try {
  await operation();
} catch (error) {
  const message = getUserFriendlyMessage(error, "network");
  toast.error(message);
}
```

## Error Categories

- `wallet` - Freighter extension, user rejections, locked wallet
- `network` - Timeouts, connection issues, offline state
- `stellar` - Horizon API errors
- `soroban` - Smart contract errors
- `transaction` - TX failures, bad sequence, insufficient fees
- `account` - Account not found, unfunded, insufficient balance
- `storage` - LocalStorage/IndexedDB errors
- `unknown` - Fallback for unrecognized errors

## Example Error Mappings

| Technical Error | User-Friendly Message | Actionable Guidance |
|----------------|----------------------|---------------------|
| `User rejected the request` | Transaction was cancelled. No action was taken. | - |
| `Freighter extension not found` | Freighter wallet extension is not installed. | Please install Freighter from the Chrome Web Store or Firefox Add-ons. |
| `ETIMEDOUT` | The request timed out. The network may be slow or unavailable. | Please check your internet connection and try again. |
| `Account not found` | This account does not exist on the Stellar network. | The account may need to be funded with at least 1 XLM to activate it. |
| `tx_bad_seq` | Transaction sequence number is incorrect. | Please refresh the page and try again. |
| `op_underfunded` | Insufficient balance to complete this transaction. | Please add more XLM to your account. |

## Integration Checklist

- [ ] Import error mapper in wallet operations
- [ ] Add error mapping to transaction submissions  
- [ ] Update account fetching with error handling
- [ ] Wrap network calls with error mapper
- [ ] Add ErrorDisplay component to forms
- [ ] Test with Freighter disconnected
- [ ] Test with network offline
- [ ] Test with unfunded accounts
- [ ] Test transaction rejections
- [ ] Verify technical details are logged (dev mode)

## Benefits

1. **Better UX**: Users see clear, actionable messages instead of technical jargon
2. **Debugging**: Developers still have access to technical details
3. **Consistency**: All errors follow the same format
4. **Maintainability**: Centralized error handling logic
5. **Actionable**: Users know what to do next

## Testing

```typescript
import { mapError } from "@/lib/error-mapper";

// Test wallet rejection
const walletError = new Error("User rejected the request");
console.log(mapError(walletError, "wallet"));
// => "Transaction was cancelled. No action was taken."

// Test network timeout
const networkError = { code: "ETIMEDOUT", message: "Request timeout" };
console.log(mapError(networkError, "network"));
// => "The request timed out. The network may be slow or unavailable."

// Test unknown error
const unknownError = new Error("Something went wrong");
console.log(mapError(unknownError));
// => "An unexpected error occurred. Please try again."
```

## Next Steps

1. Integrate into wallet connection flow
2. Add to transaction submission handlers
3. Update review submission with error mapping
4. Add to project creation/editing forms
5. Implement network status detection (see OFFLINE_DETECTION.md)
