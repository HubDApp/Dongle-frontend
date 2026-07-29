# Draft Feature Implementation Summary

## Problem Solved
Project submission was all-or-nothing. If users left the form, they lost all progress.

## Solution Implemented
A comprehensive local draft system that auto-saves form progress and allows users to resume later.

## Files Created

### Core Services
1. **`dongle/services/draft/draft.service.ts`**
   - localStorage-based draft management
   - Auto-save with debouncing (1 second)
   - CRUD operations for drafts
   - Content detection to avoid saving empty forms

### Hooks
2. **`dongle/hooks/useDraft.ts`**
   - React hook wrapping the draft service
   - Manages draft state and lifecycle
   - Generates consistent draft IDs
   - Provides simple API for components

### UI Components
3. **`dongle/components/projects/DraftIndicator.tsx`**
   - Visual indicator showing draft status
   - Human-readable "last saved" timestamps
   - Discard draft button

### Tests
4. **`dongle/__tests__/services/draft.service.test.ts`**
   - Comprehensive test coverage for draft service
   - Tests save, load, delete, and content detection

### Documentation
5. **`dongle/DRAFT_FEATURE.md`**
   - Complete feature documentation
   - Usage examples
   - Storage schema

## Files Modified

### `dongle/components/projects/ProjectForm.tsx`
**Changes:**
- Added draft hook integration
- Auto-saves form data on changes using `watch()`
- Loads existing drafts on mount
- Shows "draft restored" notification
- Added DraftIndicator component
- Clears draft after successful submission
- Added discard draft confirmation dialog

**New imports:**
```typescript
import { useDraft } from "@/hooks/useDraft";
import { DraftIndicator } from "@/components/projects/DraftIndicator";
```

**New state:**
```typescript
const draft = useDraft({ mode, projectId, autoSave: true });
const [draftRestored, setDraftRestored] = React.useState(false);
const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
```

**Auto-save effect:**
```typescript
useEffect(() => {
  const subscription = watch((formData) => {
    draft.saveDraft(formData as ProjectFormValues);
  });
  return () => subscription.unsubscribe();
}, [watch, draft]);
```

## Key Features

### ✅ Auto-Save
- Debounced by 1 second to avoid excessive writes
- Only saves when form has meaningful content
- Works for both create and edit modes

### ✅ Draft Persistence
- Stored in localStorage
- Survives browser refreshes and session restarts
- Separate drafts for create vs edit mode
- Edit mode drafts are per-project

### ✅ Visual Feedback
- "Draft saved" indicator with timestamp
- "Your previous draft has been restored" notification
- Human-readable time format (e.g., "2m ago", "1h ago")

### ✅ Draft Management
- "Discard Draft" button in indicator
- Confirmation dialog prevents accidental deletion
- Draft cleared after successful on-chain submission

### ✅ Safety
- Drafts never trigger on-chain transactions
- Only stored locally in browser
- No server-side storage or transmission
- Draft cleared only on explicit submit or discard

## Acceptance Criteria Status

✅ **In-progress submission data is preserved**
- Auto-saves every 1 second when form changes
- Data persists across browser sessions
- Works for both new projects and edits

✅ **Users can discard drafts**
- Clear "Discard Draft" button
- Confirmation dialog for safety
- Resets form to clean state

✅ **Drafts are not published or submitted on-chain until explicitly submitted**
- Drafts only exist in localStorage
- No blockchain interaction during save
- Draft cleared after successful on-chain submit
- Separate "Submit Registration" action required

## User Experience Flow

### New Project Submission
1. User navigates to `/projects/new`
2. User starts filling form → auto-save begins
3. User navigates away (draft preserved)
4. User returns → sees "draft restored" message
5. User sees "Draft saved X ago" indicator
6. User either:
   - Completes and submits → draft cleared
   - Clicks "Discard Draft" → form reset

### Edit Project
1. User navigates to `/projects/[id]/edit`
2. Form loads with current project data
3. User makes changes → auto-save begins
4. Separate draft maintained for this specific project
5. Same flow as above

## Technical Implementation

### Storage Schema
```typescript
localStorage["dongle_project_drafts"] = [
  {
    id: "new-project-draft" | "edit-project-{id}",
    mode: "create" | "edit",
    projectId?: "123",
    data: {
      name: string,
      primaryCategory: string,
      tags: string[],
      description: string,
      websiteUrl: string,
      githubUrl: string,
      logoUrl: string,
      docsUrl: string
    },
    lastSaved: "2024-01-01T12:00:00.000Z"
  }
]
```

### Draft ID Strategy
- Create mode: `"new-project-draft"`
- Edit mode: `"edit-project-{projectId}"`
- Ensures one draft per context
- Prevents conflicts between create/edit

### Debouncing Strategy
- 1 second debounce on auto-save
- Prevents excessive localStorage writes
- Balances responsiveness with performance
- Timers cleared on unmount

## Browser Compatibility
- Requires localStorage support (all modern browsers)
- Gracefully handles localStorage errors
- SSR-safe (checks for `window` object)

## Testing
Run tests with:
```bash
npm test dongle/__tests__/services/draft.service.test.ts
```

Tests verify:
- Save/load/delete operations
- Draft retrieval by mode
- Content detection
- Multiple draft handling
- Clear all functionality

## Future Enhancements
Potential improvements for future iterations:
1. Server-side draft storage for cross-device sync
2. Draft versioning/history
3. Auto-delete drafts after 30 days
4. Draft list/preview page
5. Export/import drafts
6. Conflict resolution for concurrent edits
7. Draft encryption for sensitive data
