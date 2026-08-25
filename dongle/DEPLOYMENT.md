# Production Deployment Checklist

App-specific runbook for deploying Dongle (Next.js app in `dongle/`) to Vercel or another host. Use this before promoting a preview to production.

## Prerequisites

- [ ] Node.js ≥ 20 and npm ≥ 10 available for local smoke checks
- [ ] Freighter wallet available for a manual wallet/network smoke test
- [ ] Real Soroban contract IDs for Project, Review, and Verification registries
- [ ] Hosting project root set to **`dongle/`** (Vercel: Settings → General → Root Directory)
- [ ] Preview and Production environment variables configured separately in the host

## Environment setup

Copy from `.env.example`, then set real values for the target network:

| Variable | Production | Notes |
| -------- | ---------- | ----- |
| `NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT` | **Required** | 56-char Stellar contract ID (`C` + 55 base32). Must **not** be the all-A placeholder. |
| `NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT` | **Required** | Same format as above. |
| `NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT` | **Required** | Same format as above. |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | **Required** | e.g. testnet `https://soroban-testnet.stellar.org:443` or your mainnet RPC. |
| `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` | **Required** | Must match Freighter’s network. Testnet: `Test SDF Network ; September 2015`. Mainnet: `Public Global Stellar Network ; September 2015`. |
| `NEXT_PUBLIC_ADMIN_ALLOWLIST` | Optional | Comma-separated `G…` public keys. Empty disables admin access. |
| `NEXT_PUBLIC_REVIEW_PERSISTENCE` | Optional | Set to `api` for server persistence; leave unset for localStorage (dev-only). |

### Validate config before deploy

From `dongle/`:

```bash
npm run validate:env
```

This fails clearly when required variables are missing, malformed, or still set to the development placeholder contract ID.

On Vercel, set the same variables under **Project → Settings → Environment Variables** for **Preview** and **Production**. `NEXT_PUBLIC_*` values are inlined at **build** time — changing them requires a redeploy.

## Wallet & network assumptions

- [ ] Freighter is installed and unlocked
- [ ] Freighter network matches `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE`
- [ ] Read-only routes work without a wallet; write flows (review, verify, admin) require a connected wallet
- [ ] Testnet accounts are funded via [Friendbot](https://friendbot.stellar.org/) when exercising fee-paying flows
- [ ] A network mismatch shows the in-app banner; do not promote if Freighter and app passphrase disagree

## Pre-deploy checklist

1. [ ] `npm ci`
2. [ ] `npm run lint && npm run typecheck && npm test`
3. [ ] `npm run validate:env` (with production/preview env loaded)
4. [ ] `npm run build`
5. [ ] Confirm contract IDs point at the intended network (testnet vs mainnet)
6. [ ] Confirm admin allowlist is intentional (empty = no admin UI access)

## Preview validation (main routes)

After a preview deploy (or against a local production server), confirm core routes render HTTP 200:

```bash
# Local production-like check
npm run build && npm run start
# in another terminal:
PREVIEW_URL=http://localhost:3000 npm run preview:smoke

# Against a Vercel preview URL
PREVIEW_URL=https://your-preview.vercel.app npm run preview:smoke
```

Routes checked by default:

- `/` (landing)
- `/discover`
- `/listing`
- `/reviews`
- `/verify`
- `/projects/new`
- `/docs`
- `/profile`
- `/compare`

CI can run the same script via the **Preview Validation** workflow (`workflow_dispatch` or after a preview URL is known).

### Manual smoke tests

- [ ] Landing loads brand + CTA
- [ ] Discover lists/filters without a wallet
- [ ] Project detail opens from discover/listing (when data exists)
- [ ] Connect wallet → Freighter prompt → correct network badge
- [ ] Review / verify pages render (submit only if contracts are real)
- [ ] Admin page: allowlisted wallet sees dashboard; others are gated
- [ ] No production-config error banner (placeholder contracts rejected)

## Missing configuration must fail loudly

- **`npm run validate:env`** exits non-zero with a field-by-field report
- **Production runtime** rejects missing/invalid env and the all-A placeholder contract IDs (see `constants/contracts.ts`)
- **UI** shows a production config banner if the build somehow ships with placeholder contracts so users are not sent into broken on-chain flows

Do **not** promote a preview that fails `validate:env` or `preview:smoke`.

## Promote to production

1. [ ] Preview checklist passed
2. [ ] Production env vars set (not Preview-only)
3. [ ] Redeploy production (or merge to `main` if auto-deploy is enabled)
4. [ ] Re-run `PREVIEW_URL=<production-url> npm run preview:smoke`
5. [ ] Spot-check Freighter on the production network passphrase

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `ENVIRONMENT CONFIGURATION ERROR` at startup | Missing/invalid env | Set vars in host; run `validate:env` |
| Config banner about placeholder contracts | Dev placeholder still inlined | Set real contract IDs and redeploy |
| Wallet txs rejected by RPC | Passphrase / network mismatch | Align Freighter with `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` |
| Preview smoke 404s | Wrong Root Directory | Set Vercel root to `dongle/` |
| Build OK in CI but prod broken | CI build is permissive without secrets | Always run `validate:env` with real env before promote |

## Related docs

- [README.md](./README.md) — local setup and env table
- [SETUP.md](./SETUP.md) — dependency / platform install notes
- [`.env.example`](./.env.example) — variable templates
