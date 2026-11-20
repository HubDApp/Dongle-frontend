# Data Fetching — SWR vs useEffect

This document describes when to use SWR and when to reach for `useEffect`, as well as the global configuration shipped in `SWRProvider`.

---

## Quick decision guide

| Scenario | Use |
|---|---|
| Fetching server data that may become stale (projects, verification status, social proof) | `useSWR` |
| Background polling (e.g. verification status every 5 min) | `useSWR` with `refreshInterval` |
| Keeping multiple components in sync on the same data | `useSWR` (shared cache key) |
| Fire-and-forget side effects (analytics events, localStorage writes) | `useEffect` |
| One-time setup that depends on the DOM or browser APIs | `useEffect` |
| Triggering a mutation on user action (form submit, wallet sign) | `useSWRMutation` or plain `fetch` + `mutate()` |
| Subscribing to a WebSocket or EventSource | `useEffect` with cleanup |

The rule of thumb: **if you're reading server state that another render might need, use SWR**. If you're doing something once, in response to a mount or a user action with no shared consumption, `useEffect` is fine.

---

## Global configuration (`SWRProvider`)

`providers/SWRProvider.tsx` wraps the whole client tree with `SWRConfig`. Every `useSWR` call inherits these defaults unless it overrides them in its own options object.

| Option | Value | Rationale |
|---|---|---|
| `revalidateOnFocus` | `true` | Refreshes data when the user returns to the tab — important after wallet interactions in an external window. |
| `revalidateOnReconnect` | `true` | Re-fetches after the browser comes back online. |
| `dedupingInterval` | `5 000 ms` | Collapses concurrent requests for the same key into one network call. Set lower than SWR's 30 s default because cards mount/unmount rapidly during navigation. |
| `refreshInterval` | `0` | No global polling. Hooks that need it set their own value and it overrides this. |
| `focusThrottleInterval` | `10 000 ms` | Prevents bursts of revalidations from rapid tab switches. |
| `revalidateIfStale` | `true` | Shows cached data immediately while fetching fresh data in the background (the core stale-while-revalidate pattern). |
| `refreshWhenHidden` | `false` | No background polling when the tab is not visible. |
| `refreshWhenOffline` | `false` | No polling when offline. |
| `onErrorRetry` | Exponential back-off | See below. |

### Error retry with exponential back-off

Failed fetches are retried up to **5 times** using:

```
delay = min(2^attempt × 2 s + jitter(0–1 s), 30 s)
```

| Attempt | Approx. delay |
|---|---|
| 1 | 2–3 s |
| 2 | 4–5 s |
| 3 | 8–9 s |
| 4 | 16–17 s |
| 5 | 30 s (cap) |

Requests that return **401, 403, or 404** are **not retried** — they represent permanent failures that retrying cannot fix.

---

## Per-hook overrides

Options passed directly to `useSWR` merge on top of the global config and win. Example from `useVerificationStatuses`:

```ts
useSWR(ids, fetcher, {
  refreshInterval: 300_000,   // 5-minute polling — overrides global 0
  dedupingInterval: 60_000,   // tighter deduplication for batch calls
});
```

Only specify options that meaningfully differ from the global defaults. Repeating defaults is noise.

---

## Standardised loading states (`useLoadingState`)

Import `useLoadingState` from `hooks/useLoadingState.ts` to convert raw SWR flags into one of three named phases:

```ts
import { useLoadingState } from "@/hooks/useLoadingState";

const { data, error, isLoading } = useSWR(key, fetcher);
const phase = useLoadingState({ isLoading, error, hasData: !!data });

if (phase === "loading") return <Skeleton />;
if (phase === "error")   return <ErrorMessage error={error} />;
// phase === "ready"
return <MyComponent data={data} />;
```

**Phase semantics:**

- `"loading"` — no cached data, initial fetch in progress. Show a skeleton.
- `"error"` — fetch failed and there is no data to fall back on. Show an inline error.
- `"ready"` — data is available. Render normally. SWR may be revalidating in the background; check `isValidating` from the useSWR return value if you want a subtle "refreshing" indicator.

Do **not** show a full loading spinner when `isValidating` is true and data already exists — that breaks the stale-while-revalidate UX.

---

## Common mistakes to avoid

**1. Fetching inside `useEffect` for data other components also need**

```ts
// ❌ creates duplicate requests and no shared cache
useEffect(() => {
  fetch("/api/social-proof").then(r => r.json()).then(setSocialProof);
}, []);

// ✅ shares the cache across every component on the page
const { data } = useSWR("/api/social-proof", fetcher);
```

**2. Setting `refreshInterval` globally for one slow endpoint**

Override at the hook level, not in `SWR_GLOBAL_CONFIG`. Global polling affects every key, including ones that should never poll (e.g. static config endpoints).

**3. Passing `isLoading || isValidating` as the loading gate when data exists**

```ts
// ❌ shows a spinner during background revalidation — jarring UX
if (isLoading || isValidating) return <Spinner />;

// ✅ only block render on the first fetch
const phase = useLoadingState({ isLoading, error, hasData: !!data });
if (phase === "loading") return <Skeleton />;
```

**4. Using a plain `fetch` inside `useEffect` for data that changes**

If the server data can change (e.g. a project's verification status), SWR will keep it fresh automatically. `useEffect` will silently show stale values until the user refreshes.
