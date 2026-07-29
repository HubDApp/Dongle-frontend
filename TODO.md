# TODO - Soroban tx fix (sequence + simulation/prepare)

## Step 1: Implement sequence loading + simulation/prepare pipeline
- [ ] Update `dongle/services/stellar/soroban.service.ts`
  - Replace `new Account(publicKey, "0")` with real sequence from RPC
  - Build tx with real source
  - Call `server.simulateTransaction(tx)`
  - Call `server.prepareTransaction(...)` (or equivalent in current `stellar-sdk`)
  - Sign prepared tx via `walletService.signTransaction`

## Step 2: Add polling with timeout + useful error messages
- [ ] Add helper `pollTransaction(hash, {timeoutMs, intervalMs})`
- [ ] Use timeout in `registerProject` and `updateProject`
- [ ] Improve thrown errors with last known tx status / RPC info

## Step 3: Update tests (mocked integration coverage)
- [ ] Update `dongle/__tests__/services/soroban.service.test.ts`
  - Add tests for success path calling sequence/simulate/prepare/send
  - Add test for polling timeout failure path

## Step 4: Run tests
- [ ] Run `pnpm test` (or `npm test`) and ensure Vitest passes

