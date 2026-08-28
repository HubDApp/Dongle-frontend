# Dongle Hooks Usage Guide

Custom hooks are the UI-facing API for wallet, Stellar, drafts, and page state. Business logic lives in `services/`; hooks subscribe, call those services, and return values components can render.

Related: [ADR 0001 — Context + Hooks](./adr/0001-context-hooks-pattern.md), [ADR 0004 — localStorage](./adr/0004-localstorage-persistence.md).

## When to use which hook

| Need | Hook | Do not use |
|------|------|------------|
| Connect / disconnect Freighter, public key, network | `useWallet` | Calling `walletService` from a component |
| Horizon balances / account record | `useStellarAccount` | Fetching Horizon in the page body |
| Gate a page until wallet is ready | `useWalletPageGate` | Nested `if (!isConnected)` trees |
| Autosave a project form | `useDraft` | Writing `localStorage` in the form |
| Bookmark / unbookmark a project | `useSavedProjects` | A global “favorites” context |
| Recently viewed rail | `useRecentViews` | Duplicating `recentViewsService` in the page |
| Confirm before a destructive action | `useConfirm` | `window.confirm` in product UI |
| Warn before leaving a dirty form | `useUnsavedChanges` | Only `beforeunload` without in-app confirm |
| Submit a Soroban tx with progress UI | `useOnChainTransaction` | Ad-hoc toast + `useState` phase machines |
| Discover URL filters (shareable) | `useDiscoverParams` | `useProjectFilters` on `/discover` |
| Homepage / featured category chips | `useProjectFilters` | Putting those chips in the URL |
| Compare-tray selection | `useComparison` | A new Redux slice |

---

## State management model

```
[ Freighter / Horizon / Soroban ]
              ↑
         services/*
              ↑
   Context providers (wallet, confirm, comparison)
              ↑
         custom hooks
              ↑
           pages / components
```

- **Context** holds app-wide session state (wallet, confirm modal, comparison list).
- **Hooks** may also own local React state and persist through a service (`useDraft` → `draftService` → `localStorage`).
- **URL state** is used when the view must be shareable (`useDiscoverParams`).
- **Do not** duplicate wallet state in a hook; read `useWallet()` instead.

SSR: any hook that touches `window` / `localStorage` must default to empty values on the server. Most of these files are `"use client"`.

---

## `useWallet`

**File:** `context/wallet.context.tsx`  
**Provider:** `WalletProvider` (root layout)  
**Dependencies:** `walletService`, `SOROBAN_CONFIG`, `localStorage` key `dongle_wallet_state`

Throws if used outside `WalletProvider`.

```tsx
"use client";

import { useWallet } from "@/context/wallet.context";
import { Button } from "@/components/ui/Button";

export function WalletButton() {
  const {
    publicKey,
    isConnected,
    isConnecting,
    isFreighterAvailable,
    isCorrectNetwork,
    walletNetworkLabel,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  if (isFreighterAvailable === false) {
    return <p>Install Freighter to continue.</p>;
  }

  if (!isConnected) {
    return (
      <Button onClick={() => void connectWallet()} isLoading={isConnecting}>
        Connect wallet
      </Button>
    );
  }

  return (
    <div>
      <p>{publicKey}</p>
      {!isCorrectNetwork && <p>Switch Freighter to {walletNetworkLabel}</p>}
      <Button variant="ghost" onClick={disconnectWallet}>
        Disconnect
      </Button>
    </div>
  );
}
```

**Returned state**

| Field | Meaning |
|-------|---------|
| `publicKey` | Stellar `G…` address or `null` |
| `isConnected` | Freighter session is active |
| `isConnecting` | Connect request in flight |
| `isFreighterAvailable` | `null` while detecting, then `true`/`false` |
| `walletNetwork` | Raw passphrase from Freighter |
| `isCorrectNetwork` | Connected **and** passphrase matches env |
| `connectWallet` / `disconnectWallet` | Actions |

Polls Freighter every 2s while connected for account/network changes.

---

## `useStellarAccount`

**File:** `hooks/useStellarAccount.ts`  
**Dependencies:** `useWallet`, `stellarService.getAccount`

Fetches the Horizon account for the connected key. Clears state when disconnected.

