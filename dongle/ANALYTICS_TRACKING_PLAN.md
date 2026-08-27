# Analytics tracking plan

Privacy-conscious product analytics for Dongle core user journeys.

## Goals

Capture funnel signals for discovery → engagement → conversion without collecting
personally identifiable information (full wallet addresses, review bodies, raw
search queries, or form free-text).

## Configuration

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | No | Set to `false` to disable all analytics. Default: enabled in the browser. |
| `NEXT_PUBLIC_ANALYTICS_INGEST_URL` | No | Optional HTTPS endpoint that accepts `POST` JSON event payloads. When unset, events are only logged via `console.debug` in development. |

## Privacy rules

1. **No full wallet addresses.** When a wallet-scoped join key is useful, emit
   `wallet_fingerprint` — an 8-character FNV-1a hex digest of the G… key. The
   original address is never sent.
2. **No review / verification free text.** Only `rating` and `comment_length`
   (character count) are recorded for reviews.
3. **No raw search queries.** Search events include `query_length_bucket` and
   `has_query` only.
4. **No query strings on page views.** `page_view.path` is the pathname only;
   `has_query` indicates whether params were present.
5. **Property sanitizer.** `sanitizeProperties()` drops blocked keys
   (`publicKey`, `comment`, `query`, …) and redacts G…/C… ids found in strings.
6. **Session id** is a random opaque value stored in `sessionStorage`
   (`dongle_analytics_session`). It is not derived from a wallet.

## Event catalog

### `page_view`

| Property | Type | Notes |
|---|---|---|
| `path` | string | Pathname only (e.g. `/discover`) |
| `has_query` | boolean | Whether the URL had a query string |

Fired by `AnalyticsProvider` on client-side route changes.

### `wallet_connect`

| Property | Type | Notes |
|---|---|---|
| `network` | string \| null | Human label (`Testnet`, `Mainnet`, …) |
| `wallet_fingerprint` | string | Anonymized wallet id |

Fired on successful Freighter connect (`WalletProvider`).

### `wallet_connect_failed`

| Property | Type | Notes |
|---|---|---|
| `error_code` | string | Error name / code only — never the message body |

### `wallet_disconnect`

No properties. Fired when the user disconnects.

### `project_view`

| Property | Type | Notes |
|---|---|---|
| `project_id` | string | Public project slug / id |
| `category` | string | Primary category label |

Fired when a project detail page loads successfully.

### `search`

| Property | Type | Notes |
|---|---|---|
| `query_length_bucket` | string | `0`, `1-2`, `3-5`, `6-10`, `11-20`, `21+` |
| `has_query` | boolean | |
| `result_count` | number \| null | Matches after filter |
| `source` | string | e.g. `discover` |

Fired when the debounced Discover search query changes. **Raw query text is never sent.**

### `filter`

| Property | Type | Notes |
|---|---|---|
| `filter_type` | string | `category`, `sort`, `verification`, `tags` |
| `filter_value` | string | Selected value; for tags use `count:N` / `none` |
| `source` | string | e.g. `discover` |

### `project_submit` / `project_submit_failed`

| Property | Type | Notes |
|---|---|---|
| `mode` | string | `create` \| `edit` |
| `category` | string \| null | Success only |
| `project_id` | string \| null | Edit success only |
| `error_code` | string | Failure only |

### `verification_request` / `verification_request_failed`

| Property | Type | Notes |
|---|---|---|
| `project_ref_length` | number \| null | Length of the submitted project id / domain — not the value |
| `error_code` | string | Failure only |

### `review_submit` / `review_update` / `review_submit_failed`

| Property | Type | Notes |
|---|---|---|
| `action` | string | `create` \| `update` |
| `project_id` | string | |
| `rating` | number \| null | 1–5 |
| `comment_length` | number \| null | Character count only |
| `wallet_fingerprint` | string | Anonymized |
| `error_code` | string | Failure only |

**Review comment bodies are never recorded.**

## Implementation map

| Journey | Call site |
|---|---|---|
| Route visits | `components/analytics/AnalyticsProvider.tsx` |
| Wallet connect / disconnect | `context/wallet.context.tsx` |
| Project view | `app/projects/[id]/page.tsx` |
| Search / filter | `app/discover/page.tsx` |
| Project submit | `components/projects/ProjectForm.tsx` |
| Verification request | `components/verify/VerificationForm.tsx` |
| Review create / update | `app/projects/[id]/page.tsx`, `app/reviews/page.tsx` |

Core helpers live under `lib/analytics/`.
