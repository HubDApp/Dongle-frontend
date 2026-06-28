# Draft Feature Testing Checklist

## Manual Testing Guide

### Test 1: Basic Auto-Save (Create Mode)
**Steps:**
1. Navigate to `/projects/new`
2. Fill in "Project Name" field
3. Wait 1 second
4. Check browser DevTools → Application → Local Storage
5. Verify `dongle_project_drafts` key exists

**Expected:**
- ✅ Draft indicator appears after 1 second
- ✅ Shows "Draft saved" with "just now" timestamp
- ✅ localStorage contains draft data

---

### Test 2: Draft Persistence Across Sessions
**Steps:**
1. Navigate to `/projects/new`
2. Fill in several fields (name, description, website)
3. Wait for "Draft saved" indicator
4. Close browser tab
5. Reopen `/projects/new`

**Expected:**
- ✅ Form fields are pre-filled with draft data
- ✅ Green "Your previous draft has been restored" notification appears
- ✅ Draft indicator shows last saved time

---

### Test 3: Discard Draft
**Steps:**
1. Create a draft (fill form, wait for save)
2. Click "Discard Draft" button
3. Confirm in dialog

**Expected:**
- ✅ Confirmation dialog appears with warning
- ✅ After confirm, form resets to empty
- ✅ Draft indicator disappears
- ✅ localStorage no longer contains draft
- ✅ Green "restored" notification disappears

---

### Test 4: Auto-Save Debouncing
**Steps:**
1. Navigate to `/projects/new`
2. Start typing continuously in "Project Name"
3. Observe draft indicator

**Expected:**
- ✅ Indicator doesn't appear immediately
- ✅ Appears ~1 second after typing stops
- ✅ Timestamp updates when typing resumes and stops again
- ✅ No performance issues or lag while typing

---

### Test 5: Successful Submission Clears Draft
**Steps:**
1. Create a draft (fill required fields)
2. Submit the form successfully
3. Navigate back to `/projects/new`

**Expected:**
- ✅ Form is empty (no draft restored)
- ✅ No draft indicator
- ✅ localStorage draft is cleared

---

### Test 6: Edit Mode Draft (Separate from Create)
**Steps:**
1. Create draft in create mode (`/projects/new`)
2. Navigate to edit page (`/projects/123/edit`)
3. Make changes, wait for draft save
4. Navigate back to `/projects/new`
5. Navigate back to `/projects/123/edit`

**Expected:**
- ✅ Create mode shows its own draft
- ✅ Edit mode shows its own draft
- ✅ Both drafts persist independently
- ✅ localStorage contains both drafts with different IDs

---

