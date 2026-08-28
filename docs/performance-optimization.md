# Performance Optimization Guide

This document covers performance best practices and optimization techniques for the Dongle frontend.

## Code Splitting and Lazy Loading

### Dynamic Imports

The project uses Next.js dynamic imports to split code at the route level. Heavy modules are loaded only when needed:

```typescript
// Lazy-load the Soroban service (includes stellar-sdk ~500KB)
const sorobanService = await import("@/services/stellar/lazy-soroban.service");
```

**Key lazy-loaded modules:**

| Module | Why Lazy | Approximate Size |
|--------|----------|------------------|
| `soroban.service.ts` | `stellar-sdk` is heavy | ~500KB |
| `verification.service.ts` | Only needed on verification flows | ~50KB |
| `review.service.ts` | Only needed on review flows | ~30KB |

### Lazy Service Pattern

The `lazy-soroban.service.ts` pattern wraps a heavy module with a thin proxy that imports on first call:

```typescript
let cache: typeof sorobanService | null = null;

async function load() {
  if (cache) return cache;
  const mod = await import("./soroban.service");
  cache = mod.sorobanService;
  return cache;
}

export const lazySorobanService = {
  async registerProject(data, options) {
    const service = await load();
    return service.registerProject(data, options);
  },
  // ... other methods
};
```

### Preloading

Preload heavy modules when the user is likely to need them soon:

```typescript
// Preload on hover over "Submit Project" button
<button onMouseEnter={() => preloadSorobanService()}>
  Submit Project
</button>
```

### Route-Level Splitting

Next.js App Router automatically splits code per route. Ensure heavy components are only imported where needed:

```typescript
// Good — only loaded on the project page
import { ProjectDetail } from "@/components/projects/ProjectDetail";

// Bad — loaded on every page that imports this barrel
import { ProjectDetail } from "@/components/projects";
```

## Image Optimization

### Next.js Image Component

Use `next/image` for all project logos and user avatars:

```typescript
import Image from "next/image";

<Image
  src={project.logoUrl}
  alt={project.name}
  width={48}
  height={48}
  placeholder="blur"
  blurDataURL={placeholderBlur}
/>
```

### Guidelines

- Always specify `width` and `height` to prevent layout shift
- Use `placeholder="blur"` with a tiny base64 blur for better perceived performance
- Serve images from a CDN (IPFS gateway or external CDN)
- Use `loading="lazy"` for below-the-fold images (Next.js does this by default)

## Soroban Call Caching

### Read Operations

On-chain read operations (simulations) should be cached to avoid redundant RPC calls:

```typescript
// Cache verification status for the duration of the page session
const verificationCache = new Map<string, { status: VerificationStatus; ts: number }>();

async function getCachedVerificationStatus(projectId: string): Promise<VerificationStatus> {
  const cached = verificationCache.get(projectId);
  if (cached && Date.now() - cached.ts < 60_000) {
    return cached.status;
  }

  const status = await sorobanService.getVerificationStatus(projectId);
  verificationCache.set(projectId, { status, ts: Date.now() });
  return status;
}
```

### Write Operations

Never cache write operations. Always execute fresh transactions for:
- `register_project`
- `update_project`
- `submit_review`
- `request_verification`

### Stale-While-Revalidate Pattern

For data that changes infrequently (project metadata, aggregate ratings):

```typescript
async function getProjectWithStale(projectId: string) {
  // Return cached data immediately
  const cached = projectCache.get(projectId);
  if (cached) {
    // Revalidate in background
    revalidateProject(projectId);
    return cached;
  }
  // No cache — fetch fresh
  return await fetchProject(projectId);
}
```

## Bundle Size Analysis

### Running Bundle Analysis

```bash
cd dongle

# Analyze bundle size
ANALYZE=true npm run build

# This opens an interactive treemap in the browser
```

### Key Metrics to Watch

| Metric | Target | Action if exceeded |
|--------|--------|-------------------|
| First Load JS (shared) | < 100KB | Check for duplicate dependencies |
| Page-specific JS | < 50KB | Lazy-load heavy components |
| Total JS per page | < 200KB | Code-split more aggressively |
| CSS | < 30KB | Purge unused Tailwind classes |

### Common Bundle Bloat Sources

1. **`stellar-sdk`** — Use lazy loading (see above)
2. **Moment.js / date-fns** — Use `date-fns` with tree-shaking
3. **Entire lodash** — Import specific functions: `import debounce from "lodash/debounce"`
4. **Icon libraries** — Import only used icons, not entire packs

## Monitoring and Metrics

### Core Web Vitals

Track these metrics in production:

| Metric | What it Measures | Target |
|--------|-----------------|--------|
| LCP (Largest Contentful Paint) | Main content visible | < 2.5s |
| FID (First Input Delay) | Interactivity | < 100ms |
| CLS (Cumulative Layout Shift) | Visual stability | < 0.1 |

### Adding Performance Monitoring

```typescript
// In a layout or _app component
import { useEffect } from "react";

export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "largest-contentful-paint") {
            console.log("LCP:", entry.startTime);
          }
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      return () => observer.disconnect();
    }
  }, []);
  return null;
}
```

### Transaction Performance

Monitor Soroban transaction timings:

```typescript
// In soroban.service.ts
const start = performance.now();
const result = await server.sendTransaction(signedTx);
const elapsed = performance.now() - start;
console.info(`[SorobanService] sendTransaction took ${elapsed.toFixed(0)}ms`);
```

### Lazy Loading Metrics

Track whether lazy loading is effective:

```typescript
// Check if soroban service was loaded for a page visit
if (!isSorobanServiceLoaded()) {
  // User visited a read-only page — stellar-sdk was NOT loaded
  console.info("Lazy loading saved bundle size for this page visit");
}
```

## Quick Wins

1. **Use `React.memo`** for expensive list renders (project cards, review lists)
2. **Debounce search inputs** — 300ms is a good default
3. **Virtualize long lists** — Use `react-window` for project/review lists > 50 items
4. **Preconnect to RPC** — Add `<link rel="preconnect" href="https://soroban-testnet.stellar.org">` in `<head>`
5. **Cache IPFS responses** — Use a service worker or CDN for IPFS content

## Related Files

| File | Role |
|------|------|
| `dongle/services/stellar/lazy-soroban.service.ts` | Lazy-loaded Soroban service |
| `dongle/services/stellar/lazy-stellar.service.ts` | Lazy-loaded Stellar service |
| `dongle/next.config.ts` | Next.js build configuration |
| `dongle/BUNDLE_ANALYSIS_GUIDE.md` | Bundle analysis instructions |
