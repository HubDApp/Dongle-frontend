# Testing Guide

This guide defines how we write tests in the Dongle frontend. All application code lives under `dongle/`; tests live in `dongle/__tests__/`.

## Quick Reference

| Layer | Runner | Location | Command |
|-------|--------|----------|---------|
| Unit / integration | Vitest | `dongle/__tests__/` | `npm test` (from `dongle/`) |
| E2E | Playwright (planned) | `dongle/e2e/` | Not yet configured |

```bash
cd dongle
npm test              # run once (CI mode)
npm run test:watch    # watch mode during development
```

---

## Unit Test Structure

### File layout

Mirror the source tree under `__tests__/`:

```
dongle/
├── services/review/review.service.ts
├── __tests__/services/review.service.test.ts
├── components/layout/Navbar.tsx
├── __tests__/components/Navbar.test.tsx
├── hooks/useProjectFilters.ts
├── __tests__/hooks/useProjectFilters.test.ts
```

**Naming:** `{module}.test.ts` or `{module}.test.tsx` for components/pages.

### Standard test file skeleton

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("ModuleName", () => {
  beforeEach(() => {
    // reset mocks and storage
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("methodOrBehavior", () => {
    it("does the expected thing", () => {
      // arrange → act → assert
    });
  });
});
```

### Conventions

1. **One `describe` block per module** — nest `describe` blocks for methods or feature areas.
2. **Arrange → Act → Assert** — keep each `it` focused on a single behavior.
3. **Descriptive test names** — use plain language: `"rejects review with comment too short"` not `"test comment validation"`.
4. **No shared mutable state** — reset mocks and storage in `beforeEach`.
5. **Import from `@/`** — use the same path alias as production code (`@/services/...`, `@/components/...`).

---

## Vitest Configuration

Vitest is configured in `dongle/vitest.config.ts`:

- **Environment:** `jsdom` (for React components and browser APIs)
- **Globals:** enabled (`describe`, `it`, `expect`, `vi` available without imports, though explicit imports are preferred)
- **Setup file:** `dongle/vitest.setup.ts`
- **Path alias:** `@` → `dongle/`

### Global setup (`vitest.setup.ts`)

The setup file provides shared mocks used across tests:

- `@testing-library/jest-dom` matchers (`toBeInTheDocument`, etc.)
- `next/navigation` stubs (`useRouter`, `usePathname`, `useSearchParams`)
- `navigator.clipboard.writeText` mock

Do **not** add test-specific mocks here. Keep global setup limited to framework-level stubs.

---

## Vitest Patterns

### Testing pure services

Services with no side effects need only imports and assertions:

```typescript
import { describe, it, expect } from "vitest";
import { projectService } from "@/services/project/project.service";
import { mockProjects } from "@/data/mockProjects";

describe("projectService", () => {
  it("finds a project by id", () => {
    const project = projectService.getProjectById(mockProjects[0].id);
    expect(project).toEqual(mockProjects[0]);
  });
});
```

### Mocking modules with `vi.mock`

Place `vi.mock()` calls **before** the import of the module under test (or use dynamic import after mocks):

```typescript
const mockWallet = {
  getPublicKey: vi.fn(),
  signTransaction: vi.fn(),
};

vi.mock("@/services/wallet/wallet.service", () => ({
  walletService: mockWallet,
}));

// Dynamic import ensures mocks are applied
const { sorobanService } = await import("@/services/stellar/soroban.service");
```

For heavy SDK mocks (e.g. `stellar-sdk`), define mock classes inline inside the factory — see `__tests__/services/soroban.service.test.ts`.

### Mocking React context

Spy on the context hook rather than wrapping every test in a provider:

```typescript
import * as walletContext from "@/context/wallet.context";

beforeEach(() => {
  vi.spyOn(walletContext, "useWallet").mockReturnValue({
    isConnected: false,
    isConnecting: false,
    publicKey: null,
    walletNetwork: null,
    isCorrectNetwork: false,
    walletNetworkLabel: "Unknown",
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
  });
});
```

Extract a helper when multiple tests need the same override pattern:

```typescript
function mockWallet(overrides: Partial<ReturnType<typeof walletContext.useWallet>> = {}) {
  vi.spyOn(walletContext, "useWallet").mockReturnValue({
    isConnected: false,
    /* defaults... */
    ...overrides,
  });
}
```

### Mocking Next.js components

Stub `next/link` and `next/navigation` locally in component tests:

```typescript
vi.mock("next/link", () => ({
  default: ({ href, children, className }: LinkProps) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
```

### Testing React components

Use React Testing Library — query by role, label, or accessible name:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("shows validation error for empty project name", async () => {
  render(<NewProjectPage />);
  fireEvent.click(screen.getByRole("button", { name: /Submit Registration/i }));
  expect(await screen.findByText(/project name must be at least/i)).toBeInTheDocument();
});
```

Prefer `userEvent` over `fireEvent` for realistic user interactions (typing, clicking).

### Testing hooks

Use `renderHook` and `act` from `@testing-library/react`:

```typescript
import { renderHook, act } from "@testing-library/react";

it("filters by category correctly", () => {
  const { result } = renderHook(() => useProjectFilters());
  act(() => {
    result.current.setCategory("DeFi / DEX");
  });
  expect(result.current.filtered.every((p) => p.category === "DeFi / DEX")).toBe(true);
});
```

### Parameterized tests

Use `it.each` for table-driven cases:

```typescript
it.each([
  ["/discover", "Discover"],
  ["/reviews", "Reviews"],
  ["/verify", "Verify"],
])("marks %s as active on desktop", (path, label) => {
  mockPathname.mockReturnValue(path);
  render(<Navbar />);
  expect(screen.getByRole("link", { name: label }).className).toMatch(/border-black/);
});
```

### Fake timers

Use Vitest fake timers for polling and timeout logic:

```typescript
const clock = vi.useFakeTimers();
const promise = sorobanService.registerProject(params).catch((e) => e);
await clock.advanceTimersByTimeAsync(65_000);
const err = await promise;
clock.useRealTimers();
expect((err as Error).message).toContain("Timeout waiting for transaction");
```

---

## Mock Data Factories

Centralize reusable test data instead of inline objects. The codebase already provides factories and fixtures:

### Existing fixtures

| File | Purpose |
|------|---------|
| `data/mockProjects.ts` | 60 deterministic `Project` records for discovery/filter tests |
| `types/review.ts` | `REVIEW_CONSTRAINTS` for boundary-value review tests |

### Factory pattern

Create small builder functions in test files or a shared `__tests__/fixtures/` directory:

```typescript
// __tests__/fixtures/review.factory.ts
import { Review } from "@/types/review";
import { REVIEW_CONSTRAINTS } from "@/types/review";

let reviewCounter = 0;

export function buildReview(overrides: Partial<Review> = {}): Omit<Review, "id" | "createdAt"> {
  reviewCounter += 1;
  return {
    projectId: `proj-${reviewCounter}`,
    projectName: `Test Project ${reviewCounter}`,
    userAddress: "GTEST1234567890",
    rating: 5,
    comment: "A".repeat(REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH),
    ...overrides,
  };
}

export function resetReviewCounter() {
  reviewCounter = 0;
}
```

Usage in tests:

```typescript
beforeEach(() => {
  resetReviewCounter();
  localStorage.clear();
});

it("adds a valid review", () => {
  const review = buildReview({ projectId: "proj-1" });
  const result = reviewService.addReview(review, review.userAddress);
  expect(result.success).toBe(true);
});
```

### Project factory example

```typescript
// __tests__/fixtures/project.factory.ts
import { Project, PROJECT_CATEGORIES } from "@/types/project";

export function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "test-proj-1",
    name: "Test Project",
    category: PROJECT_CATEGORIES.DEFI,
    description: "A test project description.",
    rating: 4.5,
    reviews: 10,
    createdAt: new Date().toISOString(),
    websiteUrl: "https://example.com",
    ...overrides,
  };
}
```

### localStorage mock factory

Two patterns exist in the codebase — pick one per test file and stay consistent:

**Pattern A — inline mock object** (`review.service.test.ts`):

```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });
```

**Pattern B — `vi.stubGlobal`** (`verification.service.test.ts`):

```typescript
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  });
});
```

---

## Assertions

### Preferred matchers

| Scenario | Matcher |
|----------|---------|
| Equality | `toEqual`, `toStrictEqual` |
| Presence | `toBeDefined`, `toBeNull`, `toBeTruthy` |
| DOM visibility | `toBeInTheDocument()` (jest-dom) |
| DOM absence | `not.toBeInTheDocument()` |
| Errors | `toThrow`, `rejects.toThrow`, `toBeInstanceOf(Error)` |
| Mock calls | `toHaveBeenCalledWith`, `toHaveBeenCalledTimes` |
| Collections | `toHaveLength`, `toContain`, `array.every(...)` |
| Partial objects | `expect.objectContaining({ ... })` |
| Regex / strings | `toMatch`, `toContain` |

### Assertion examples from the codebase

```typescript
// Service result shape
expect(result.success).toBe(true);
expect(result.errors?.[0].field).toBe("rating");
expect(result.errors?.[0].message).toContain("between");

// Sort order verification
const ratings = result.current.filtered.map((p) => p.rating);
for (let i = 0; i < ratings.length - 1; i++) {
  expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i + 1]);
}

// Mock interaction
expect(mockServer.prepareTransaction).toHaveBeenCalledTimes(1);
expect(mockWallet.signTransaction).toHaveBeenCalledWith("PREPARED_XDR", expect.any(String));
```

### What to avoid

- Do not assert implementation details (internal state, private methods) unless testing a specific contract.
- Do not use snapshot tests for dynamic UI — prefer semantic queries (`getByRole`, `getByLabelText`).
- Do not leave `console.log` debugging in committed tests.

---

## Common Testing Utilities

| Utility | Package | Use for |
|---------|---------|---------|
| `render`, `screen`, `fireEvent` | `@testing-library/react` | Component rendering and queries |
| `userEvent` | `@testing-library/user-event` | Realistic user input |
| `renderHook`, `act` | `@testing-library/react` | Custom hook testing |
| `vi.fn`, `vi.mock`, `vi.spyOn` | `vitest` | Mocking and spying |
| `vi.useFakeTimers` | `vitest` | Time-dependent logic |
| `@testing-library/jest-dom` | dev dependency | DOM matchers (`toBeInTheDocument`) |

### Path alias

All tests use the `@/` alias (configured in `vitest.config.ts` and `tsconfig.json`):

```typescript
import { reviewService } from "@/services/review/review.service";
```

---

## E2E Test Patterns (Playwright)

> **Status:** Playwright is not yet installed in this repository. The patterns below define the standard to follow when E2E tests are added.

### Recommended setup

```bash
cd dongle
npm init playwright@latest
# Choose: TypeScript, tests in e2e/, base URL http://localhost:3000
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Directory layout

```
dongle/
├── e2e/
│   ├── fixtures/
│   │   └── wallet.fixture.ts    # shared wallet mock helpers
│   ├── discover.spec.ts
│   ├── submit-project.spec.ts
│   └── verify.spec.ts
└── playwright.config.ts
```

### E2E test structure

```typescript
// e2e/discover.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Discover page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/discover");
  });

  test("lists projects and filters by category", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /discover/i })).toBeVisible();
    await page.getByRole("button", { name: /DeFi/i }).click();
    await expect(page.locator("[data-testid=project-card]")).not.toHaveCount(0);
  });
});
```

### E2E conventions

1. **Test user journeys, not units** — cover flows like "connect wallet → submit project → see success".
2. **Use role-based selectors** — `getByRole`, `getByLabelText` over CSS classes.
3. **Add `data-testid` sparingly** — only when semantic selectors are insufficient.
4. **Isolate wallet state** — mock Freighter or use a test wallet; do not depend on a developer's local wallet.
5. **Run against `next dev` or a preview build** — configure `webServer` in `playwright.config.ts`:

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Critical flows to cover first

| Flow | Priority |
|------|----------|
| Browse and filter projects on `/discover` | High |
| Wallet gating on `/projects/new` | High |
| Submit verification request on `/verify` | High |
| Admin verification approval on `/admin` | Medium |
| Review submission on `/reviews` | Medium |

---

## CI Integration

The GitHub Actions workflow (`.github/workflows/frontend_ci.yml`) runs lint, typecheck, and build. Add `npm test` to CI when the test suite is stable:

```yaml
- name: Run Tests
  run: npm test
```

Tests must pass locally before opening a PR:

```bash
cd dongle && npm test && npm run lint && npm run typecheck
```

---

## Checklist for New Tests

- [ ] Test file mirrors source location under `__tests__/`
- [ ] Mocks reset in `beforeEach`
- [ ] Uses `@/` imports
- [ ] Queries by accessible roles/labels (components)
- [ ] Covers happy path and at least one error/edge case
- [ ] No hard-coded timing (`setTimeout`) without fake timers
- [ ] Reuses mock data factories where data is repeated
