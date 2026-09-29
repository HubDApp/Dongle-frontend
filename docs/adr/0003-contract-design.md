# ADR 0003: Split Soroban registries and env-configured contract IDs

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Dongle frontend

## Context

Dongle talks to several on-chain concerns: listing dApps, storing review pointers, and running the verification lifecycle (including fees). A single “god contract” would simplify the frontend (one ID, one ABI) but would couple upgrades, increase audit surface, and make fee policy changes dangerous.

The frontend must also run against **testnet placeholders in development** and **real IDs in production** without code edits. Wrong IDs or a mainnet/testnet mix-up would submit transactions to the wrong program.

Existing client code already models this split:

- `DONGLE_CONTRACTS.PROJECT_REGISTRY`
- `DONGLE_CONTRACTS.REVIEW_REGISTRY`
- `DONGLE_CONTRACTS.VERIFICATION_REGISTRY`
- `SOROBAN_CONFIG.RPC_URL` + `NETWORK_PASSPHRASE`

IDs are validated with Zod (`ContractIdSchema`: `C` + 55 base32 chars) in `constants/contracts.ts`. Production builds fail closed; development/test may use a dummy ID.

## Decision

**Three dedicated Soroban contracts** (plus a fee manager on the protocol side if fees are not inlined in verification):

1. **Project Registry** — create/update listings, ownership, categories
2. **Review Registry** — one review per (user, project), rating, off-chain CID
3. **Verification Registry** — request / approve / reject / revoke, evidence CID, status

The frontend never hardcodes production IDs. It reads:

| Env var | Purpose |
|---------|---------|
| `NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT` | Project registry ID |
| `NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT` | Review registry ID |
| `NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT` | Verification registry ID |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | RPC endpoint |
| `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` | Network identity |

`soroban.service.ts` is the only module that builds transactions. UI components call hooks/services, not `Contract` directly. Wallet network is checked against `EXPECTED_NETWORK_PASSPHRASE` before submit (`NetworkMismatchError`).

Contract calls that are not yet deployed still go through this service so the ABI and ID wiring stay in one place.

## Consequences

**Positive**

- Registries can upgrade independently; a review-schema change does not redeploy listings
- Env-based IDs make testnet/mainnet and preview deploys mechanical
- Fail-fast validation in production prevents shipping a build with placeholder `C…` IDs
- Clear mapping to the product’s three user journeys: list, review, verify

**Negative**

- Cross-contract reads (e.g. “average rating on a project card”) need multiple RPC calls or an indexer
- More IDs to keep in sync across frontend, docs, and deploy scripts
- Frontend must handle partial outages (reviews up, verification down)

**Follow-up**

- When the indexer exists, keep contracts as the source of truth and treat the API as a cache
- Add a fourth env var if Fee Manager is a separate deployed contract rather than an internal module

## Alternatives

| Alternative | Why not |
|-------------|---------|
| **Monolithic Dongle contract** | Simpler client, painful upgrades, larger audits, mixed auth (user vs admin vs owner). |
| **Backend-only writes, contracts as archive** | Contradicts wallet-signed, user-visible on-chain actions. |
| **Hardcoded IDs in source** | Breaks preview apps and forces a frontend release for every redeploy. |
| **One registry + off-chain everything** | Listings would not be independently verifiable; Dongle would own the catalog. |
