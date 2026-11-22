/**
 * i18n check script
 *
 * Compares es.ts and pt.ts against en.ts to find missing/unused keys,
 * generates a coverage report, and flags machine-translated keys.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const I18N_DIR = path.join(process.cwd(), 'dongle', 'lib', 'i18n', 'messages');
const APP_DIR = path.join(process.cwd(), 'dongle');

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value, newPrefix));
    } else {
      keys.push(newPrefix);
    }
  }
  return keys;
}

/**
 * Basic grep-like search for keys in the codebase.
 * This is a simple implementation and might have false positives/negatives.
 */
function findUnusedKeys(keys, directory) {
  const unused = new Set(keys);
  const files = getAllFiles(directory, ['.ts', '.tsx']);

  for (const file of files) {
    if (file.includes('lib/i18n/messages')) continue; // Skip translation files themselves
    const content = fs.readFileSync(file, 'utf8');
    for (const key of unused) {
      // Look for t("key") or t('key') or t(`key`) or key: "..."
      const escapedKey = key.replace(/\./g, '\\.');
      const regex = new RegExp(`["'\`]${escapedKey}["'\`]`, 'g');
      if (regex.test(content)) {
        unused.delete(key);
      }
    }
    if (unused.size === 0) break;
  }
  return Array.from(unused);
}

function getAllFiles(dirPath, extensions, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        arrayOfFiles = getAllFiles(fullPath, extensions, arrayOfFiles);
      }
    } else {
      if (extensions.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

async function runCheck() {
  console.log(`${colors.bold}${colors.blue}Dongle i18n Check${colors.reset}\n`);

  // Load English as source
  const { en } = require(path.join(I18N_DIR, 'en.ts'));
  const enKeys = flattenKeys(en);
  const totalEnKeys = enKeys.length;

  console.log(`Source Locale: ${colors.bold}en${colors.reset} (${totalEnKeys} keys)\n`);

  const locales = ['es', 'pt'];
  let exitCode = 0;
  const coverageReport = [];

  for (const locale of locales) {
    const localeFile = path.join(I18N_DIR, `${locale}.ts`);
    if (!fs.existsSync(localeFile)) {
      console.log(`${colors.red}Error: Locale file not found for ${locale}${colors.reset}`);
      exitCode = 1;
      continue;
    }

    const localeModule = require(localeFile);
    const localeObj = localeModule[locale];
    const localeKeys = new Set(flattenKeys(localeObj));

    const missingKeys = enKeys.filter(key => !localeKeys.has(key));
    const extraKeys = Array.from(localeKeys).filter(key => !enKeys.includes(key));
    
    // Check for machine-translated markers (placeholder logic)
    // In this implementation, we look for a specific comment pattern or prefix if desired.
    // For now, let's just count them if we find any "TODO" or "MACHINE" strings in values.
    const machineTranslated = [];
    const checkMachine = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string' && (value.includes('[MT]') || value.includes('TODO:'))) {
          machineTranslated.push(newPrefix);
        } else if (value && typeof value === 'object') {
          checkMachine(value, newPrefix);
        }
      }
    };
    checkMachine(localeObj);

    const translatedCount = totalEnKeys - missingKeys.length;
    const coverage = ((translatedCount / totalEnKeys) * 100).toFixed(1);
    coverageReport.push({ locale, coverage, missing: missingKeys.length });

    console.log(`${colors.bold}${colors.cyan}Locale: ${locale}${colors.reset}`);
    console.log(`Coverage: ${coverage}% (${translatedCount}/${totalEnKeys})`);

    if (missingKeys.length > 0) {
      console.log(`${colors.red}Missing keys (${missingKeys.length}):${colors.reset}`);
      missingKeys.forEach(key => console.log(`  - ${key}`));
      exitCode = 1;
    } else {
      console.log(`${colors.green}No missing keys!${colors.reset}`);
    }

    if (extraKeys.length > 0) {
      console.log(`${colors.yellow}Extra keys in ${locale} (not in en):${colors.reset}`);
      extraKeys.forEach(key => console.log(`  - ${key}`));
    }

    if (machineTranslated.length > 0) {
      console.log(`${colors.yellow}Machine-translated or TODO keys (${machineTranslated.length}):${colors.reset}`);
      machineTranslated.forEach(key => console.log(`  - ${key}`));
    }
    console.log('');
  }

  // Check for unused keys in English (source)
  console.log(`${colors.bold}${colors.blue}Checking for unused keys in codebase...${colors.reset}`);
  const unusedKeys = findUnusedKeys(enKeys, APP_DIR);
  if (unusedKeys.length > 0) {
    console.log(`${colors.yellow}Possibly unused keys in en.ts (${unusedKeys.length}):${colors.reset}`);
    unusedKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`${colors.yellow}Note: Dynamic keys or keys used in tests might be flagged as unused.${colors.reset}`);
  } else {
    console.log(`${colors.green}No unused keys found!${colors.reset}`);
  }

  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  coverageReport.forEach(report => {
    const color = parseFloat(report.coverage) === 100 ? colors.green : colors.yellow;
    console.log(`- ${report.locale}: ${color}${report.coverage}%${colors.reset} translated (${report.missing} missing)`);
  });

  if (exitCode !== 0) {
    console.log(`\n${colors.red}${colors.bold}CI Check Failed: Some translations are missing.${colors.reset}`);
    process.exit(exitCode);
  } else {
    console.log(`\n${colors.green}${colors.bold}CI Check Passed!${colors.reset}`);
  }
}

runCheck();
