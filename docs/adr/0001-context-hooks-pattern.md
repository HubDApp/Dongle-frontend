# ADR 0001: Context + Hooks instead of Redux

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Dongle frontend

## Context

Dongle is a Next.js App Router client. Global state is narrow:

- Wallet connection (Freighter public key, network, connect/disconnect)
- Confirm dialogs
- Project comparison selections (session-scoped, max 4)
- A handful of feature hooks that talk to services (`useDraft`, `useSavedProjects`, `useRecentViews`)

Most screens are server-friendly pages plus local form state. There is no large shared cache of normalized entities, no optimistic multiplayer sync, and no need for time-travel debugging in production.

A Redux (or Zustand + slice) store would add boilerplate, another mental model, and a second source of truth next to React. The team is small; the cost of teaching Redux Toolkit, middleware, and selector patterns is not justified by the current state shape.

## Decision

Use **React Context + custom hooks**. Providers mount once in `app/layout.tsx`:

- `WalletProvider` + `useWallet` (`context/wallet.context.tsx`) — wallet lifecycle
- `ConfirmDialogProvider` + `useConfirm` (`hooks/useConfirm.tsx`) — one shared modal
- `ComparisonProvider` + `useComparison` (`context/comparison.context.tsx`) — compare tray

Domain logic stays in **services** (`services/**`). Hooks are thin adapters: they subscribe to context or localStorage, call a service, and return UI-ready state. Page-level filters (`useDiscoverParams`, `useProjectFilters`) own their own state (URL or `sessionStorage`) instead of a global store.

Do **not** put server data (Horizon balances, contract reads) in a global store. Fetch it in feature hooks (`useStellarAccount`) keyed off `useWallet()`.

## Consequences

**Positive**

- Zero extra state library; React 19 + Next.js is enough
- Easy to test: mock the context or the service, not a store
- Clear ownership: wallet in one provider, drafts in `draftService`, reviews in `reviewService`

**Negative**

- Context re-renders every consumer when wallet state changes. Keep wallet context small (it already is).
- No built-in cache layer (React Query / SWR). Duplicate Horizon fetches are possible if two trees call `useStellarAccount` independently.
- Cross-tree events (saved projects) use `CustomEvent` + `localStorage` rather than a store subscription.

**Follow-up**

- If we add a real indexed catalog, a server cache library (TanStack Query) is the next step — still not Redux.
- If comparison or wallet context grows noisy, split into two contexts (state vs. actions) before reaching for Redux.

## Alternatives

| Alternative | Why not |
|-------------|---------|
| **Redux Toolkit** | Heavy for three providers. Actions/reducers would wrap the same Freighter and localStorage calls we already have. |
| **Zustand / Jotai** | Lighter than Redux, but still a new API and another dependency. Context already covers app-wide data. |
| **TanStack Query only** | Excellent for server state; does not replace wallet session or comparison tray. Can be added later *alongside* Context. |
| **URL as the only store** | Works for Discover filters (`useDiscoverParams`). Does not work for wallet keys or draft autosave. |