### Test 7: Empty Form No Draft
**Steps:**
1. Navigate to `/projects/new`
2. Focus on name field, then blur (don't type)
3. Wait 2 seconds
4. Check localStorage

**Expected:**
- ✅ No draft created
- ✅ No draft indicator appears
- ✅ localStorage remains empty

---

### Test 8: Draft with All Fields
**Steps:**
1. Fill all form fields:
   - Project Name
   - Category
   - Tags (add 2-3 tags)
   - Description
   - Website URL
   - GitHub URL
   - Logo URL
   - Docs URL
2. Wait for draft save
3. Refresh page

**Expected:**
- ✅ All fields restored correctly
- ✅ Tags array preserved
- ✅ Category selection preserved
- ✅ All URLs restored

---

### Test 9: Cancel Discard Dialog
**Steps:**
1. Create a draft
2. Click "Discard Draft"
3. Click "Keep Draft" in dialog

**Expected:**
- ✅ Dialog closes
- ✅ Form data remains unchanged
- ✅ Draft still exists in localStorage
- ✅ Draft indicator still visible

---

### Test 10: Timestamp Updates
**Steps:**
1. Create a draft
2. Note the "Xm ago" timestamp
3. Wait 1 minute
4. Type one character in any field
5. Wait 1 second

**Expected:**
- ✅ Timestamp updates to reflect new save time
- ✅ Shows "just now" after recent save
- ✅ Changes to "1m ago", "2m ago" etc. over time

---

### Test 11: Multiple Browser Tabs
**Steps:**
1. Open `/projects/new` in Tab 1
2. Fill form, wait for draft save
3. Open `/projects/new` in Tab 2
4. Make changes in Tab 2, wait for save
5. Refresh Tab 1

**Expected:**
- ✅ Tab 1 shows changes from Tab 2
- ✅ Only one draft exists (not duplicated)
- ✅ Latest changes take precedence

---

### Test 12: Navigation Warning
**Steps:**
1. Fill form without submitting
2. Try to navigate away (use browser back or type new URL)

**Expected:**
- ✅ Browser shows "Leave site?" warning
- ✅ Draft is saved even if user leaves
- ✅ Draft can be restored when returning

---

### Test 13: Form Validation with Draft
**Steps:**
1. Fill form with invalid data (short name, invalid URL)
2. Wait for draft save
3. Try to submit
4. Refresh page

**Expected:**
- ✅ Draft saves even with invalid data
- ✅ Validation errors shown on submit
- ✅ Invalid data restored after refresh
- ✅ User can fix validation errors

---

### Test 14: Edit Mode - Owner Verification
**Steps:**
1. Login with Wallet A
2. Create and submit a project
3. Navigate to edit page for that project
4. Make changes, wait for draft
5. Logout and login with Wallet B
6. Navigate to same edit page

**Expected:**
- ✅ Wallet A can see edit form with draft
- ✅ Wallet B sees "Access Denied" message
- ✅ Draft is wallet-specific (localStorage)

---

### Test 15: Dark Mode Compatibility
**Steps:**
1. Toggle dark mode on
2. Create a draft
3. Observe all draft UI elements

**Expected:**
- ✅ Draft indicator visible in dark mode
- ✅ Text colors readable
- ✅ Icons visible
- ✅ Discard button hover states work
- ✅ Dialog displays correctly

---

## Automated Test Coverage

Run with: `npm test dongle/__tests__/services/draft.service.test.ts`

### Covered by Unit Tests:
- ✅ Save and retrieve drafts
- ✅ Get draft by mode (create/edit)
- ✅ Delete specific draft
- ✅ Clear all drafts
- ✅ Content detection
- ✅ Multiple draft handling
- ✅ localStorage operations

### Not Covered (Manual Only):
- ❌ UI rendering and interactions
- ❌ Form integration
- ❌ Auto-save debouncing behavior
- ❌ Timestamp formatting
- ❌ Browser tab synchronization
- ❌ Navigation warnings

---

## Browser Compatibility Testing

Test in multiple browsers:

### Chrome/Edge ✓
- localStorage support: Yes
- Expected: Full functionality

### Firefox ✓
- localStorage support: Yes
- Expected: Full functionality

### Safari ✓
- localStorage support: Yes
- Expected: Full functionality
- Note: Check private browsing mode (localStorage disabled)

### Mobile Safari (iOS) ✓
- localStorage support: Yes
- Expected: Full functionality
- Test: Form fields, touch interactions

### Mobile Chrome (Android) ✓
- localStorage support: Yes
- Expected: Full functionality

---

## Performance Testing

### Metrics to Check:
1. **Initial Load**: Page loads in <2 seconds with draft
2. **Auto-save Lag**: No visible delay when typing
3. **localStorage Size**: Draft <10KB per project
4. **Memory Usage**: No leaks after multiple saves

### Tools:
- Chrome DevTools Performance tab
- Lighthouse performance audit
- React DevTools Profiler

---

## Accessibility Testing

### Keyboard Navigation:
1. Tab through form with draft indicator
2. Focus on "Discard Draft" button
3. Press Enter to open dialog
4. Tab through dialog buttons
5. Press Escape to cancel

**Expected:**
- ✅ Logical tab order
- ✅ Visible focus indicators
- ✅ Dialog focus trap works
- ✅ Escape key closes dialog

### Screen Reader Testing:
Use NVDA, JAWS, or VoiceOver to verify:
- ✅ Draft indicator announces saved status
- ✅ Timestamp is readable
- ✅ Discard button label clear
- ✅ Dialog announces properly

---

## Edge Cases to Test

### Scenario 1: localStorage Disabled
1. Disable localStorage in browser settings
2. Try to use form

**Expected:**
- ✅ Form still works
- ✅ No errors shown
- ✅ Auto-save fails silently

### Scenario 2: Storage Quota Exceeded
1. Fill localStorage to capacity
2. Try to save draft

**Expected:**
- ✅ Error caught and logged
- ✅ Form remains functional
- ✅ User not blocked from submission

### Scenario 3: Corrupted localStorage Data
1. Manually corrupt draft data in DevTools
2. Reload page

**Expected:**
- ✅ Error caught gracefully
- ✅ Form loads with empty fields
- ✅ New draft can be created

---

## Regression Testing

After any form changes, verify:
- ✅ Draft save still works
- ✅ All fields included in draft
- ✅ Validation rules unchanged
- ✅ Submit clears draft
- ✅ No console errors

---

## Success Criteria Summary

All tests should pass with:
- No console errors
- No broken UI elements
- Consistent behavior across browsers
- Responsive on mobile devices
- Accessible via keyboard and screen readers
- Performance remains fast
- localStorage cleanup on submit
