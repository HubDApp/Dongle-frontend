# Form Field Visibility Conditions Guide

The form field visibility conditions engine (`@/lib/form-visibility` and `@/components/ui/ConditionalField`) provides a reusable, declarative, and chainable way to show and hide form elements based on user input and form state.

## Features

- **Declarative & Chainable API**: Fluent syntax using `VisibilityCondition.when(...).equals(...)`.
- **Compound Logic**: Full support for `AND`, `OR`, and `NOT` compositions.
- **Nested & Array Path Resolution**: Supports deep object and array paths like `metadata.contract.type` or `contacts[0].primary`.
- **Comprehensive Operator Set**:
  - `equals(val)` / `notEquals(val)`
  - `in(array)` / `notIn(array)`
  - `greaterThan(num)` / `greaterThanOrEqual(num)`
  - `lessThan(num)` / `lessThanOrEqual(num)`
  - `between(min, max)`
  - `isTruthy()` / `isFalsy()`
  - `isEmpty()` / `isNotEmpty()`
  - `matches(regex)`
  - `includes(val)`
  - `custom((val, allValues) => boolean)`
- **React Integration**: Reusable `<ConditionalField>` component and `useFieldVisibility` hook.

---

## Quick Start

### 1. Basic Field Equality

```tsx
import { VisibilityCondition } from "@/lib/form-visibility";
import { ConditionalField } from "@/components/ui/ConditionalField";

const showAuditField = VisibilityCondition
  .when("category")
  .equals("defi");

<ConditionalField condition={showAuditField} values={formValues}>
  <FormField label="Audit Report URL" name="auditUrl" />
</ConditionalField>
```

### 2. Compound AND / OR Logic

```tsx
// Show Soroban Contract Address if project type is soroban AND network is either testnet or mainnet
const showContractInput = VisibilityCondition
  .when("type").equals("soroban")
  .andWhen("network").in(["testnet", "mainnet"]);

// Show either if custom contract checkbox is true OR advanced mode is enabled
const showAdvancedConfig = VisibilityCondition
  .when("hasCustomContract").equals(true)
  .orWhen("settings.advancedMode").isTruthy();
```

### 3. Nested Fields & Arrays

```tsx
// Check deep object properties or array values
const showMultiSig = VisibilityCondition
  .when("wallet.security.multiSigEnabled")
  .isTruthy()
  .andWhen("signers[0].address")
  .isNotEmpty();
```

### 4. Custom Predicates

```tsx
const showCustomWarning = VisibilityCondition
  .when("budget")
  .custom((budget, form) => Number(budget) > 100_000 && form.currency === "USDC");
```

---

## React Component API: `<ConditionalField>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `condition` | `ConditionInput` | Required | Visibility condition instance, builder, or builder callback |
| `values` | `Record<string, any>` | Required | Current form values object |
| `fallback` | `React.ReactNode` | `null` | Rendered when condition evaluates to false |
| `unmountOnHide` | `boolean` | `true` | If false, keeps children in DOM with `display: none` and `aria-hidden="true"` |
| `className` | `string` | `""` | Optional wrapper CSS class when `unmountOnHide` is false |

### Example with Callback Syntax:

```tsx
<ConditionalField
  condition={(b) => b.when("authType").equals("oauth").andWhen("provider").isNotEmpty()}
  values={watch()}
>
  <FormField label="Client ID" name="clientId" />
</ConditionalField>
```