```tsx
"use client";

import { useStellarAccount } from "@/hooks/useStellarAccount";

export function XlmBalance() {
  const { balances, loading, error, refetch } = useStellarAccount();

  if (loading) return <p>Loading account…</p>;
  if (error) return <p role="alert">{error}</p>;

  const native = balances?.find((b) => b.asset_type === "native");
  return (
    <p>
      {native?.balance ?? "0"} XLM
      <button type="button" onClick={() => void refetch()}>
        Refresh
      </button>
    </p>
  );
}
```

**Notes**

- Toasts on failure via `sonner`.
- Uses an `isMounted` ref so unmount during fetch does not set state.
- Does not require a funded account to *call*; Horizon 404 becomes `error` (see `useWalletPageGate` for gating).

---

## `useWalletPageGate`

**File:** `hooks/useWalletPageGate.ts`  
**Dependencies:** `useWallet`, `useStellarAccount` (only if `requireFundedAccount`)

Maps wallet + account into a single `state` for `WalletStatePanel`.

Priority: `freighter-missing` → `connecting` → `disconnected` → `wrong-network` → (optional) `account-loading` / `account-not-funded` → `ready`.

```tsx
"use client";

import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import WalletStatePanel from "@/components/wallet/WalletStatePanel";
import ProjectForm from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  const gate = useWalletPageGate(); // add { requireFundedAccount: true } if Horizon must succeed

  if (gate.state !== "ready") {
    return (
      <WalletStatePanel
        state={gate.state}
        pagePurpose="Connect Freighter to submit a project."
        walletNetworkLabel={gate.walletNetworkLabel}
        publicKey={gate.publicKey}
        onConnect={gate.connectWallet}
        onDisconnect={gate.disconnectWallet}
      />
    );
  }

  return <ProjectForm />;
}
```

---

## `useDraft`

**File:** `hooks/useDraft.ts`  
**Dependencies:** `draftService` (`dongle_project_drafts`)

Autosaves create/edit project forms. Draft IDs: `new-project-draft` or `edit-project-{projectId}`. Empty forms are not persisted (`hasContent`).

```tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDraft } from "@/hooks/useDraft";

export function ProjectFormFields({ projectId }: { projectId?: string }) {
  const { hasDraft, loadedDraft, lastSaved, saveDraft, clearDraft } = useDraft({
    mode: projectId ? "edit" : "create",
    projectId,
    autoSave: true,
  });

  const form = useForm({ defaultValues: loadedDraft ?? undefined });

  useEffect(() => {
    const sub = form.watch((values) => saveDraft(values as never));
    return () => sub.unsubscribe();
  }, [form, saveDraft]);

  return (
    <>
      {hasDraft && lastSaved && <p>Draft saved {lastSaved}</p>}
      <button type="button" onClick={clearDraft}>
        Discard draft
      </button>
    </>
  );
}
```

`deleteDraft` and `clearDraft` are the same function.

---

## `useSavedProjects`

**File:** `hooks/useSavedProjects.ts`  
**Dependencies:** `useWallet`, `localStorage` key `dongle_saved_projects:{G…}`

Per-wallet bookmark list. Syncs across tabs via `storage` and a `dongle:saved-projects-changed` event.

```tsx
"use client";

import { useSavedProjects } from "@/hooks/useSavedProjects";
import { Button } from "@/components/ui/Button";

export function SaveProjectButton({ projectId }: { projectId: string }) {
  const { isProjectSaved, toggleSavedProject, canManageSavedProjects } =
    useSavedProjects();

  if (!canManageSavedProjects) {
    return <p>Connect a wallet to save projects.</p>;
  }

  const saved = isProjectSaved(projectId);
  return (
    <Button variant={saved ? "secondary" : "outline"} onClick={() => toggleSavedProject(projectId)}>
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
```

---

## `useRecentViews`

**File:** `hooks/useRecentViews.ts`  
**Dependencies:** `recentViewsService` (max 10 items)

```tsx
"use client";

import { useEffect } from "react";
import { useRecentViews } from "@/hooks/useRecentViews";
import { useWallet } from "@/context/wallet.context";

export function TrackProjectView({ projectId }: { projectId: string }) {
  const { publicKey } = useWallet();
  const { recentProjects, trackView, clearHistory, hasHistory } = useRecentViews(
    publicKey ?? undefined,
  );

  useEffect(() => {
    trackView(projectId);
  }, [projectId, trackView]);

  return (
    <aside>
      {hasHistory && (
        <button type="button" onClick={clearHistory}>
          Clear
        </button>
      )}
      <ul>
        {recentProjects.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </aside>
  );
}
```

