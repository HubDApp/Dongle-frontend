# Product features: i18n, notifications, analytics, OAuth

This document covers issues #443–#446. The frontend remains a Next.js app; Freighter is still required for on-chain writes. OAuth is a read-only identity. Live notifications and daily analytics run through Next.js route handlers in this repository.

## 1. Languages (i18n)

**Supported locales:** English (`en`), Spanish (`es`), Portuguese (`pt`). Default: `en`.

**Framework:** Custom catalogs in `dongle/lib/i18n/messages/` (not next-intl). `t()` + `useTranslation()`.

**Resolution order:**

1. URL query `?lang=en|es|pt` (shareable)
2. `localStorage` key `dongle_locale`
3. Default `en`

Invalid `?lang` values fall back to the stored locale, then English, and the URL is rewritten to a valid code.

**RTL:** `RTL_LOCALES` currently lists `ar` and `he` for layout infrastructure only. `document.documentElement.dir` is set to `rtl`/`ltr`. Arabic/Hebrew catalogs are not shipped.

**UI:** Language selector in the Navbar (`components/i18n/LanguageSelector.tsx`). Controls use `min-w-*` and flex layouts so longer translations do not collapse the bar.

## 2. Real-time notifications

**Transport:** Server-Sent Events at `GET /api/notifications/stream`.

WebSocket is not used: this app deploys as Next.js on Vercel, which fits SSE better than long-lived TCP sockets.

**Auth:** OAuth session cookie, or `dongle_notify_recipient` set by `POST /api/notifications/identify` (same trust model as draft APIs: the connected wallet/OAuth subject). Streams are scoped to that recipient.

**Event schema:**

```json
{
  "id": "uuid",
  "type": "project_verified|project_rejected|review_approved|review_rejected|verification_evidence_requested|claim_*",
  "recipientId": "oauth:google:… or G…",
  "createdAt": "ISO-8601",
  "projectId": "optional",
  "projectName": "optional",
  "reviewId": "optional"
}
```

Unknown types are ignored (HTTP 202, not stored). Duplicate `id` values are dropped.

**Client:** Navbar badge + drawer (latest 50). Toasts auto-dismiss after 5 seconds; history is not deleted. Reconnect uses bounded exponential backoff (cap 30s, 8 attempts). Logout/unmount closes the EventSource.

**Emit:** `POST /api/notifications/events` and `lib/notifications/emit.ts`. Verification approve/reject/evidence-request publish events. Production multi-instance deploys must replace `lib/notifications/server-store.ts` with Redis pub/sub.

## Soroban event monitoring

