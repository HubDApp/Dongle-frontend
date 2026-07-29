# Draft Feature UI Guide

## Visual Components

### 1. Draft Restored Notification
When a user returns to the form with a saved draft:

```
┌─────────────────────────────────────────────────────────┐
│ ✓ Your previous draft has been restored                │
└─────────────────────────────────────────────────────────┘
```
- Green background with checkmark icon
- Appears at the top of the form
- Auto-dismisses when user discards the draft

### 2. Draft Status Indicator
Shows while a draft exists:

```
┌─────────────────────────────────────────────────────────┐
│ 💾 Draft saved  🕐 2m ago     [🗑️ Discard Draft]      │
└─────────────────────────────────────────────────────────┘
```
- Blue background indicating saved state
- Save icon + "Draft saved" text
- Clock icon with human-readable timestamp
- Discard button on the right
- Updates timestamp as user types (debounced)

### 3. Discard Confirmation Dialog
When user clicks "Discard Draft":

```
┌───────────────────────────────────────────┐
│                                           │
│  🗑️                                       │
│                                           │
│  Discard Draft                            │
│                                           │
│  Are you sure you want to discard this   │
│  draft? All unsaved changes will be lost.│
│                                           │
│             [Keep Draft]  [Discard Draft] │
│                                           │
└───────────────────────────────────────────┘
```
- Red-themed alert dialog
- Trash icon for visual clarity
- Clear warning message
- Two-button layout for confirmation

## Form Layout

### Complete Form with Draft Features

```
┌─────────────────────────────────────────────────────────────┐
│  🚀  Register Project                                       │
│      Onboard your dApp to the Dongle ecosystem.            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ Your previous draft has been restored                   │
│                                                             │
│  💾 Draft saved  🕐 just now    [🗑️ Discard Draft]       │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ Project Name         │  │ Category             │       │
│  │ [Input field...]     │  │ [Select field...]    │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────┐         │
│  │ Tags                                         │         │
│  │ [Tag input field...]                         │         │
│  └──────────────────────────────────────────────┘         │
│                                                             │
│  ┌──────────────────────────────────────────────┐         │
│  │ Description                                  │         │
│  │ [Textarea...]                                │         │
│  │                                              │         │
│  └──────────────────────────────────────────────┘         │
│                                                             │
│  ┌──────────────────────────────────────────────┐         │
│  │ Project Website                              │         │
│  │ [https://yourproject.com]                    │         │
│  └──────────────────────────────────────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ GitHub URL  │  │ Logo URL    │  │ Docs URL    │       │
│  │ [Optional]  │  │ [Optional]  │  │ [Optional]  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────┐         │
│  │          Submit Registration  ✓              │         │
│  └──────────────────────────────────────────────┘         │
│                                                             │
│  By submitting, you agree to have your project details    │
│  stored on the Stellar network. A small transaction fee   │
│  will be required for on-chain registration.               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Timestamp Format

The "last saved" indicator uses human-readable formats:

| Time Elapsed | Display Format |
|--------------|----------------|
| < 1 minute   | "just now"     |
| 1-59 minutes | "Xm ago"       |
| 1-23 hours   | "Xh ago"       |
| 1+ days      | "Xd ago"       |

Examples:
- 30 seconds ago → "just now"
- 2 minutes ago → "2m ago"
- 1 hour ago → "1h ago"
- 3 days ago → "3d ago"

## Color Scheme

### Draft Restored Notification
- Background: `bg-green-500/10` (10% opacity green)
- Border: `border-green-500/20` (20% opacity green)
- Text: `text-green-600 dark:text-green-400`
- Icon: CheckCircle2 (green)

### Draft Status Indicator
- Background: `bg-blue-500/10` (10% opacity blue)
- Border: `border-blue-500/20` (20% opacity blue)
- Text: `text-blue-600 dark:text-blue-400`
- Icons: Save, Clock (blue)
- Discard button: `text-red-500 hover:text-red-600`

### Discard Button (in indicator)
- Variant: ghost
- Color: red
- Hover: `hover:bg-red-500/10`
- Icon: Trash2

## Responsive Behavior

### Desktop (≥768px)
- All elements in single column
- Side-by-side fields use grid layout
- Draft indicator spans full width
- Discard button aligned right

### Mobile (<768px)
- Stack all elements vertically
- Draft indicator remains full width
- Discard button text may wrap
- Touch-friendly button sizes

## Accessibility Features

### Draft Indicator
- Clear visual distinction with color and icons
- Timestamp updates announce to screen readers
- Button has descriptive label

### Discard Dialog
- Modal dialog with proper ARIA attributes
- Focus trap inside dialog
- Escape key cancels
- Clear confirmation required

### Auto-save
- Doesn't interrupt user typing
- Debounced to avoid performance issues
- No flash of content during save
- Silent operation (no announcements)

## User Interaction States

### State 1: No Draft
- No draft indicator shown
- Clean form with empty fields
- No restored notification

### State 2: Draft Exists (same session)
- Draft indicator visible
- Timestamp updates as user types
- No restored notification

### State 3: Draft Restored (new session)
- Green "restored" notification shown
- Draft indicator with last saved time
- Fields populated with draft data

### State 4: After Discard
- All indicators disappear
- Form resets to empty/initial state
- No draft in storage

### State 5: After Submit
- Draft cleared automatically
- User redirected to success page
- No draft indicator on return

## Edge Cases

### Empty Form
- Auto-save only triggers if form has content
- Draft not created for completely empty form
- Prevents storage pollution

### Network Disconnection
- Drafts remain local (no network needed)
- Auto-save continues to work offline
- Submit requires network connection

### Browser Incompatibility
- Gracefully degrades if localStorage unavailable
- No error shown to user
- Form still functional without drafts

### Storage Full
- Catches localStorage quota errors
- Silently fails without breaking form
- User can still submit normally