Pass `walletAddress` to scope history per account; omit it for device-wide history.

---

## `useConfirm`

**File:** `hooks/useConfirm.tsx`  
**Provider:** `ConfirmDialogProvider` (root layout)

Returns `confirm(options) => Promise<boolean>`. Prefer this over `window.confirm`.

```tsx
"use client";

import { useConfirm } from "@/hooks/useConfirm";

export function DeleteReviewButton({ onDelete }: { onDelete: () => void }) {
  const confirm = useConfirm();

  async function handleClick() {
    const ok = await confirm({
      title: "Delete review?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep",
      variant: "danger",
    });
    if (ok) onDelete();
  }

  return (
    <button type="button" onClick={() => void handleClick()}>
      Delete
    </button>
  );
}
```

If the provider is missing, the hook falls back to `window.confirm` (tests / Storybook). Always mount the provider in the app.

---

## `useUnsavedChanges`

**File:** `hooks/useUnsavedChanges.ts`  
**Dependencies:** `useConfirm`, Next.js `useRouter`

Blocks tab close (`beforeunload`) and in-app `<a>` navigations while `isDirty && !isSubmitting`.

```tsx
"use client";

import { useForm } from "react-hook-form";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export function GuardedForm() {
  const form = useForm();
  useUnsavedChanges(form.formState.isDirty, form.formState.isSubmitting);
  return <form onSubmit={form.handleSubmit(() => undefined)}>{/* fields */}</form>;
}
```

Call with `isDirty` from react-hook-form (or any boolean). Set `isSubmitting` true during submit so the success redirect is not intercepted.

---

## `useOnChainTransaction`

**File:** `hooks/useOnChainTransaction.ts`  
**Dependencies:** `lib/transaction-progress`, `sonner`

Wraps a contract action with phases: `idle` → `signing` → `confirming` → `success` | `failure`. Pair with `TransactionProgressPanel`.

```tsx
"use client";

import { useOnChainTransaction } from "@/hooks/useOnChainTransaction";
import { sorobanService } from "@/services/stellar/soroban.service";
import TransactionProgressPanel from "@/components/transactions/TransactionProgressPanel";

export function RegisterProjectButton(props: { payload: never }) {
  const { run, progress, retry, isInProgress } = useOnChainTransaction();

  return (
    <>
      <button
        type="button"
        disabled={isInProgress}
        onClick={() =>
          void run((onPhaseChange) =>
            sorobanService.registerProject(props.payload, { onPhaseChange }),
          )
        }
      >
        Submit on-chain
      </button>
      <TransactionProgressPanel progress={progress} onRetry={() => void retry()} />
    </>
  );
}
```

`run` returns `null` on failure after setting `phase: "failure"`. Keep the last action so `retry()` can replay it.

---

## `useDiscoverParams`

**File:** `hooks/useDiscoverParams.ts`  
**Dependencies:** `useRouter`, `usePathname`, `useSearchParams`

Source of truth: **URL query** (`q`, `category`, `tags`, `sort`, `page`). Search input is debounced 300ms (`searchInput` vs `searchQuery`).

```tsx
"use client";

import { useDiscoverParams } from "@/hooks/useDiscoverParams";
import { Input } from "@/components/ui/Input";

export function DiscoverToolbar() {
  const { searchInput, setSearchInput, category, setCategory, clearFilters } =
    useDiscoverParams();

  return (
    <div>
      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search projects"
        aria-label="Search projects"
      />
      <button type="button" onClick={() => setCategory("DeFi")}>
        DeFi
      </button>
      <button type="button" onClick={clearFilters}>
        Reset
      </button>
    </div>
  );
}
```

Use this on `/discover` so filtered views are bookmarkable. Do not mix with `useProjectFilters` on the same page.

---

## `useProjectFilters`

**File:** `hooks/useProjectFilters.ts`  
**Dependencies:** mock `projects` data, `sessionStorage` key `dongle_project_filters`

In-memory filter/sort for landing and similar lists. **Not** written to the URL. `hydrated` is false during SSR so you can avoid a sessionStorage flash.

