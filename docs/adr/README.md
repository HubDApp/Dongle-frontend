# Architecture Decision Records

This folder captures the *why* behind Dongle frontend architecture.

Each ADR uses the same template: **Title**, **Status**, **Context**, **Decision**, **Consequences**, **Alternatives**.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-context-hooks-pattern.md) | Context + Hooks instead of Redux | Accepted |
| [0002](./0002-ipfs-integration.md) | IPFS for off-chain media and evidence | Accepted |
| [0003](./0003-contract-design.md) | Split Soroban registries + env-configured IDs | Accepted |
| [0004](./0004-localstorage-persistence.md) | localStorage for client-owned MVP state | Accepted |

## How to update ADRs

Decisions evolve. Do not silently rewrite history:

1. Copy [0000-template.md](./0000-template.md) for a **new** decision.
2. For a change to an existing decision, set the old ADR `Status` to **Superseded** and add a link to the new ADR. Keep the original Context/Decision text.
3. For a small amendment (new consequence, extra alternative), add a dated **Amendment** section at the bottom of the existing file.
4. Update this index and the README links in the same PR.

Template lives at [0000-template.md](./0000-template.md).
