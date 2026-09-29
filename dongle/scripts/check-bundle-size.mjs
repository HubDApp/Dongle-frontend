#!/usr/bin/env node
/**
 * Measures gzipped first-load JS per critical route from a Next.js production build.
 *
 * Usage: node scripts/check-bundle-size.mjs
 * Requires: `npm run build` to have produced `.next/`.
 *
 * Budget: each listed route must stay under 200 KB gzipped (see performance-budget.json).
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const NEXT_DIR = join(ROOT, ".next");
const BUDGET_PATH = join(ROOT, "performance-budget.json");

const ROUTE_TO_MANIFEST_KEY = {
  "/": "/page",
  "/discover": "/discover/page",
  "/projects/new": "/projects/new/page",
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function gzipSizeBytes(filePath) {
  const buf = readFileSync(filePath);
  return gzipSync(buf).length;
}

function collectFilesForRoute(manifestKey, appBuildManifest, buildManifest) {
  const files = new Set();

  const pageFiles = appBuildManifest?.pages?.[manifestKey];
  if (Array.isArray(pageFiles)) {
    for (const file of pageFiles) files.add(file);
  }

  // Shared app-router runtime (framework + main-app)
  const rootMain = buildManifest?.rootMainFiles;
  if (Array.isArray(rootMain)) {
    for (const file of rootMain) files.add(file);
  }

  const polyfills = buildManifest?.polyfillFiles;
  if (Array.isArray(polyfills)) {
    for (const file of polyfills) files.add(file);
  }

  return [...files].filter((file) => file.endsWith(".js") && !file.includes(".map"));
}

function resolveStaticFile(relativePath) {
  const candidates = [
    join(NEXT_DIR, relativePath),
    join(NEXT_DIR, "static", relativePath.replace(/^static\//, "")),
  ];
  return candidates.find((p) => existsSync(p));
}

function formatKb(bytes) {
  return (bytes / 1024).toFixed(2);
}

function main() {
  if (!existsSync(NEXT_DIR)) {
    console.error("No .next build found. Run `npm run build` first.");
    process.exit(1);
  }

  const appManifestPath = join(NEXT_DIR, "app-build-manifest.json");
  const buildManifestPath = join(NEXT_DIR, "build-manifest.json");

  if (!existsSync(appManifestPath) || !existsSync(buildManifestPath)) {
    console.error("Missing Next.js build manifests (app-build-manifest.json / build-manifest.json).");
    process.exit(1);
  }

  const budget = readJson(BUDGET_PATH);
  const appBuildManifest = readJson(appManifestPath);
  const buildManifest = readJson(buildManifestPath);

  const rows = [];
  let failed = false;

  for (const [route, limits] of Object.entries(budget.routes)) {
    const manifestKey = ROUTE_TO_MANIFEST_KEY[route];
    if (!manifestKey) {
      console.error(`No manifest mapping for route ${route}`);
      failed = true;
      continue;
    }

    const files = collectFilesForRoute(manifestKey, appBuildManifest, buildManifest);
    if (files.length === 0) {
      console.error(`No JS files found for ${route} (${manifestKey}). Is the route in the build?`);
      failed = true;
      continue;
    }

    let totalGzip = 0;
    let missing = 0;
    for (const file of files) {
      const abs = resolveStaticFile(file);
      if (!abs) {
        missing += 1;
        continue;
      }
      totalGzip += gzipSizeBytes(abs);
    }

    const maxBytes = limits.maxGzippedJsKb * 1024;
    const over = totalGzip > maxBytes;
    if (over) failed = true;

    rows.push({
      route,
      files: files.length - missing,
      gzipKb: formatKb(totalGzip),
      budgetKb: limits.maxGzippedJsKb,
      status: over ? "FAIL" : "PASS",
    });
  }

  console.log("\nBundle size per route (gzipped first-load JS)\n");
  console.log(
    "Route".padEnd(20),
    "Files".padStart(6),
    "Gzip KB".padStart(10),
    "Budget".padStart(10),
    "Status".padStart(8),
  );
  console.log("-".repeat(58));
  for (const row of rows) {
    console.log(
      row.route.padEnd(20),
      String(row.files).padStart(6),
      row.gzipKb.padStart(10),
      String(row.budgetKb).padStart(10),
      row.status.padStart(8),
    );
  }
  console.log("");

  if (failed) {
    console.error("Performance budget failed: one or more routes exceed 200 KB gzipped JS.");
    process.exit(1);
  }

  console.log("All critical routes are within the 200 KB gzipped JS budget.");
}

main();