```tsx
"use client";

import { useProjectFilters } from "@/hooks/useProjectFilters";

export function FeaturedGrid() {
  const { filtered, filters, setCategory, setSort } = useProjectFilters(6);

  return (
    <section>
      <button type="button" onClick={() => setCategory("Tools")}>
        Tools ({filters.category})
      </button>
      <button type="button" onClick={() => setSort("recency")}>
        Newest
      </button>
      <ul>
        {filtered.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </section>
  );
}
```

---

## `useComparison`

**File:** `context/comparison.context.tsx`  
**Provider:** `ComparisonProvider`  
**Dependencies:** in-memory list only (max 4). Not persisted.

```tsx
"use client";

import { useComparison } from "@/context/comparison.context";
import type { Project } from "@/types/project";

export function CompareToggle({ project }: { project: Project }) {
  const { isSelected, addProject, removeProject, canAddMore } = useComparison();
  const selected = isSelected(project.id);

  return (
    <button
      type="button"
      disabled={!selected && !canAddMore}
      onClick={() => (selected ? removeProject(project.id) : addProject(project))}
    >
      {selected ? "Remove from compare" : "Compare"}
    </button>
  );
}
```

Throws if used outside `ComparisonProvider`.

---

## Troubleshooting

### `useWallet must be used within a WalletProvider`

The component is outside `app/layout.tsx` providers, or you are rendering it in a test/Storybook without wrapping.

**Fix:** wrap with `<WalletProvider>` (and Freighter mocks in tests).

### `useComparison must be used within ComparisonProvider`

Same as wallet: the compare tray hook is not global unless the provider is mounted.

### Wallet connects then immediately disconnects

Polling failed (`getPublicKey` / network). Check Freighter is unlocked. `disconnectWallet` runs on poll errors.

### “Wrong network” never clears

`isCorrectNetwork` compares Freighter’s passphrase to `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE`. Switch Freighter to Testnet (dev) or fix env.

### `useStellarAccount` error “Account not found”

Testnet account is unfunded. Use Friendbot. For pages that cannot proceed, `useWalletPageGate({ requireFundedAccount: true })`.

### Drafts do not save

`draftService.hasContent` returned false (empty name/description/etc.), or `autoSave` is false and you never called `saveDraft`. Confirm you are in the browser (not SSR).

### Draft loaded after first paint / form did not hydrate

`loadedDraft` is set in `useEffect`. Initialize the form when `loadedDraft` becomes non-null, or key the form on `hasDraft`.

### Saved projects empty after refresh

Key is `dongle_saved_projects:{publicKey}`. A different wallet or a cleared origin will look empty. `canManageSavedProjects` is false when disconnected.

### Discover search lags behind the input

Expected: `searchInput` is live; `searchQuery` / URL update after 300ms. Filter using `searchQuery`, bind the input to `searchInput`.

### Filters reset on `/discover` but not on the homepage

`/discover` uses the URL (`useDiscoverParams`). Homepage chips use `sessionStorage` (`useProjectFilters`). They are intentionally separate.

### Confirm dialog never appears; browser dialog does

`ConfirmDialogProvider` is not an ancestor. Tests that forget the provider hit `window.confirm`.

### Unsaved-changes dialog does not run on Next.js `router.push`

The hook intercepts **anchor clicks** and `beforeunload`, not imperative `router.push`. Call `confirm()` yourself before programmatic navigation.

### Transaction stuck on `signing`

User dismissed Freighter or the request never returned. Use `reset()` or `retry()` from `useOnChainTransaction`. Do not start a second `run` while `isInProgress`.

### Hook used in a Server Component

Add `"use client"` to the file that calls the hook, or extract a small client child. Root `page.tsx` files can stay server components and render that child.

### Stale localStorage JSON crashes the page

Services catch `JSON.parse` errors and return `[]` / ignore. If you see a crash, a component is reading `localStorage` directly — move that into a service.

### Two `useStellarAccount` instances double-fetch

Each call fetches independently (no React Query cache). Lift the hook to a parent or pass `balances` down.

### Tests: `localStorage is not defined` / navigation mocked

Vitest setup mocks `next/navigation`. For draft/review tests, stub `localStorage` on `window` (see `__tests__/hooks/useDraft.test.ts`).
