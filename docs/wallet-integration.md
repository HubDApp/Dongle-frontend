# Freighter Wallet Integration Guide

This document covers the Freighter wallet integration in the Dongle frontend: connection flow, transaction signing, error scenarios, local development setup, and debugging tips.

## Overview

Dongle uses [Freighter](https://freighter.app/) as its primary Stellar wallet. The integration lives in:

| File | Role |
|------|------|
| `dongle/services/wallet/wallet.service.ts` | Low-level Freighter API calls |
| `dongle/context/wallet.context.tsx` | React context for wallet state, network validation, UI |
| `dongle/services/stellar/soroban.service.ts` | Transaction building and signing pipeline |

## Connection Flow

```
User clicks "Connect Wallet"
  → walletService.connectWallet()
    → freighterApi.isConnected()        // Check extension installed
    → freighterApi.requestAccess()      // Opens Freighter popup
    → Returns public key (G...)
  → wallet.context stores address in state
  → UI re-renders with connected state
```

### Silent Reconnection

On page load, the wallet context calls `walletService.getPublicKey()` which reads the previously approved address without showing a popup. This only works if the user previously approved the connection.

```typescript
// Silent read — no popup
const address = await walletService.getPublicKey();
```

### Checking Connection Status

```typescript
// Safe to call anywhere — never throws
const connected = await walletService.isConnected();
```

## Transaction Signing

All Soroban transactions follow this pipeline:

```
1. walletService.getPublicKey()          → Get signer address
2. assertCorrectNetwork()                → Verify Freighter network matches app config
3. server.getAccount(publicKey)          → Fetch sequence number from RPC
4. Contract(...).call(...)               → Build invoke operation
5. server.prepareTransaction()           → Simulate + set resource footprint
6. walletService.signTransaction(xdr)    → User signs in Freighter popup
7. server.sendTransaction()              → Submit to network
8. pollTransaction(hash)                 → Wait for SUCCESS (≤60s timeout)
```

### Signing Example

```typescript
const signedXdr = await walletService.signTransaction(
  unsignedTxXdr,
  EXPECTED_NETWORK_PASSPHRASE,
);
```

### Network Validation

Before any transaction, `assertCorrectNetwork()` verifies the wallet is on the expected network:

```typescript
async function assertCorrectNetwork(): Promise<void> {
  const passphrase = await walletService.getNetworkPassphrase();
  if (passphrase !== EXPECTED_NETWORK_PASSPHRASE) {
    throw new NetworkMismatchError(passphrase);
  }
}
```

If the wallet is on the wrong network, the user sees a clear error message telling them which network to switch to.

## Error Scenarios

| Error | Cause | User Action |
|-------|-------|-------------|
| `NetworkMismatchError` | Wallet on wrong network | Switch Freighter to Testnet/Mainnet per app config |
| `"Freighter is not installed"` | Extension not found | Install Freighter browser extension |
| `"Wallet connection failed"` | User rejected popup | Approve the Freighter popup |
| `"Wallet not connected"` | No prior approval | Click "Connect Wallet" first |
| `"Transaction signing failed"` | User rejected sign | Approve the Freighter sign popup |
| `"Transaction failed: ..."` | Submission error | Show error toast; check Stellar explorer |
| `"Timeout waiting for transaction ..."` | Polling exceeded 60s | Retry or check transaction status manually |

### Error Handling in Context

The wallet context surfaces errors via toast notifications:

```typescript
// From wallet.context.tsx
try {
  const result = await sorobanService.registerProject(data, options);
  toast.success("Project registered on-chain!");
} catch (err) {
  if (err instanceof NetworkMismatchError) {
    toast.error(err.message); // "Switch to Testnet..."
  } else {
    toast.error("Transaction failed. Please try again.");
  }
}
```

## Local Development Setup

### Prerequisites

1. Install the [Freighter browser extension](https://freighter.app/)
2. Create a testnet account via [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test)

### Environment Configuration

Create `dongle/.env.local`:

```env
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT=C...
NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT=C...
NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT=C...
```

### Freighter Configuration

1. Open Freighter extension settings
2. Select **Testnet** as the network
3. Fund your test account with the Friendbot link above
4. The app will detect the network and validate automatically

### Running with Mock Data

When no wallet is connected, `sorobanService` falls back to mock responses for development:

```typescript
// Falls back when wallet not connected
return { hash: "mock_hash_" + generateId(), status: "SUCCESS" };
```

**Do not rely on this in production.** Always require wallet connection for real writes.

## Debugging Tips

### Check Wallet Connection

```typescript
// In browser console or component
import { walletService } from "@/services/wallet/wallet.service";

const available = await walletService.isFreighterAvailable();
const connected = await walletService.isConnected();
const network = await walletService.getNetworkPassphrase();
console.log({ available, connected, network });
```

### Common Issues

**"Wrong network" error but Freighter shows correct network:**
- Check `EXPECTED_NETWORK_PASSPHRASE` in `wallet.context.tsx`
- Ensure `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` matches your `.env.local`

**Transaction hangs at "Preparing":**
- RPC endpoint may be down — check `NEXT_PUBLIC_SOROBAN_RPC_URL`
- Network congestion — try increasing `timeoutMs` in `SorobanTransactionOptions`

**Silent reconnection fails on page refresh:**
- Freighter requires prior approval — user must have connected at least once
- Check `walletService.isConnected()` returns `true`

### Network Reference

| Network | Passphrase | RPC URL |
|---------|------------|---------|
| Testnet | `Test SDF Network ; September 2015` | `https://soroban-testnet.stellar.org:443` |
| Mainnet | `Public Global Stellar Network ; September 2015` | Mainnet RPC URL |

## Related Files

| File | Role |
|------|------|
| `dongle/services/wallet/wallet.service.ts` | Freighter API wrapper |
| `dongle/context/wallet.context.tsx` | React wallet state and network validation |
| `dongle/services/stellar/soroban.service.ts` | Transaction pipeline |
| `dongle/services/stellar/lazy-soroban.service.ts` | Lazy-loaded Soroban service |
| `dongle/constants/contracts.ts` | Contract IDs and network config |
