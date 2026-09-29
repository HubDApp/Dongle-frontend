# Bundle Analysis & Performance Budgets Guide

## Overview

This project includes bundle analysis tooling to track and optimize bundle size, identify heavy dependencies, and prevent performance regressions.

## Setup Complete

✅ Bundle analyzer configured  
✅ Performance budgets defined  
✅ Build scripts with analysis enabled  
✅ Heavy dependency identification ready  

## Running Bundle Analysis

### Analyze Production Build

```bash
npm run build:analyze
# or
pnpm build:analyze
```

This will:
1. Create an optimized production build
2. Generate interactive HTML reports for client and server bundles
3. Open reports automatically in your browser

### Output Files

After running analysis, you'll find:
- `.next/analyze/client.html` - Client bundle visualization
- `.next/analyze/server.html` - Server bundle visualization (if applicable)
- `.next/analyze/nodejs.html` - Node.js bundle visualization

## Performance Budgets

### Current Budgets

| Asset Type | Maximum Size (gzipped) | Purpose |
|-----------|------------------------|---------|
| JavaScript chunks | 500 KB | Ensure fast page loads |
| CSS files | 100 KB | Prevent style bloat |

### Checking Against Budgets

```bash
# After build, manually check sizes
npm run build
ls -lh .next/static/chunks/*.js | awk '{print $9, $5}'
```

### Heavy Dependencies to Monitor

Known large dependencies in this project:

1. **stellar-sdk** (~400KB)
   - Core Stellar functionality
   - Consider code-splitting for non-critical paths
   - Use dynamic imports where possible

2. **@stellar/freighter-api** (~50KB)
   - Wallet integration
   - Essential for user interactions
   - Already optimized

3. **Next.js runtime** (~90KB)
   - Framework overhead
   - Automatically optimized by Next.js

## Optimization Strategies

### 1. Code Splitting

Split large features into separate chunks:

```typescript
// Before
import { StellarOperations } from '@/lib/stellar';

// After - dynamic import
const StellarOperations = dynamic(() => 
  import('@/lib/stellar').then(mod => mod.StellarOperations),
  { ssr: false }
);
```

### 2. Lazy Loading Components

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <Spinner />,
  ssr: false, // If component doesn't need SSR
});
```

### 3. Tree Shaking

Ensure imports are specific:

```typescript
// ❌ Bad - imports entire library
import _ from 'lodash';

// ✅ Good - imports only what's needed
import debounce from 'lodash/debounce';
```

### 4. Bundle Analysis Checklist

When analyzing bundles, look for:

- [ ] Duplicate dependencies (same package included multiple times)
- [ ] Unused exports (imports that aren't actually used)
- [ ] Heavy third-party libraries (>100KB)
- [ ] Moment.js (replace with date-fns or native Date)
- [ ] Large icon libraries (use selective imports)
- [ ] Development code in production builds

## Interpreting Bundle Analyzer Results

### Interactive Visualization

The analyzer shows:
- **Rectangle size** = File size in bundle
- **Color coding** = Different modules/dependencies
- **Hover** = See exact sizes and percentages
- **Click** = Drill down into nested modules

### Common Issues

#### Issue: "stellar-sdk is 400KB"
**Solution**: This is expected for blockchain apps. Ensure it's code-split for non-critical pages.

#### Issue: "Multiple React versions"
**Solution**: Check `package.json` for conflicting dependencies. Run `npm dedupe`.

#### Issue: "Large CSS file"
**Solution**: Check for unused Tailwind classes. Enable PurgeCSS in production.

## CI Integration

### GitHub Actions Example

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main]

jobs:
  check-bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - name: Check bundle sizes
        run: |
          # Add your bundle size checking script here
          # Could use bundlewatch, size-limit, or custom script
```

## Performance Targets

### Initial Page Load

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| First Contentful Paint | < 1.8s | TBD | ⏳ |
| Largest Contentful Paint | < 2.5s | TBD | ⏳ |
| Time to Interactive | < 3.8s | TBD | ⏳ |
| Total Blocking Time | < 300ms | TBD | ⏳ |
| Cumulative Layout Shift | < 0.1 | TBD | ⏳ |

### Bundle Size Targets

| Page | JavaScript (gzipped) | Target |
|------|---------------------|--------|
| Home | TBD | < 150 KB |
| Discover | TBD | < 200 KB |
| Project Detail | TBD | < 180 KB |
| Reviews | TBD | < 160 KB |
| Admin | TBD | < 250 KB |

## Measuring Performance

### Local Testing

```bash
# Build for production
npm run build

# Serve production build
npm start

# Open Lighthouse in Chrome DevTools
# Navigate to page
# Run audit
```

### Key Lighthouse Metrics

- Performance Score (target: 90+)
- First Contentful Paint
- Speed Index
- Largest Contentful Paint
- Time to Interactive
- Total Blocking Time

## Automated Bundle Reports

### Setup Bundlewatch (Optional)

```bash
npm install --save-dev bundlewatch
```

Add to `package.json`:

```json
{
  "scripts": {
    "bundlewatch": "bundlewatch"
  }
}
```

## Heavy Dependency Report

Run this command to see largest dependencies:

```bash
npm ls --depth=0 --json | jq '.dependencies | to_entries | sort_by(.value.resolved // "" | length) | reverse | .[0:10] | from_entries'
```

Or check using:

```bash
npx webpack-bundle-analyzer .next/analyze/client.html
```

## Next Steps

1. **Establish Baseline**
   - Run `npm run build:analyze` to see current state
   - Document current bundle sizes in this file

2. **Set CI Checks**
   - Add bundle size checks to PR workflow
   - Block PRs that increase bundle size >10% without justification

3. **Regular Audits**
   - Monthly bundle analysis review
   - Quarterly dependency audit
   - Update performance budgets as needed

4. **Monitor Production**
   - Use Real User Monitoring (RUM) tools
   - Track Core Web Vitals
   - Set up alerts for performance regressions

## Resources

- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Web.dev Performance Guide](https://web.dev/fast/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse)
- [BundleWatch](https://github.com/bundlewatch/bundlewatch)
- [webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)

## Troubleshooting

### Analysis not working?

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Try again
npm run build:analyze
```

### Bundle too large?

1. Check for duplicate dependencies: `npm dedupe`
2. Remove unused dependencies: `npm prune`
3. Update to latest versions (may have size optimizations)
4. Consider alternatives to heavy libraries

### Type errors during build?

```bash
# Run type check separately
npm run typecheck

# Fix errors before running build
```
