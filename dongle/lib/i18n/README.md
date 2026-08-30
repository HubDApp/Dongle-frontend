# I18n Infrastructure

This directory contains the internationalization (i18n) infrastructure for the Dongle application.

## Overview

The i18n system provides:

- **Centralized messages**: All user-facing strings are stored in `messages/en.ts`
- **Type-safe translations**: Full TypeScript support with autocomplete
- **Parameter interpolation**: Dynamic values can be inserted into messages
- **Locale-aware formatting**: Consistent date and number formatting
- **Future-ready**: Structure supports adding new languages without refactoring

## Usage

### Basic Translation

```tsx
import { useTranslation } from "@/lib/i18n/useTranslation";

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <button>{t("common.submit")}</button>
  );
}
```

### Translation with Parameters

```tsx
import { useTranslation } from "@/lib/i18n/useTranslation";

function ReviewCount({ count }: { count: number }) {
  const { t } = useTranslation();
  
  return (
    <span>{t("projectCard.reviews", { count })}</span>
  );
}
```

### Date Formatting

```tsx
import { useTranslation } from "@/lib/i18n/useTranslation";

function DateDisplay({ date }: { date: Date }) {
  const { format } = useTranslation();
  
  return (
    <div>
      {/* Absolute date */}
      <p>{format.formatDate(date)}</p>
      
      {/* Relative date (e.g., "2 days ago") */}
      <p>{format.formatRelativeDate(date)}</p>
      
      {/* Smart date (relative for recent, absolute for old) */}
      <p>{format.formatSmartDate(date)}</p>
    </div>
  );
}
```

### Number Formatting

```tsx
import { useTranslation } from "@/lib/i18n/useTranslation";

function BalanceDisplay({ balance }: { balance: number }) {
  const { format } = useTranslation();
  
  return (
    <div>
      {/* Decimal formatting */}
      <p>{format.formatDecimal(balance, 2)}</p>
      
      {/* Compact numbers (1.2K, 3.4M) */}
      <p>{format.formatCompactNumber(balance)}</p>
      
      {/* Percentages */}
      <p>{format.formatPercent(0.1234)}</p>
    </div>
  );
}
```

### Server Components

For server components, import `t` directly:

```tsx
import { t } from "@/lib/i18n";

export default function ServerPage() {
  return (
    <h1>{t("discover.title")}</h1>
  );
}
```

## File Structure

```
lib/i18n/
├── index.ts              # Core i18n functions (t, getLocale, etc.)
├── locales.ts            # Supported locales, RTL list, ?lang= resolution
├── LocaleProvider.tsx    # React provider (URL + localStorage)
├── format.ts             # Locale-aware formatting utilities
├── useTranslation.ts     # React hook for components
├── messages/
│   ├── en.ts            # English messages (source locale)
│   ├── es.ts            # Spanish
│   └── pt.ts            # Portuguese
└── README.md            # This file
```

## Adding New Languages

To add a new language (e.g., Spanish):

1. Create `messages/es.ts`:

```typescript
import { type Messages } from "./en";

export const es: Messages = {
  common: {
    loading: "Cargando...",
    // ... rest of translations
  },
  // ...
};
```

2. Update `index.ts`:

```typescript
import { es } from "./messages/es";

type LocaleCode = "en" | "es";

const messages: Record<LocaleCode, Messages> = {
  en,
  es,
};
```

3. Implement locale detection/switching logic as needed.

## Message Key Naming Conventions

- Use dot notation for nesting: `"section.subsection.key"`
- Group related messages by feature/component
- Common messages go in `common.*`
- Navigation items go in `nav.*`
- Feature-specific messages go in their own namespace

## Parameter Interpolation

Messages support parameter interpolation using `{paramName}` syntax:

```typescript
// In messages/en.ts
profile: {
  submittedAt: "Submitted {date}",
}

// In component
t("profile.submittedAt", { date: "2 days ago" })
// Result: "Submitted 2 days ago"
```

## Formatting Options

### Date Formats

- `formatDate(date, { style: "short" })` → "1/15/24"
- `formatDate(date, { style: "medium" })` → "Jan 15, 2024"
- `formatDate(date, { style: "long" })` → "January 15, 2024"
- `formatDate(date, { style: "full" })` → "Monday, January 15, 2024"
- `formatDate(date, { includeTime: true })` → "January 15, 2024 at 3:30 PM"

### Relative Dates

- `formatRelativeDate(date)` → "2 days ago", "in 3 hours", "yesterday"
- `formatSmartDate(date)` → Relative for recent dates, absolute for older

### Number Formats

- `formatNumber(1234.56)` → "1,234.56"
- `formatDecimal(3.14159, 2)` → "3.14"
- `formatCompactNumber(1234567)` → "1.2M"
- `formatPercent(0.1234)` → "12.34%"

## Migration Strategy

Existing components can be migrated incrementally:

1. Import `useTranslation` hook
2. Replace hard-coded strings with `t("key")` calls
3. Replace date/number formatting with `format.*` utilities
4. Test to ensure visual output remains the same

The existing English copy is preserved in `messages/en.ts`, so no visual changes should occur during migration.

## Benefits

- **Maintainability**: All text in one place
- **Consistency**: Uniform formatting across the app
- **Type Safety**: Catch missing keys at compile time
- **Languages**: English, Spanish, Portuguese with `?lang=` and localStorage persistence
- **RTL-ready**: `document.dir` switches for `ar`/`he` when those catalogs are added
- **Testing**: Locale-independent date/number formatting prevents test flakiness
