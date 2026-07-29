# Recently Viewed Projects Feature

## Overview
This feature tracks recently viewed projects and displays them in the Profile and Discover pages, allowing users to quickly return to projects they've browsed.

## Problem Solved
Users who browse multiple projects have no quick way to return to recently viewed listings. This feature provides a browsing history that helps users navigate back to projects they found interesting.

## Implementation

### Components

#### 1. Service Layer (`services/recent-views/recent-views.service.ts`)
- **Purpose**: Manages storage and retrieval of recently viewed projects
- **Storage**: Uses localStorage for persistence
- **Key Features**:
  - Tracks up to 10 recent views
  - Supports wallet-scoped tracking (optional)
  - Automatic deduplication (no duplicate entries)
  - Chronological ordering (newest first)

**Main Methods**:
- `addView(projectId, walletAddress?)` - Track a project view
- `getRecentProjects(walletAddress?)` - Get projects with full data
- `clearViews(walletAddress?)` - Clear history (all or wallet-specific)
- `hasViewed(projectId, walletAddress?)` - Check if project was viewed
- `getLastViewedAt(projectId, walletAddress?)` - Get last view timestamp

#### 2. Custom Hook (`hooks/useRecentViews.ts`)
- **Purpose**: React hook for components to access recent views
- **Returns**:
  - `recentProjects` - Array of recently viewed Project objects
  - `isLoading` - Loading state
  - `trackView(projectId)` - Function to track new view
  - `clearHistory()` - Function to clear all history
  - `hasHistory` - Boolean indicating if there are any recent views

#### 3. UI Component (`components/projects/RecentlyViewedProjects.tsx`)
- **Purpose**: Display recently viewed projects
- **Variants**:
  - **Compact mode**: Shows 5 projects in a sidebar-friendly layout
  - **Full mode**: Shows all projects in a grid layout
- **Features**:
  - Clickable cards navigate to project detail page
  - Clear history button (optional)
  - Project thumbnails with fallback
  - Shows category badge and rating

### Integration Points

#### 1. Project Detail Page (`app/projects/[id]/page.tsx`)
- Automatically tracks views when a project is loaded
- Uses wallet address if connected, otherwise tracks globally
- Tracking happens in the main `useEffect` after project data loads

```typescript
// Track this project view
recentViewsService.addView(foundProject.id, gate.publicKey || undefined);
```

#### 2. Profile Page (`app/profile/page.tsx`)
- Shows full "Recently Viewed" section with all projects
- Includes clear history button with confirmation dialog
- Only displays when user has viewing history
- Positioned between "Your Reviews" and "Submitted Projects" sections

#### 3. Discover Page (`app/discover/page.tsx`)
- Shows compact recently viewed widget above project grid
- Displays up to 5 most recent projects
- No clear button in this view (keep it clean)
- Only shows when user has viewing history

## Data Structure

### RecentView Interface
```typescript
interface RecentView {
  projectId: string;
  viewedAt: string; // ISO date string
  walletAddress?: string; // Optional: scope to wallet
}
```

### Storage
- **Key**: `dongle_recent_views`
- **Format**: JSON array of RecentView objects
- **Location**: Browser localStorage
- **Max Size**: 10 items

## User Experience

### Acceptance Criteria
✅ Recent project views are recorded without duplicating entries
✅ Users can clear recent history (with confirmation)
✅ Recently viewed projects link back to detail pages
✅ Works with or without wallet connection
✅ Wallet-scoped tracking when connected

### Features
1. **Automatic Tracking**: Views are tracked automatically when viewing project details
2. **No Duplicates**: Viewing the same project moves it to the top without duplicating
3. **Persistent**: Survives browser refresh using localStorage
4. **Privacy**: Stored locally, never sent to server
5. **Wallet-Aware**: Can track separately per wallet address
6. **Clear History**: Users can delete their viewing history with confirmation

## UI Locations

### Profile Page
- Section title: "Recently Viewed" with clock icon
- Full grid layout (2 columns on medium screens)
- Shows all recent projects
- Clear history button in header
- Located between reviews and submitted projects

### Discover Page
- Compact sidebar widget above project grid
- Shows 5 most recent projects
- "View All" link to profile if more than 5
- No clear button (minimalist)

## Technical Details

### Browser Compatibility
- Requires localStorage support
- Gracefully degrades if localStorage unavailable
- Client-side only (no SSR issues)

### Performance
- Minimal overhead (simple localStorage operations)
- No API calls required
- Lazy loading via React hooks

### Security
- Data stored client-side only
- No sensitive information
- User-controlled deletion

## Future Enhancements

Potential improvements:
1. Add timestamps to display "Viewed X hours ago"
2. Sync across devices via backend API
3. Filter by category in recently viewed
4. Export/import viewing history
5. Private browsing mode (don't track)
6. Search within recently viewed
7. Pin favorite projects from recent views

## Testing Checklist

- [ ] View a project, verify it appears in recent views
- [ ] View same project twice, verify no duplicate
- [ ] View 11 projects, verify only last 10 are kept
- [ ] Clear history, verify all items removed
- [ ] Clear history with confirmation, verify cancel works
- [ ] Click recent project card, verify navigation works
- [ ] Test with wallet connected
- [ ] Test without wallet connected
- [ ] Switch wallets, verify separate histories
- [ ] Test compact mode on Discover page
- [ ] Test full mode on Profile page
- [ ] Verify localStorage persistence after refresh

## Files Changed/Added

### New Files
- `services/recent-views/recent-views.service.ts`
- `hooks/useRecentViews.ts`
- `components/projects/RecentlyViewedProjects.tsx`
- `RECENTLY_VIEWED_FEATURE.md`

### Modified Files
- `app/projects/[id]/page.tsx` - Added view tracking
- `app/profile/page.tsx` - Added recently viewed section
- `app/discover/page.tsx` - Added compact recently viewed widget
