# Draft Project Submission Feature

## Overview

The draft feature allows users to save their project submission progress locally and resume later. This prevents data loss when users navigate away from the form or close their browser.

## Features

- **Auto-save**: Form data is automatically saved to browser localStorage as users type (debounced by 1 second)
- **Draft persistence**: Drafts are stored in the browser and persist across sessions
- **Draft indicator**: Visual feedback shows when a draft was last saved
- **Draft management**: Users can explicitly discard drafts when they no longer need them
- **Separate drafts**: Create mode and edit mode maintain separate drafts
- **No accidental publishing**: Drafts are only local and never submitted on-chain until the user explicitly clicks submit

## Implementation

### Services

**`dongle/services/draft/draft.service.ts`**
- Core draft management logic
- Handles localStorage operations
- Provides methods for saving, loading, and deleting drafts
- Implements auto-save with debouncing

### Hooks

**`dongle/hooks/useDraft.ts`**
- React hook that wraps the draft service
- Manages draft state for components
- Provides convenient interface for draft operations
- Handles draft ID generation based on mode and projectId

### Components

**`dongle/components/projects/DraftIndicator.tsx`**
- Visual indicator showing draft status
- Displays "last saved" timestamp in human-readable format
- Provides "Discard Draft" button

**`dongle/components/projects/ProjectForm.tsx`**
- Updated to integrate draft functionality
- Auto-saves form data on changes
- Loads existing drafts on mount
- Clears drafts after successful submission
- Shows confirmation dialog before discarding

## Usage

### For Users

1. **Start a submission**: Navigate to `/projects/new` and start filling out the form
2. **Auto-save**: Your progress is automatically saved as you type
3. **Leave and return**: Navigate away or close the browser - your draft is preserved
4. **Resume**: Return to the form and your draft will be automatically loaded
5. **Discard**: Click "Discard Draft" if you want to start over
6. **Submit**: Submit the form to register on-chain and clear the draft

### For Developers

```typescript
import { useDraft } from "@/hooks/useDraft";

function MyComponent() {
  const draft = useDraft({ 
    mode: "create", // or "edit"
    projectId: "123", // only for edit mode
    autoSave: true 
  });

  // Load draft data into form
  const defaultValues = draft.loadedDraft || initialValues;

  // Save draft
  draft.saveDraft(formData);

  // Delete draft
  draft.deleteDraft();

  return (
    <div>
      {draft.hasDraft && <span>Draft saved {draft.lastSaved}</span>}
    </div>
  );
}
```

## Storage

Drafts are stored in browser localStorage under the key `dongle_project_drafts`. The data structure is:

```typescript
interface ProjectDraft {
  id: string;
  data: {
    name: string;
    primaryCategory: string;
    tags: string[];
    description: string;
    websiteUrl: string;
    githubUrl: string;
    logoUrl: string;
    docsUrl: string;
  };
  lastSaved: string; // ISO timestamp
  mode: "create" | "edit";
  projectId?: string; // Only for edit mode
}
```

## Acceptance Criteria

✅ **In-progress submission data is preserved**
- Form data is auto-saved to localStorage with 1-second debouncing
- Drafts persist across browser sessions
- Users can navigate away and return without losing data

✅ **Users can discard drafts**
- "Discard Draft" button in the DraftIndicator component
- Confirmation dialog prevents accidental deletion
- Discarding resets the form to initial/empty state

✅ **Drafts are not published or submitted on-chain until explicitly submitted**
- Drafts are only stored in localStorage (client-side)
- No on-chain transactions occur during auto-save
- Drafts are cleared only after successful on-chain submission
- Draft service has no access to blockchain functionality

## Testing

Run the draft service tests:

```bash
npm test dongle/__tests__/services/draft.service.test.ts
```

Tests cover:
- Saving and retrieving drafts
- Getting drafts by mode (create/edit)
- Deleting individual drafts
- Clearing all drafts
- Content detection
- Multiple draft management

## Future Enhancements

Potential improvements:
- Server-side draft storage for cross-device access
- Draft versioning/history
- Draft expiration after X days
- Draft preview/list view
- Export/import draft functionality