**Worker:** Start the long-running listener with `cd dongle && npm run indexer:worker`. Configure `SOROBAN_RPC_URL`, `SOROBAN_CONTRACT_ID`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `INDEXER_NOTIFICATION_URL` (the app's `/api/events/notifications` endpoint), and a shared `INDEXER_NOTIFICATION_TOKEN`. The worker calls Soroban RPC `getEvents` over HTTP, decodes contract event topics and values, queues events in Redis, stores per-contract ledger checkpoints, indexes them, and emits recipient-scoped SSE notifications. Supported event names include `ProjectRegistered`, `ProjectUpdated`, `ReviewSubmitted`, `VerificationApproved`, and `VerificationRejected`.

For a fresh installation the worker starts at the current ledger; set `SOROBAN_START_LEDGER` to backfill from a specific ledger. Subsequent restarts use the Redis checkpoint.

Soroban RPC exposes event queries over HTTP rather than a WebSocket subscription, so the listener polls at a bounded interval and retries from its last processed ledger after RPC/processing failures. Run one worker per contract unless a distributed queue consumer lock is configured. Redis is required to share queue and checkpoint state between the worker and the Next.js deployment; without it, local development uses process memory only.

**Health:** `GET /api/events/health` reports listener configuration, worker heartbeat, latest/indexed ledger, queue depth, and processing lag. The admin dashboard's Events tab refreshes this status every 15 seconds.

## Project social proof

`GET /api/social-proof` returns each project's daily badge set. It uses weekly review velocity for category top-10 trending, a minimum 4.5 rating and 20 reviews for Highly rated, 51+ unique wallet bookmarks for the bookmark badge, and a seven-day creation window for New. Featured IDs are admin-curated in the server-side `SOCIAL_PROOF_FEATURED_PROJECT_IDS` environment variable. The result is cached until 00:00 UTC; bookmark identities are stored as unique project/wallet pairs in Redis when configured.

## Ownership verification

The claim page and project-detail claim modal support DNS TXT (`dongle-verify=[token]`), a root GitHub `dongle-verify.txt` file, and Stellar `/.well-known/stellar.toml`. Stellar.toml verification requires matching `HOME_DOMAIN`, the claimant wallet in `ACCOUNTS`, and `DONGLE_VERIFY` set to the issued token. Tokens and statuses expire after 90 days; pending records are checked every 15 seconds, and owners see a re-verification prompt within 14 days of expiry. Configure Upstash Redis for shared production records; without it the service uses process-local memory. Manual admin review remains available as a fallback.

## Multilingual reviews

Review creation and edits detect and store one of 15 supported language codes (`en`, `es`, `fr`, `de`, `pt`, `it`, `nl`, `ru`, `ar`, `hi`, `zh`, `ja`, `ko`, `tr`, `sv`). Review lists group mixed-language content, allow language filtering, and can prioritize the browser language. Search folds diacritics and transliterates Cyrillic text; comments remain searchable in their native script. The Translate link points to the planned Issue #18 work and does not translate content yet.

**Load test (100 clients):**

```bash
cd dongle
node scripts/notification-load-test.mjs
```

Optional: `NOTIFY_SSE_URL=http://localhost:3000/api/notifications/stream` after signing in locally. The default path starts a mock SSE server so 100 production users are not required.

## 3. Analytics dashboard

**Route:** `/analytics`. **API:** `GET /api/analytics?range=7d|30d|90d|all&category=…&status=…`

**Metric definitions:**

| Metric | Calculation |
| --- | --- |
| Reviews/week (trending) | Count of review rows in the window × `(7 / windowDays)`. If no dated reviews exist, `project.reviews / max(1, weeksSinceCreated)`. Rank by that rate, then rating. |
| New projects/week | Projects with `createdAt` in the last 7 days of the selected range, normalized to a weekly rate. |
| Average rating | Mean of `project.rating` in the filtered set. |
| Median review count | Median of `project.reviews`. |
| Verification approval rate | `verified / (verified + rejected)` from the verification snapshot. `null` when no decided rows exist (this repo does not invent statuses). |
| Time series | Cumulative project/review counts by UTC day; verification rate when snapshot timestamps exist. |

**CSV:** `Export CSV` writes UTF-8 with BOM. Headers are stable English field names so the active UI locale cannot break parsers.

**Daily cache:** In-process cache valid until the next **00:00 UTC**. `GET /api/cron/analytics` refreshes it. `dongle/vercel.json` schedules `0 0 * * *`. Stale reads also refresh on demand. The browser is not responsible for the global cache.

**Soroban:** `lib/analytics-dashboard/soroban.ts` health-checks `NEXT_PUBLIC_SOROBAN_RPC_URL` when a real (non-placeholder) project registry ID is configured. This frontend does not own a full ledger indexer; catalog `mockProjects` remain the dataset when RPC is a placeholder, unhealthy, or returns no indexed rows. Failures surface as `rpcError` rather than silent fake metrics.

## 4. Google / GitHub OAuth

Freighter is unchanged. Navbar sign-in offers:

- Connect Wallet
- Sign in with Google
- Sign in with GitHub

OAuth users may discover, browse, search, and read reviews. Publishing (reviews, listings, verification, admin) still requires a Freighter signature. OAuth is **not** treated as a Stellar account.

**Flow:** `GET /api/auth/oauth/{google|github}` sets an httpOnly CSRF `state` cookie, then redirects. Callback validates `state`, exchanges the code **server-side** (client secrets never use `NEXT_PUBLIC_*`), creates a `dongle_oauth_session` JWT cookie.

**Account linking:** Identities are `oauth:{provider}:{providerId}`. Emails are not merged across providers. Linking a wallet (`POST /api/auth/link-wallet`) stores the `G…` address on that user after Freighter connect.

**Denied / invalid state / missing profile** redirect to `/?oauth_error=…` with translated toasts.

### Local OAuth setup (real providers)

1. Google Cloud Console → OAuth client (Web) → redirect `{AUTH_APP_URL}/api/auth/oauth/google/callback`
2. GitHub → OAuth App → callback `{AUTH_APP_URL}/api/auth/oauth/github/callback`
3. Put IDs and secrets in `dongle/.env.local` (see `.env.example`). Never commit them.
4. Set `AUTH_SESSION_SECRET` and `AUTH_APP_URL`.

## 5. Form audit logging (#559)

Every form interaction is appended to a searchable audit log with a timestamp,
the acting user identity, and the client IP.

- **Service:** `dongle/services/audit/form-audit-log.service.ts` — append-only
  `localStorage` log; sibling of the admin mutation log with the same
  retention/redaction conventions.
- **Hook:** `dongle/hooks/useFormAuditLog.ts` — `trackValues()` diffs form state
  and records a `field_change` per changed field; `logAction()` records submits.
- **IP stamping:** `GET /api/audit/client-ip` resolves the client IP server-side
  from proxy headers (a browser cannot read its own public IP). The client
  caches the stamp per page load; `dongle/lib/request-ip.ts` is shared with the
  anomaly-detection IP hash endpoint.
- **Search/export:** `formAuditLogService.search(query, filter)`,
  `list(filter)`, `exportCsv(filter)`, `redactedList(filter)`.
- Wired into the project registration/edit form (`project-form`) and the review
  form (`review-form`).

See [dongle/FORM_AUDIT_LOGGING.md](../dongle/FORM_AUDIT_LOGGING.md).

## Environment variables

| Variable | Client? | Purpose |
| --- | --- | --- |
| `AUTH_APP_URL` | No | Canonical origin for OAuth redirects |
| `NEXT_PUBLIC_APP_URL` | Yes | Public origin fallback |
| `AUTH_SESSION_SECRET` | No | Session JWT |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | No | GitHub OAuth |
| `CRON_SECRET` | No | Protects `/api/cron/analytics` |

## Production notes

- Replace in-memory users, notification bus, and analytics cache with Redis/Postgres before multi-instance production.
- Wire a real Soroban indexer before treating on-chain aggregates as complete.
- Review OAuth redirect URIs per environment (preview vs production).
- Analytics CSV may include public catalog fields only; private reviews/notifications are not exported.

## Tests

```bash
cd dongle
npm test
npm run typecheck
node scripts/notification-load-test.mjs
```
