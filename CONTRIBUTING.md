# Contributing to Dongle

Thank you for contributing to the Dongle frontend. This guide covers commit conventions, pull request expectations, code style, and review criteria.

## Getting Started

1. Fork and clone the repository.
2. Install dependencies:

   ```bash
   cd dongle
   npm install   # or pnpm install
   ```

3. Create a branch from `main`:

   ```bash
   git checkout -b feat/your-feature
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

See [dongle/SETUP.md](./dongle/SETUP.md) for environment setup and troubleshooting.

---

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/). This enables readable history and automated changelog generation.

### Structure

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | Use when |
|------|----------|
| `feat` | New feature or user-facing capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Tooling, dependencies, CI |
| `perf` | Performance improvement |

### Scope (optional)

Use the area of the codebase: `wallet`, `soroban`, `reviews`, `verify`, `discover`, `admin`, `ci`.

### Examples

```
feat(soroban): add update_project contract call
fix(wallet): handle Freighter disconnect during signing
docs: add testing guide with Vitest patterns
test(reviews): add duplicate review rejection cases
chore(deps): bump stellar-sdk to 13.3.0
```

### Rules

- Use imperative mood: **"add feature"** not "added feature"
- Keep the subject line ≤ 72 characters
- Do not end the subject with a period
- Reference issues in the footer: `Closes #389`

---

## Pull Request Description Template

Copy this template into your PR description:

```markdown
## Summary
<!-- 1–3 bullet points describing what changed and why -->

-

## Related Issues
<!-- Link issues: Closes #123, Relates to #456 -->

Closes #

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor
- [ ] Test update
- [ ] Chore / CI

## Test Plan
<!-- Checklist of manual and automated verification -->

- [ ] `npm test` passes
- [ ] `npm run lint` passes (zero warnings)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Manual testing steps:
  1.

## Screenshots / Recordings
<!-- If UI changes, attach before/after screenshots -->

## Notes for Reviewers
<!-- Call out tricky areas, trade-offs, or follow-up work -->
```

---

## Code Style Requirements

### TypeScript

- Strict typing — avoid `any`; use `unknown` and narrow with type guards when needed.
- Use the `@/` path alias for imports within `dongle/`.
- Import public components, services, hooks, types, and library utilities from their root barrel (`@/components`, `@/services`, `@/hooks`, `@/types`, or `@/lib`). Avoid deep relative imports from those directories. Subdirectory barrels may be used when a root barrel would create an unnecessary public surface.
- Prefer interfaces for object shapes; use `const` assertions for constant maps.
- Colocate types in `dongle/types/` when shared across modules.

### React / Next.js

- Use functional components and hooks.
- Client components must include `"use client"` at the top of the file.
- Forms use `react-hook-form` with Zod schemas via `@hookform/resolvers`.
- Toast notifications via `sonner` for user feedback.

### ESLint

ESLint is the enforced linter. Configuration lives in `dongle/eslint.config.mjs` (Next.js core-web-vitals + TypeScript rules).

Run locally:

```bash
cd dongle
npm run lint
```

**Requirements:**

- Zero warnings (`--max-warnings 0`)
- Unused variables prefixed with `_` are allowed (e.g. `_unusedParam`)
- Fix all lint errors before requesting review

### Prettier / Formatting

The project does not currently ship a Prettier config. Follow these conventions to match existing code:

- **Indentation:** 2 spaces
- **Quotes:** double quotes for strings
- **Semicolons:** yes
- **Trailing commas:** yes in multi-line objects/arrays
- **Line length:** ~100 characters (break long lines logically)
- **Imports:** group external packages first, then `@/` internal imports

If Prettier is added later, run it before committing. Until then, match the style of the file you are editing.

### File and naming conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProjectForm.tsx` |
| Services | camelCase file, named export | `review.service.ts` → `reviewService` |
| Hooks | camelCase with `use` prefix | `useProjectFilters.ts` |
| Tests | `{module}.test.ts(x)` | `review.service.test.ts` |
| Constants | SCREAMING_SNAKE_CASE | `DONGLE_CONTRACTS` |

