#!/usr/bin/env node
/**
 * Enforces the per-file gzip limits in .bundlewatch.config.json against `.next/`.
 *
 * Usage: node scripts/check-bundlewatch-limits.mjs [--out sizes.json] [--base base-sizes.json]
 * Writes a per-bundle table to $GITHUB_STEP_SUMMARY when set.
 * With --base, also fails if any pattern's total grew more than 10% versus the base sizes.
 */

import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const GROWTH_LIMIT = 0.1;

const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const toBytes = (size) => {
  const m = /^([\d.]+)\s*(b|kb|mb)?$/i.exec(String(size).trim());
  if (!m) throw new Error(`Unrecognised size "${size}"`);
  const unit = (m[2] || "b").toLowerCase();
  return Math.round(Number(m[1]) * (unit === "mb" ? 1024 * 1024 : unit === "kb" ? 1024 : 1));
};

const globToRegExp = (glob) =>
  new RegExp(
    "^" +
      glob
        .split("**/")
        .map((part) => part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
        .join("(?:.*/)?") +
      "$",
  );

const listFiles = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
};

const kb = (bytes) => (bytes / 1024).toFixed(2);

const config = JSON.parse(readFileSync(join(ROOT, ".bundlewatch.config.json"), "utf8"));
if (!existsSync(join(ROOT, ".next"))) {
  console.error("No .next build found. Run `npm run build` first.");
  process.exit(1);
}

const allFiles = listFiles(join(ROOT, ".next", "static")).map((f) => relative(ROOT, f).split(sep).join("/"));
const basePath = argValue("--base");
const base = basePath && existsSync(basePath) ? JSON.parse(readFileSync(basePath, "utf8")) : null;

const sizes = {};
const rows = [];
const totals = [];
let failed = false;

for (const entry of config.files) {
  const pattern = globToRegExp(entry.path);
  const limit = toBytes(entry.maxSize);
  const matches = allFiles.filter((f) => pattern.test(f));
  if (matches.length === 0) {
    console.warn(`No files matched ${entry.path}`);
    continue;
  }
  let total = 0;
  for (const file of matches) {
    const buf = readFileSync(join(ROOT, file));
    const size = entry.compression === "none" ? buf.length : gzipSync(buf).length;
    total += size;
    const overLimit = size > limit;
    if (overLimit) failed = true;
    rows.push({ file, size, limit, status: overLimit ? "FAIL" : "PASS" });
  }
  // File names are content-hashed, so growth is tracked per pattern total.
  sizes[entry.path] = total;
  const prev = base?.[entry.path];
  const growth = prev ? (total - prev) / prev : 0;
  const overGrowth = growth > GROWTH_LIMIT;
  if (overGrowth) failed = true;
  totals.push({ path: entry.path, total, prev, growth, status: overGrowth ? "FAIL (>10% growth)" : "PASS" });
}

rows.sort((a, b) => b.size - a.size);
for (const r of rows) {
  console.log(`${r.status.padEnd(6)} ${kb(r.size).padStart(9)} KB / ${kb(r.limit)} KB  ${r.file}`);
}
for (const t of totals) {
  console.log(`${t.status.padEnd(18)} total ${kb(t.total)} KB${t.prev ? ` (base ${kb(t.prev)} KB)` : ""}  ${t.path}`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    "### Bundle sizes (gzip)",
    "",
    "| Pattern | Total KB | Base KB | Change | Status |",
    "|---------|---------:|--------:|-------:|--------|",
    ...totals.map(
      (t) =>
        `| \`${t.path}\` | ${kb(t.total)} | ${t.prev ? kb(t.prev) : "-"} | ${
          t.prev ? `${(t.growth * 100).toFixed(1)}%` : "-"
        } | ${t.status} |`,
    ),
    "",
    "| File | Size KB | Limit KB | Status |",
    "|------|--------:|---------:|--------|",
    ...rows.map((r) => `| \`${r.file}\` | ${kb(r.size)} | ${kb(r.limit)} | ${r.status} |`),
    "",
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
}

const out = argValue("--out");
if (out) writeFileSync(out, JSON.stringify(sizes, null, 2));

if (failed) {
  console.error("Bundle size check failed.");
  process.exit(1);
}
console.log("All bundles are within limits.");
