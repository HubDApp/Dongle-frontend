# Submission Quality Checklist Feature

## Overview
Added a visual quality checklist to guide project submitters on creating high-quality listings. The checklist appears in both new project submission and project edit flows.

## Implementation

### New Component: `SubmissionChecklist`
Location: `dongle/components/projects/SubmissionChecklist.tsx`

**Features:**
- Real-time progress tracking as users fill out the form
- Quality score calculation (0-100%) with visual progress bar
- Color-coded status indicators:
  - ✅ Green: Completed items
  - ⚠️ Orange: Required fields not yet completed
  - ⭕ Gray: Optional fields not yet completed
- Separate tracking for required vs optional fields
- Non-blocking: guides users but doesn't prevent submission

### Checklist Items

**Required Fields:**
- ✅ Project Name (minimum 3 characters)
- ✅ Project Website (active website URL)
- ✅ Description (10-500 characters)

**Optional Quality Indicators:**
- Logo URL (for better visibility)
- Documentation URL (helps users understand the project)
- Repository URL (GitHub/GitLab/Bitbucket for transparency)
- Audit Report URL (builds trust with security audit)
- Bug Bounty Program URL (shows commitment to security)

### Quality Score Algorithm
- Required fields weight: 60%
- Optional fields weight: 40%
- Score ranges:
  - 100%: Perfect - all items completed
  - 80-99%: Excellent quality listing
  - 60-79%: Good quality, consider adding optional items
  - 40-59%: Basic listing, add more details for better visibility
  - <40%: Complete required fields to submit

### Integration Points
- Integrated into `ProjectForm` component
- Appears in both `/projects/new` and `/projects/[id]/edit` flows
- Updates in real-time as form fields change
- Works seamlessly with existing draft autosave feature

## User Experience

### Visual Feedback
1. **Progress Bar**: Shows overall completion percentage with color gradient
2. **Stats Cards**: Displays required (X/Y) and optional (X/Y) completion counts
3. **Item List**: Each checklist item shows:
   - Completion status icon
   - "Required" badge for mandatory fields
   - Item label and description
   - Color-coded background based on status

### Quality Messages
- Provides contextual feedback based on quality score
- Encourages users to complete optional fields for better visibility
- Clear messaging about submission requirements

## Acceptance Criteria Met

✅ **Checklist appears near the submit/edit flow**
- Positioned prominently in the form, right after draft indicator
- Visible in both new submission and edit pages

✅ **Completed items are visually tracked**
- Real-time updates as users type
- Visual progress bar with percentage
- Color-coded status for each item
- Separate counters for required vs optional

✅ **Checklist does not block submission**
- Only enforces required fields (name, website, description)
- Optional items improve quality score but don't prevent submission
- Clear messaging distinguishes required from optional

## Technical Details

### Props Interface
```typescript
interface SubmissionChecklistProps {
  formData: {
    name?: string;
    websiteUrl?: string;
    githubUrl?: string;
    logoUrl?: string;
    docsUrl?: string;
    auditReportUrl?: string;
    bugBountyUrl?: string;
    description?: string;
  };
  className?: string;
}
```

### State Management
- Uses `useMemo` for efficient checklist calculation
- Watches form values via React Hook Form's `watch()` API
- No additional state management required

## Benefits

1. **Improved Listing Quality**: Guides submitters to provide comprehensive information
2. **User Education**: Teaches best practices for project submissions
3. **Better Discovery**: More complete listings improve user trust and engagement
4. **Non-Intrusive**: Doesn't block submission, just guides and encourages
5. **Visual Feedback**: Clear, immediate feedback on submission quality

## Future Enhancements (Optional)

- Add tooltips with examples for each field
- Link to documentation/guide on creating quality listings
- Add verification status integration when verification feature is used
- Export checklist as a shareable quality report
- Add contract ID fields when smart contract integration is ready
