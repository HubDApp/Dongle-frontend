# Data layer (offline cache, request deduplication, invalidation)

Coordinated client data path for:
[ANYTECHS/clips-frontend#910](https://github.com/ANYTECHS/clips-frontend/issues/910) (offline),
[ANYTECHS/clips-frontend#913](https://github.com/ANYTECHS/clips-frontend/issues/913) (dedup),
and [ANYTECHS/clips-frontend#911](https://github.com/ANYTECHS/clips-frontend/issues/911) (invalidation).

```
GET:      Request → Deduplication → Cache → Network
MUTATION: Online execution  |  Offline queue → Sync → Invalidation / refetch
```

Import from `@/lib/data-layer`. Do not add a parallel cache or a new query library.

## Offline caching (#910)

- Connectivity comes from `navigator.onLine` plus `online` / `offline` events (`startConnectivityMonitor`, `useOnlineStatus`).
- Successful **GET** responses can be stored in memory and, when `persist: true`, in `localStorage` (`dongle_data_cache`).
- While offline, GETs return cached data (including stale entries). Missing cache throws `OfflineCacheMissError`.
- **Queued mutations** (reviews API, draft save/delete) persist in `dongle_mutation_queue`. They replay after reconnect with exponential backoff.
- Each mutation sends an `Idempotency-Key` header. Identical pending/completed keys are not replayed twice.
- Auth, notification identify, and admin routes are **never** persisted (`isSensitiveUrl`).
- **Not queued:** Freighter / Soroban transactions. Those need a live wallet signature.

UI states (banner + `useDataSyncStatus`): Offline, Reconnecting, Syncing, Synced, Sync failed.

## Request deduplication (#913)

- Key = `METHOD` + normalized URL (sorted query) + stable JSON body (`createRequestKey`).
- Concurrent identical GETs share one in-flight promise.
- Optional window (`NEXT_PUBLIC_DATA_DEDUPE_WINDOW_MS` or per-call `dedupeWindowMs`) reuses a **successful** result. Rejections are not windowed.
- Metrics: `getDedupMetrics()` → `requestCount`, `deduplicatedCount`, `networkCount`, `deduplicationRate`.

## Cache invalidation (#911)

```ts
import {
  invalidateKey,
  invalidateKeys,
  invalidatePrefix,
  invalidateTag,
  invalidateAll,
  invalidateStale,
  invalidateAfterMutation,
} from "@/lib/data-layer";
```

- Successful mutations call `invalidateAfterMutation` (tags / keys / prefixes).
- `invalidateStale()` drops entries past their fresh TTL (time-based).
- `invalidateTag("projects")` also clears `projectMetaCache`; `"verification"` clears verification status; `"analytics"` clears the daily analytics memory cache.
- Invalidation bumps a generation counter and drops matching dedup entries so in-flight responses cannot repopulate a just-invalidated key. Concurrent refetches share one new network call.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_DATA_CACHE_TTL_MS` | `60000` | Fresh GET lifetime |
| `NEXT_PUBLIC_DATA_STALE_TTL_MS` | `300000` | Extra offline/stale lifetime |
| `NEXT_PUBLIC_DATA_DEDUPE_WINDOW_MS` | `0` | Post-flight reuse window (0 = in-flight only) |
| `NEXT_PUBLIC_DATA_SYNC_MAX_RETRIES` | `3` | Replay attempts after reconnect |
| `NEXT_PUBLIC_DATA_SYNC_INITIAL_DELAY_MS` | `1000` | Backoff start |
| `NEXT_PUBLIC_DATA_PERSIST_CACHE` | `true` | Persist GET cache |
| `NEXT_PUBLIC_DATA_PERSIST_QUEUE` | `true` | Persist mutation queue |

## Tests

```bash
cd dongle
pnpm test __tests__/lib/data-layer __tests__/components/OfflineBanner.test.tsx
```
