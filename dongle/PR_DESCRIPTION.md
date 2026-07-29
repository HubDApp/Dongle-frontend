# Add draft saving for project submissions

## Summary
Implements draft saving functionality to prevent data loss when users navigate away from project submission forms.

## Changes
- Auto-save draft functionality with 1-second debouncing
- localStorage-based draft service for data persistence
- Draft indicator UI showing last saved timestamp
- Discard draft feature with confirmation dialog
- Separate drafts for create and edit modes
- Automatic draft cleanup after successful submission
- Comprehensive test coverage and documentation

## Problem Solved
Users previously lost all form progress when navigating away from the submission page. This was frustrating and prevented users from saving partial submissions.

## Solution
- Form data auto-saves to browser localStorage every second (debounced)
- Drafts persist across browser sessions
- Visual feedback shows draft status and last saved time
- Users can explicitly discard drafts when no longer needed

## Acceptance Criteria Met
✅ In-progress submission data is preserved across sessions  
✅ Users can discard drafts via UI with confirmation  
✅ Drafts remain local and never published until explicit submit

## Testing
- All TypeScript checks pass
- Unit tests included for draft service
- Manual testing checklist provided in DRAFT_TESTING_CHECKLIST.md

## Documentation
- DRAFT_FEATURE.md - Feature overview and usage
- DRAFT_IMPLEMENTATION_SUMMARY.md - Technical details
- DRAFT_UI_GUIDE.md - UI components and styling
- DRAFT_TESTING_CHECKLIST.md - Testing guide

## Breaking Changes
None - this is a new feature with no impact on existing functionality
