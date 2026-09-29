# Date Formatting Utility - Implementation Plan

## Steps
- [x] Analyze codebase
- [x] Get plan approval
- [x] Step 1: Update `DraftIndicator.tsx` to use `formatDate` from `@/lib/date`
- [x] Step 2: Run tests to verify nothing is broken
  - No new failures: 31 pre-existing failures on branch, identical with/without the change
  - `pnpm typecheck` passes

