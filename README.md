# Dongle

**Your Onchain App Store** — a discovery, review, and verification platform for decentralized applications built on Stellar.

Dongle lets users browse and rate dApps, lets project owners list and verify their projects, and lets admins manage verification — all backed by on-chain Soroban smart contracts, with heavier content (images, written reviews, verification evidence) stored on IPFS.

## Table of Contents

- [What Dongle Does](#what-dongle-does)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Wallet & Network Setup](#wallet--network-setup)
- [Available Scripts](#available-scripts)
- [Known Limitations](#known-limitations)

## What Dongle Does

Dongle is the frontend for an on-chain "app store." It reads project, review, and verification data directly from Stellar/Soroban smart contracts and presents it in a familiar, browsable UI.

**Core features:**

- **dApp discovery** — browse all registered dApps by category (DeFi, NFTs, Gaming, Tools, DAOs, etc.), sorted by rating, trending, recency, or verification status.
- **Reviews and ratings** — connected users can leave a 1–5 star rating plus an optional written review. Ratings are aggregated on-chain; long-form review text and evidence live on IPFS, referenced by CID. Each wallet can submit one review per project (with updates).
- **Verification flow** — project owners can request verification for a fee (paid in a Stellar asset such as XLM or USDC), attaching off-chain evidence (audits, docs, links). Admins/verifiers approve, reject, suspend, or revoke verification, and status is shown on the project page.
- **Wallet-gated writes** — reading listings and reviews works without a wallet. Any write action (submitting a review, requesting verification, admin decisions) requires a connected wallet and a signed transaction.

**Data flow, roughly:**

1. The frontend reads on-chain state (projects, reviews, verification status) via Soroban RPC.
2. Off-chain content (images, long reviews, verification evidence) is fetched from IPFS by CID.
3. User actions are built as contract calls, signed via the connected wallet, and submitted to the network.
4. The UI refreshes by re-reading on-chain state after a transaction confirms.

It talks to four contracts: a **Project Registry**, a **Review Registry**, a **Verification Registry**, and a **Fee Manager**, all configured via environment variables so the same build can point at testnet or mainnet.

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Blockchain:** `stellar-sdk` for Soroban RPC/contract calls, `@stellar/freighter-api` for wallet integration
- **Forms/validation:** `react-hook-form` + `zod`
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest + Testing Library
- **Package manager:** pnpm (pinned via `packageManager` in `package.json`)

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10 (`corepack enable` will pick up the pinned version automatically)
- A [Freighter](https://www.freighter.app/) wallet browser extension, set to **Testnet**, if you want to exercise wallet-gated flows locally

### Install

```bash
pnpm install
```

### Configure environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local` as needed — see [Environment Variables](#environment-variables) below. For local development you can usually leave everything at its default; the app falls back to placeholder contract IDs and the public testnet RPC when values are unset.

### Run the dev server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Build for production

```bash
pnpm build
pnpm start
```

## Environment Variables

Copy `.env.example` to `.env.local` in the project root and fill these in:

| Variable                                     | Required   | Description                                                                                                                                 |
| -------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT`      | Production | Soroban contract ID (56 chars, starts with `C`) for the Project Registry.                                                                   |
| `NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT`       | Production | Soroban contract ID for the Review Registry.                                                                                                |
| `NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT` | Production | Soroban contract ID for the Verification Registry.                                                                                          |
| `NEXT_PUBLIC_SOROBAN_RPC_URL`                | Optional   | Soroban RPC endpoint. Defaults to Stellar testnet (`https://soroban-testnet.stellar.org:443`).                                              |
| `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE`     | Optional   | Network passphrase; must match the network selected in Freighter. Defaults to the testnet passphrase (`Test SDF Network ; September 2015`). |
| `NEXT_PUBLIC_ADMIN_ALLOWLIST`                | Optional   | Comma-separated list of Stellar public keys (`G...`) allowed to access the admin dashboard. Leave empty to disable admin routes.            |

**Development builds use placeholder defaults for the contract IDs when they're unset** — see [Known Limitations](#known-limitations). To point the app at real deployed contracts (testnet or mainnet), set all three contract ID variables explicitly and make sure `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` matches the network those contracts are deployed on.

## Wallet & Network Setup

- Dongle uses [Freighter](https://www.freighter.app/) as its wallet integration (`@stellar/freighter-api`). Install the browser extension to connect a wallet.
- Read-only browsing (listings, ratings, reviews) does **not** require a wallet.
- Any write action — submitting a review, requesting verification, admin approvals — requires a connected wallet and will prompt a Freighter signature.
- By default the app targets **Stellar testnet**. Make sure Freighter's active network matches `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE`, or signed transactions will be rejected by the RPC.
- Verification requests require paying a fee in a Stellar asset (e.g. XLM or USDC) — make sure your testnet account is funded (via [Friendbot](https://friendbot.stellar.org/)) before exercising that flow locally.

## Available Scripts

| Command           | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `pnpm dev`        | Start the Next.js dev server.                                     |
| `pnpm build`      | Build the production bundle.                                      |
| `pnpm start`      | Serve the production build.                                       |
| `pnpm lint`       | Run ESLint (`--max-warnings 0`, so any warning fails the check).  |
| `pnpm typecheck`  | Run `tsc --noEmit` to check types without emitting output.        |
| `pnpm test`       | Run the Vitest suite once.                                        |
| `pnpm test:watch` | Run Vitest in watch mode.                                         |
| `pnpm audit`      | Run the project's custom audit script (`scripts/audit-check.js`). |

Before pushing or opening a PR, it's worth running lint, typecheck, and test together:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Known Limitations

- **Placeholder contract IDs in development.** If the three `NEXT_PUBLIC_*_CONTRACT` variables are left unset, the app falls back to placeholder contract addresses rather than real deployed contracts. On-chain reads/writes against these placeholders will not reflect real data — set real testnet or mainnet contract IDs to exercise actual contract behavior.
- **Testnet-first.** Defaults (RPC URL, network passphrase) point at Stellar testnet. Mainnet use requires explicitly overriding all network-related env vars, and has not been the primary target during development.
- **Off-chain evidence storage.** Written reviews and verification evidence are stored on IPFS and referenced on-chain by CID — the frontend depends on that off-chain content being pinned/available; it is not itself persisted on-chain.
- **Admin access is allowlist-based.** Admin routes are gated purely by the `NEXT_PUBLIC_ADMIN_ALLOWLIST` public keys; leaving it empty disables the admin dashboard entirely rather than restricting it.
