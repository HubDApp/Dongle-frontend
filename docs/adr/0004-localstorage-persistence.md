# ADR 0004: localStorage for client-owned MVP persistence

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Dongle frontend

## Context

Several features need to survive a refresh **before** the matching contract or API is the system of record:

- Wallet session restore (`dongle_wallet_state`)
- Review drafts and submitted reviews in development (`dongle_reviews`)
- Project form autosave (`dongle_project_drafts`)
- Verification request status in development
- Saved projects (per wallet) and recently viewed projects
- Discover filter snapshot (`sessionStorage`: `dongle_project_filters`)

A backend would give cross-device sync and shared catalogs, but it would also become the source of truth for data that is supposed to live on-chain. Cookies/HTTP-only sessions do not map to Freighter-based auth. IndexedDB is better for large binary data, which we do not store locally.

This is an **MVP / prototype** constraint: reviewers and drafts are **per browser**, not global.

## Decision

Use **`localStorage` (and `sessionStorage` for ephemeral UI)** as the persistence layer for client-owned state, behind services — never from random components calling `localStorage` ad hoc.

Conventions:

| Key prefix | Owner | Survives tab close | Scoped by wallet |
|------------|--------|--------------------|------------------|
| `dongle_wallet_state` | `WalletProvider` | Yes | Current key |
| `dongle_reviews` | `review.service` | Yes | Review records include address |
| `dongle_project_drafts` | `draft.service` | Yes | Not wallet-scoped (device drafts) |
| `dongle_saved_projects:{G…}` | `useSavedProjects` | Yes | Yes |
| `dongle_recent_views` | `recent-views.service` | Yes | Optional |
| `dongle_project_filters` | `useProjectFilters` | **No** (`sessionStorage`) | No |

Rules:

1. All reads/writes go through a service or a dedicated hook (testable, SSR-safe).
2. Guard `typeof window === "undefined"`; return empty defaults on the server.
3. JSON.parse failures wipe or ignore the key; never crash the tree.
4. Do not store secret keys, seed phrases, or signed XDR long-term.
5. Production on-chain writes **replace** the matching localStorage collection when that contract path is live — localStorage is not the protocol.

Wallet restore still **re-validates** with Freighter (`isConnected` / `getPublicKey`) instead of trusting the stored flag alone.

## Consequences

**Positive**

- Autosave, saved apps, and reviews work offline in the prototype
- No backend required for UX spikes
- Easy to inspect in DevTools and to mock in Vitest

**Negative**

- Clearing site data destroys reviews, drafts, and saved lists
- No cross-device or cross-browser sync
- Storage is readable by any script on the origin (XSS risk — keep payloads non-sensitive)
- Quota (~5 MB) is enough for JSON listings, not for media (media belongs on IPFS; see [ADR 0002](./0002-ipfs-integration.md))

**Follow-up**

- Migrate reviews and verification out of localStorage when registries are the write path
- Keep drafts and “saved for later” local even after contracts ship (they are user-device preferences)
- Document export/import if power users need to move a browser profile

## Alternatives

| Alternative | Why not |
|-------------|---------|
| **REST/API database now** | Duplicates the future contract state, requires auth besides the wallet, and delays the on-chain roadmap. |
| **IndexedDB** | Better for large blobs; unnecessary for small JSON. Harder to debug and to SSR-guard. |
| **Cookies** | Sent on every request; wrong for megabytes of reviews; not how Freighter sessions work. |
| **Redux Persist** | Depends on rejecting Context (see [ADR 0001](./0001-context-hooks-pattern.md)). Would still serialize to localStorage. |
| **No persistence** | Drafts and wallet reconnect would reset on every refresh; unacceptable UX even for MVP. |
