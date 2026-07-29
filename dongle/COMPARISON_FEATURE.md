# Project Comparison Feature

## Overview
The Project Comparison feature allows users to select multiple projects and compare their key attributes side-by-side in a comprehensive comparison table.

## Problem Solved
Users could not easily compare projects by rating, reviews, category, verification status, links, and security resources. This feature provides a streamlined way to make informed decisions when evaluating multiple projects.

## Features

### 1. Project Selection
- **Add to Comparison**: Click the "+" button on any project card to add it to comparison
- **Visual Feedback**: Selected projects show a checkmark icon
- **Maximum Limit**: Users can select up to 4 projects for comparison
- **Disabled State**: When 4 projects are selected, other cards show a disabled state

### 2. Floating Comparison Panel
- **Persistent Display**: Appears at the bottom center of the screen when projects are selected
- **Quick Preview**: Shows thumbnails of all selected projects
- **Remove Projects**: Individual projects can be removed with the "X" button
- **Clear All**: Option to clear all selections at once
- **Minimum Requirement**: "Compare Now" button requires at least 2 projects

### 3. Comparison View (`/compare` page)
- **Side-by-Side Table**: Desktop view shows all projects in a horizontal comparison table
- **Responsive Mobile View**: Mobile displays each project in stacked cards
- **Comprehensive Attributes**: Compares the following:
  - Rating with star visualization
  - Number of reviews
  - Category with badge styling
  - Verification status with badges
  - Tags
  - Description
  - Website link
  - GitHub repository link
  - Documentation link
  - Security audit report
  - Bug bounty program

### 4. Empty States
- **No Selection**: Redirects users to discover page with helpful message
- **Single Project**: Prompts user to add more projects (minimum 2 required)
- **Clear Guidance**: Each state provides actionable next steps

## Technical Implementation

### Context & State Management
**File**: `dongle/context/comparison.context.tsx`
- Global state management using React Context
- Maximum 4 projects enforced at context level
- Methods: `addProject`, `removeProject`, `clearComparison`, `isSelected`

### Components

#### 1. ComparisonFloatingButton
**File**: `dongle/components/compare/ComparisonFloatingButton.tsx`
- Floating panel that appears when projects are selected
- Shows project thumbnails with remove buttons
- Navigate to comparison page or clear all selections

#### 2. Compare Page
**File**: `dongle/app/compare/page.tsx`
- Full comparison view with responsive design
- Desktop: Horizontal scrollable table
- Mobile: Stacked cards per project
- Fetches verification statuses dynamically
- Handles empty states gracefully

#### 3. Updated ProjectCard
**File**: `dongle/components/projects/ProjectCard.tsx`
- Added comparison checkbox toggle
- Visual states: default, selected, disabled (max reached)
- Prevents navigation when clicking compare button

### Styling & Animations
**File**: `dongle/app/globals.css`
- Added `slide-up` animation for floating button
- Smooth entrance animation when panel appears

### Layout Integration
**Files**: 
- `dongle/app/layout.tsx` - Added ComparisonProvider wrapper
- `dongle/components/layout/LayoutWrapper.tsx` - Added floating button component

## User Experience

### Adding Projects
1. Browse projects on discover page or any project list
2. Click the "+" icon on desired project cards
3. Watch the floating panel appear showing selections
4. Continue adding up to 4 projects

### Comparing Projects
1. Click "Compare Now" on the floating panel (requires 2+ projects)
2. View side-by-side comparison on `/compare` page
3. Remove unwanted projects from comparison
4. Add more projects or clear all

### Mobile Experience
- Responsive design adapts to small screens
- Floating panel adjusts to viewport width
- Comparison view switches to vertical stacked cards
- All functionality preserved on mobile

## Acceptance Criteria Met

✅ **Users can add/remove projects from comparison**
- Add: Click "+" on project cards
- Remove: Click "X" on project in floating panel or comparison page
- Clear all: "Clear all" button available

✅ **Comparison view works on desktop and mobile**
- Desktop: Horizontal table with sticky header and attribute column
- Mobile: Vertical stacked cards with all comparison data
- Responsive breakpoints using Tailwind classes

✅ **Empty and max-selection states are handled**
- No selection: Message to browse projects
- Single project: Prompt to add more (minimum 2)
- Max selection (4): Additional cards show disabled state
- Clear visual feedback for all states

## Future Enhancements

### Potential Improvements
1. **Persist Selections**: Save comparison selections to localStorage
2. **Share Comparison**: Generate shareable link with selected project IDs
3. **Export**: Export comparison table as PDF or CSV
4. **Advanced Filters**: Filter comparison attributes to show/hide rows
5. **Score Calculation**: Weighted scoring system based on selected attributes
6. **Comparison History**: Track previously compared project sets

### Additional Attributes
- TVL (Total Value Locked) for DeFi projects
- Active users / transaction volume
- Team information and social links
- Roadmap milestones
- Integration partners

## Testing Checklist

### Functional Tests
- [ ] Can add project to comparison from discover page
- [ ] Can add maximum of 4 projects
- [ ] Cannot add more when limit reached
- [ ] Can remove individual projects from floating panel
- [ ] Can remove projects from comparison page
- [ ] Clear all removes all selections
- [ ] Floating panel only shows when projects selected
- [ ] Compare button disabled with less than 2 projects
- [ ] Navigation to `/compare` works correctly
- [ ] Empty state shows appropriate message
- [ ] Single project state prompts for more

### Responsive Tests
- [ ] Desktop table layout displays correctly
- [ ] Mobile stacked cards display correctly
- [ ] Floating panel adapts to screen width
- [ ] All buttons remain clickable on mobile
- [ ] Horizontal scroll works on desktop table
- [ ] No layout breaks at tablet breakpoint

### Integration Tests
- [ ] Verification status fetched correctly
- [ ] All project attributes display properly
- [ ] External links open in new tabs
- [ ] Project images/logos display or fallback correctly
- [ ] Tag badges render properly
- [ ] Verification badges show correct status

## Browser Compatibility
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Performance Considerations
- Comparison page fetches verification statuses asynchronously
- Loading states prevent user confusion
- Maximum 4 projects limits API calls
- React Context prevents unnecessary re-renders
- Memoization used where appropriate
