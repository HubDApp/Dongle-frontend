# Form Audit Logging

Every form interaction is appended to a searchable audit log that records the
change, its timestamp, the acting user identity, and the client IP address
(issue #559).

## Acceptance criteria

| Criterion | Where it is implemented |
| --- | --- |
| Logs all changes | `useFormAuditLog().trackValues()` diffs form state and records a `field_change` entry per changed field; `logAction()` records submits/failures. |
| Timestamps recorded | `formAuditLogService.record()` stamps an ISO-8601 `timestamp` at write time; entries cannot be edited afterwards. |
| User identity recorded | `actor` is the acting identity (Stellar `G…` key or OAuth subject); falls back to `"anonymous"` when neither is available. |
| IP address recorded | `GET /api/audit/client-ip` resolves the IP server-side from proxy headers; the hook caches the stamp and stores `ipAddress` + a non-reversible `ipHash` on every entry. |
| Searchable logs | `formAuditLogService.search(query, filter)`, `list(filter)` (formId, formType, actor, action, since, until, query, limit) and `exportCsv(filter)`. |

## How it works

```
form field change ──▶ useFormAuditLog (diff + actor + cached IP)
                          │
                          ▼
                 formAuditLogService.record()  ──▶ localStorage (append-only)
                          ▲
GET /api/audit/client-ip ─┘  (server resolves the IP once per page load)
```

- **Service:** `dongle/services/audit/form-audit-log.service.ts` — append-only,
  `localStorage`-backed, sibling of the admin mutation log
  (`audit-log.service.ts`). Same conventions: only `record()` writes,
  corrupt/partial records are skipped on hydration, and entries older than one
  year can be removed with `pruneOldEntries()`.
- **Hook:** `dongle/hooks/useFormAuditLog.ts` — returns `trackValues()`,
  `logFieldChange()` and `logAction()`.
- **Types:** `dongle/types/form-audit-log.ts`.
- **Server stamp:** `dongle/app/api/audit/client-ip/route.ts`, sharing
  `dongle/lib/request-ip.ts` with the anomaly-detection IP hash endpoint.

### Why the IP is stamped server-side

A browser cannot read its own public IP address, and fetching it from a
third-party service would leak traffic and add a dependency. Instead the IP is
resolved where the project already handles server-side requests — in a Next.js
route handler — from `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip`, then
cached by the client for the page load. If the endpoint is unreachable the
entry is still written with `ipAddress: null` and `ipSource: "unavailable"`, so
no form change is lost.

## Using it in a new form

```tsx
import { useEffect } from "react";
import { useFormAuditLog } from "@/hooks/useFormAuditLog";

const { trackValues, logAction } = useFormAuditLog({
  formId: "project-form",      // must match the <form id="project-form">
  formType: "project-create",
  actor: publicKey,            // Stellar G… key, OAuth subject, or omit
});

useEffect(() => {
  trackValues(values);         // first call sets the baseline; later calls log diffs
}, [trackValues, JSON.stringify(values)]);

<form id="project-form" onSubmit={handleSubmit(() => logAction("form_submit"))}>
```

`logFieldChange(field, value, previousValue?)` is available when a form does not
expose a values object (e.g. controlled modals).

## Privacy and retention

- Entries are device-local (`localStorage`, key `dongle_form_audit_log`); the
  service never sends audit payloads to a third party.
- Field values are truncated to `MAX_FORM_AUDIT_VALUE_LENGTH` (500 chars).
- `redactedList()` masks identities and IP hosts for sharing; `exportCsv()`
  produces the full record for the audit team.
- `pruneOldEntries()` enforces a one-year retention window.

## Tests

Not run locally here (no checkout). Run:

```bash
cd dongle
npx vitest --run __tests__/lib/request-ip.test.ts __tests__/services/form-audit-log.service.test.ts __tests__/hooks/useFormAuditLog.test.tsx
npm test
npm run typecheck
npm run lint
```
