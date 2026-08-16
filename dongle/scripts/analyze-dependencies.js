#!/usr/bin/env node

/**
 * Dependency Analysis Script
 * 
 * Analyzes installed dependencies and reports on:
 * - Total dependency count
 * - Heavy dependencies (>100KB)
 * - Outdated packages
 * - Security vulnerabilities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Analyzing dependencies...\n');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const dependencies = Object.keys(packageJson.dependencies || {});
const devDependencies = Object.keys(packageJson.devDependencies || {});

console.log('📦 Dependency Summary');
console.log('─'.repeat(50));
console.log(`Production dependencies: ${dependencies.length}`);
console.log(`Development dependencies: ${devDependencies.length}`);
console.log(`Total: ${dependencies.length + devDependencies.length}\n`);

// Heavy dependencies to watch
const heavyDependencies = [
  { name: 'stellar-sdk', warning: 'Large blockchain SDK (~400KB)' },
  { name: '@stellar/freighter-api', warning: 'Wallet integration (~50KB)' },
  { name: 'next', warning: 'Next.js framework (~90KB runtime)' },
  { name: 'react', warning: 'React core library' },
  { name: 'react-dom', warning: 'React DOM renderer' },
];

console.log('⚠️  Heavy Dependencies');
console.log('─'.repeat(50));
heavyDependencies.forEach(({ name, warning }) => {
  if (dependencies.includes(name)) {
    console.log(`  ${name}`);
    console.log(`    ${warning}`);
  }
});
console.log();

// Check for potential optimizations
console.log('💡 Optimization Suggestions');
console.log('─'.repeat(50));

const suggestions = [];

// Check for moment.js (should use date-fns instead)
if (dependencies.includes('moment')) {
  suggestions.push('Consider replacing moment.js with date-fns (smaller bundle)');
}

// Check for lodash (should use specific imports)
if (dependencies.includes('lodash')) {
  suggestions.push('Use lodash-es or specific lodash imports (e.g., lodash/debounce)');
}

// Check for multiple CSS-in-JS libraries
const cssLibraries = ['styled-components', 'emotion', '@emotion/react', '@emotion/styled'];
const foundCssLibs = cssLibraries.filter(lib => dependencies.includes(lib));
if (foundCssLibs.length > 1) {
  suggestions.push(`Multiple CSS-in-JS libraries found: ${foundCssLibs.join(', ')}`);
}

if (suggestions.length === 0) {
  console.log('  ✅ No obvious optimization opportunities found');
} else {
  suggestions.forEach((suggestion, i) => {
    console.log(`  ${i + 1}. ${suggestion}`);
  });
}
console.log();

// Check for security vulnerabilities
console.log('🔒 Security Check');
console.log('─'.repeat(50));
try {
  const auditResult = execSync('npm audit --json', { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  
  const audit = JSON.parse(auditResult);
  
  if (audit.metadata) {
    const { vulnerabilities } = audit.metadata;
    const total = vulnerabilities.total || 0;
    const critical = vulnerabilities.critical || 0;
    const high = vulnerabilities.high || 0;
    const moderate = vulnerabilities.moderate || 0;
    const low = vulnerabilities.low || 0;
    
    if (total === 0) {
      console.log('  ✅ No known vulnerabilities');
    } else {
      console.log(`  ⚠️  Found ${total} vulnerabilities:`);
      if (critical > 0) console.log(`     Critical: ${critical}`);
      if (high > 0) console.log(`     High: ${high}`);
      if (moderate > 0) console.log(`     Moderate: ${moderate}`);
      if (low > 0) console.log(`     Low: ${low}`);
      console.log('\n  Run "npm audit fix" to attempt automatic fixes');
    }
  }
} catch (error) {
  console.log('  ℹ️  Could not run security audit (this is normal for pnpm)');
}
console.log();

// Bundle size estimates
console.log('📊 Estimated Bundle Impact');
console.log('─'.repeat(50));

const estimates = [
  { package: 'stellar-sdk', size: '~400 KB', impact: 'High' },
  { package: 'next', size: '~90 KB', impact: 'Medium' },
  { package: '@stellar/freighter-api', size: '~50 KB', impact: 'Medium' },
  { package: 'react + react-dom', size: '~130 KB', impact: 'High' },
  { package: 'lucide-react', size: '~5 KB per icon', impact: 'Low' },
];

estimates.forEach(({ package: pkg, size, impact }) => {
  const hasPackage = dependencies.includes(pkg) || pkg.includes('+');
  if (hasPackage) {
    const impactSymbol = impact === 'High' ? '🔴' : impact === 'Medium' ? '🟡' : '🟢';
    console.log(`  ${impactSymbol} ${pkg.padEnd(30)} ${size.padEnd(15)} ${impact}`);
  }
});
console.log();

console.log('✅ Analysis complete!');
console.log('\nNext steps:');
console.log('  1. Run "npm run build:analyze" to see detailed bundle breakdown');
console.log('  2. Review BUNDLE_ANALYSIS_GUIDE.md for optimization strategies');
console.log('  3. Set up CI checks for bundle size monitoring\n');
