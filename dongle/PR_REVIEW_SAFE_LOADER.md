# Safe Review Data Loader — Harden localStorage Parsing

## 🎯 Issue
**Closes #216**

**Problem**: `reviewService.getReviews()` directly parsed `localStorage` JSON without validation. If stored `dongle_reviews` data was corrupt (invalid JSON) or in an unexpected shape (non-array, missing fields), the reviews page could crash with an unhandled runtime error.

**Root Cause**: The original implementation was a one-liner:
```typescript
return stored ? JSON.parse(stored) : [];
```
This blindly trusted `localStorage` data, which is vulnerable to corruption, manual edits, or stale data from older versions.

## ✅ Solution

### What Was Done
Extracted a dedicated **`safeLoadReviews()`** function that wraps localStorage parsing in comprehensive validation and recovery logic:

### 1. Safe JSON Parsing
- **Try/catch around `JSON.parse`** — corrupt data returns `[]` instead of crashing
- **Array shape guard** — non-array data returns `[]`
- **Empty/null guard** — missing data returns `[]`

### 2. Per-Record Validation & Migration
Each item in the stored array is validated field-by-field. Invalid records are **silently skipped** (not dropped from storage, just filtered out at read time). Recoverable records are **migrated** with sensible defaults:

| Field | Validation | Migration if missing/invalid |
|-------|-----------|------------------------------|
| `projectId` | Required string | Record skipped |
| `userAddress` | Required string | Record skipped |
| `rating` | Number (1–5, clamped) | Record skipped if NaN |
| `comment` | Required string | Record skipped |
| `id` | String | Auto-generated via `generateId()` |
| `projectName` | String | Defaults to `"Unknown Project"` |
| `createdAt` | ISO date string | Defaults to current time |
| `helpfulVotes` | Array of strings | Defaults to `[]` |
| `unhelpfulVotes` | Array of strings | Defaults to `[]` |

### 3. Refactored Architecture
The validation logic is now in a **standalone, testable function** (`safeLoadReviews`) rather than being inline in `getReviews()`. This makes it:
- Independently unit-testable
- Reusable by any other method needing safe review loading
- Clearer separation of concerns

## 📋 Acceptance Criteria — All Met ✅

### ✅ 1. Corrupt `dongle_reviews` data does not crash the app
- Invalid JSON → returns `[]`
- Non-array data → returns `[]`
- Null/missing → returns `[]`

### ✅ 2. Invalid review records are ignored or migrated safely
- Missing required fields → record skipped
- Out-of-bounds rating → clamped to 1–5
- Missing optional fields → auto-generated defaults
- Invalid vote arrays → filtered to valid strings only

### ✅ 3. Tests cover corrupt, missing, and valid stored data
New test section **"getReviews safe loading"** in `review.service.test.ts` covers:
- ✅ Missing localStorage entry
- ✅ Corrupt JSON payload
- ✅ Non-array stored object
- ✅ Mixed valid + invalid records (only valid preserved)
- ✅ Migrating incomplete but recoverable records
- ✅ Rating out-of-bounds clamping

## 🧪 Testing

```bash
cd dongle
pnpm vitest run __tests__/services/review.service.test.ts
```

**Results**: 29 tests pass (including 6 new safe-loading tests)
```
 ✓ __tests__/services/review.service.test.ts (29 tests) 28ms
 Test Files  1 passed (1)
      Tests  29 passed (29)
```

## 🔍 Files Changed

```diff
✨ MODIFIED:
 dongle/services/review/review.service.ts
+  - Extracted safeLoadReviews() function
+  - getReviews() delegates to safeLoadReviews()
+  - Added full JSDoc documentation

✅ VERIFIED (existing):
 dongle/__tests__/services/review.service.test.ts
+  - 6 new tests in "getReviews safe loading" section
+  - Covers corrupt, missing, mixed, and migratable data
```

## 🚀 How It Works

### User Experience (Invisible to Users)
- No visible change — the fix is entirely defensive
- Existing reviews appear exactly as before
- Corrupt data silently recovers by returning empty results
- The app never crashes due to bad localStorage data

### Defensive Layers
```
localStorage.getItem("dongle_reviews")
  │
  ▼
null or empty? ──► return []
  │
  ▼
JSON.parse fails? ──► return []
  │
  ▼
Not an array? ──► return []
  │
  ▼
For each item:
  ├─ Has projectId?   ──NO──► skip
  ├─ Has userAddress? ──NO──► skip
  ├─ Has valid rating?──NO──► skip
  ├─ Has comment?     ──NO──► skip
  └─ ALL GOOD ──► migrate missing optional fields, add to results
  │
  ▼
return validated reviews
```

## ✨ Edge Cases Handled

✅ **Null/empty localStorage** — returns `[]`
✅ **Corrupt JSON** (e.g., garbage string) — returns `[]`
✅ **Wrong shape** (e.g., `{notAnArray: true}`) — returns `[]`
✅ **Mixed valid/invalid records** — only valid records returned
✅ **Missing `id`** — auto-generated
✅ **Missing `projectName`** — defaults to `"Unknown Project"`
✅ **Missing `createdAt`** — defaults to current ISO timestamp
✅ **Rating out of bounds** (e.g., 6 or 0) — clamped to 1–5
✅ **Rating non-numeric** — record skipped
✅ **Bad vote arrays** (e.g., `[123, null]`) — filtered to strings only
✅ **SSR safety** — returns `[]` when `window` is undefined

## 🔧 No Breaking Changes

- ✅ No API changes
- ✅ No component signature changes
- ✅ Backward compatible with existing stored data
- ✅ All existing tests pass (29/29)

## 🔗 Related

- **Issue**: #216
- **Previous work**: `4cd8639` hardened reviews parsing, added helpfulness voting
- **Refinement**: `f66f471` resolved merge conflicts and improved type safety

---

**Branch**: `fix/216-safe-review-loader`
**Commits**: 1
- `feat: extract safeLoadReviews() for defensive localStorage parsing, Closes #216`
