# useStellarAccount Hook

A React hook for fetching and managing Stellar account data.

## Overview

`useStellarAccount` provides a simple interface to fetch Stellar account information including balances, with built-in loading and error state management.

## Usage

```tsx
import { useStellarAccount } from '@/hooks/useStellarAccount';

function AccountDashboard() {
  const { account, balances, loading, error } = useStellarAccount();

  if (loading) return <div>Loading account data...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!account) return <div>No account connected</div>;

  return (
    <div>
      <h2>Account: {account.account_id}</h2>
      <h3>Balances:</h3>
      <ul>
        {balances.map((balance, index) => (
          <li key={index}>
            {balance.asset_code || 'XLM'}: {balance.balance}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## API

### Parameters

- `publicKey` (optional): Stellar public key to fetch account data for. If not provided, uses the public key from the Wallet Context.

### Return Value

```typescript
{
  account: StellarAccount | null;  // Full account data
  balances: StellarBalance[];      // Array of account balances
  loading: boolean;                // Loading state
  error: Error | null;             // Error state
}
```

## Types

### StellarAccount

```typescript
interface StellarAccount {
  id: string;
  account_id: string;
  sequence: string;
  subentry_count: number;
  balances: StellarBalance[];
}
```

### StellarBalance

```typescript
interface StellarBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}
```

## Examples

### Using with Wallet Context

```tsx
// Uses public key from wallet context automatically
const { account, balances, loading, error } = useStellarAccount();
```

### Using with Specific Public Key

```tsx
// Fetch data for a specific account
const { account, balances, loading, error } = useStellarAccount(
  'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
);
```

### Handling States

```tsx
function AccountView() {
  const { account, balances, loading, error } = useStellarAccount();

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (!account) {
    return <ConnectWalletPrompt />;
  }

  return <AccountDetails account={account} balances={balances} />;
}
```

## Dependencies

This hook requires:

1. **Stellar Service Layer** (#6) - Provides `getAccountInfo` method
2. **Wallet Context** (#4) - Provides global wallet state with `publicKey`

## Current Status

⚠️ **Placeholder Implementation**: This hook currently uses mock implementations for its dependencies. Once the Stellar Service and Wallet Context are implemented, the placeholders will be replaced with actual integrations.

## Future Enhancements

- Add refresh/refetch functionality
- Add caching to reduce API calls
- Support for real-time account updates
- Add retry logic for failed requests
