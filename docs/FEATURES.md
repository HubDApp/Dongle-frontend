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