---

## Review Checklist

Reviewers and contributors should verify the following before merge.

### Tests

- [ ] New logic has unit tests in `dongle/__tests__/`
- [ ] Tests follow patterns in [docs/testing-guide.md](./docs/testing-guide.md)
- [ ] Edge cases covered (validation failures, empty states, auth checks)
- [ ] `npm test` passes locally

### Types

- [ ] No new `any` types without justification
- [ ] Public interfaces exported from `types/` when reused
- [ ] `npm run typecheck` passes

### Linting

- [ ] `npm run lint` passes with zero warnings
- [ ] No commented-out code or debug `console.log` left in production paths

### Functionality

- [ ] Works without wallet (read-only flows) where applicable
- [ ] Wallet-gated actions show clear prompts when disconnected
- [ ] Network mismatch handled (`NetworkMismatchError` / toast)
- [ ] Form validation matches Zod schemas

### Security

- [ ] No secrets committed (`.env`, private keys, API tokens)
- [ ] Admin routes respect `NEXT_PUBLIC_ADMIN_ALLOWLIST`
- [ ] User input validated before contract calls

### Documentation

- [ ] Public APIs and contract changes documented
- [ ] README or docs updated if setup steps change
- [ ] Complex logic has inline comments only where non-obvious

---

## Performance Review Guidelines

Reviewers should evaluate performance impact for changes that touch data fetching, rendering, or blockchain calls.

### React rendering

- Avoid unnecessary re-renders — memoize expensive computations with `useMemo` / `useCallback` when profiling shows benefit.
- Do not fetch data in every child component; lift fetching to page level or use context sparingly.
- Prefer pagination or limits for large lists (see `useProjectFilters` limit parameter).

### Data and network

- Batch RPC reads where possible; avoid N+1 contract simulations.
- Cache stable reads; re-fetch after successful writes only.
- Soroban transaction polling defaults to 2s interval / 60s timeout — do not reduce timeout without justification.

### Bundle size

- Prefer dynamic imports for heavy modules not needed on initial load:

  ```typescript
  const { verificationService } = await import("./verification.service");
  ```

- Avoid importing entire icon libraries; import individual icons from `lucide-react`.

### Images and assets

- Use Next.js `Image` component for optimized loading where applicable.
- Store large media on IPFS/CDN, not in the repo.

### Performance red flags in review

| Flag | Action |
|------|--------|
| Unbounded list render (100+ items) | Add pagination or virtual scrolling |
| Synchronous localStorage in render | Move to `useEffect` or service layer |
| Multiple contract calls in a loop | Batch or parallelize with limits |
| Missing loading/error states | Add skeleton or error boundary |
| Large dependency added | Justify in PR; check bundle impact |

---

## Development Workflow

```bash
cd dongle

# Before committing
npm test
npm run lint
npm run typecheck
npm run build   # recommended for non-trivial changes
```

CI (`.github/workflows/frontend_ci.yml`) runs lint, typecheck, and build on PRs touching `dongle/**`.

---

## Project Structure Reference

```
dongle/
├── app/              # Next.js pages (App Router)
├── components/       # React components
├── services/         # Business logic (wallet, stellar, review)
├── hooks/            # Custom React hooks
├── context/          # React context providers
├── types/            # Shared TypeScript types
├── constants/        # Config and contract constants
├── data/             # Mock data for development
├── lib/              # Utilities
└── __tests__/        # Vitest test suite
```

---

## Additional Resources

- [Testing Guide](./docs/testing-guide.md) — Vitest patterns, mock factories, E2E standards
- [Soroban Contract Integration](./docs/soroban-contracts.md) — Contract ABIs, call patterns, error handling
- [Setup Guide](./dongle/SETUP.md) — Installation and troubleshooting
- [Dependency Policy](./dongle/DEPENDENCY_POLICY.md) — Package update procedures

---

## Questions?

Open a GitHub issue or ask in your PR. Tag `@HubDApp/Dongle-frontend` maintainers for review.
