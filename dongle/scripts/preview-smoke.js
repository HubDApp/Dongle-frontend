#!/usr/bin/env node
/**
 * Lightweight preview/production smoke test.
 *
 * Confirms core Dongle routes render (HTTP 2xx) against PREVIEW_URL.
 *
 * Usage:
 *   PREVIEW_URL=http://localhost:3000 npm run preview:smoke
 *   PREVIEW_URL=https://your-app.vercel.app npm run preview:smoke
 *
 * Optional:
 *   ROUTES=/,/discover   — comma-separated path override
 *   TIMEOUT_MS=15000     — per-request timeout
 */

const DEFAULT_ROUTES = [
  "/",
  "/discover",
  "/listing",
  "/reviews",
  "/verify",
  "/projects/new",
  "/docs",
  "/profile",
  "/compare",
];

function parseRoutes() {
  if (process.env.ROUTES && process.env.ROUTES.trim()) {
    return process.env.ROUTES.split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => (r.startsWith("/") ? r : `/${r}`));
  }
  return DEFAULT_ROUTES;
}

async function checkRoute(baseUrl, route, timeoutMs) {
  const url = new URL(route, baseUrl).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "dongle-preview-smoke/1.0",
      },
    });

    const ok = res.status >= 200 && res.status < 400;
    return { route, url, status: res.status, ok, error: null };
  } catch (err) {
    return {
      route,
      url,
      status: 0,
      ok: false,
      error: err.name === "AbortError" ? "timeout" : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const previewUrl = process.env.PREVIEW_URL || process.env.BASE_URL;
  if (!previewUrl) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║          PREVIEW SMOKE TEST — MISSING URL                    ║
╚══════════════════════════════════════════════════════════════╝

Set PREVIEW_URL (or BASE_URL) to the deployment origin, e.g.:

  PREVIEW_URL=https://your-preview.vercel.app npm run preview:smoke
  PREVIEW_URL=http://localhost:3000 npm run preview:smoke

See dongle/DEPLOYMENT.md.
`);
    process.exit(1);
  }

  let base;
  try {
    base = new URL(previewUrl);
  } catch {
    console.error(`Invalid PREVIEW_URL: ${previewUrl}`);
    process.exit(1);
  }

  // Normalize to origin (strip trailing path)
  const origin = base.origin;
  const timeoutMs = Number(process.env.TIMEOUT_MS || 15000);
  const routes = parseRoutes();

  console.log(`Preview smoke test → ${origin}`);
  console.log(`Routes (${routes.length}): ${routes.join(", ")}\n`);

  const results = [];
  for (const route of routes) {
    const result = await checkRoute(origin, route, timeoutMs);
    results.push(result);
    const mark = result.ok ? "✓" : "✗";
    const detail = result.error
      ? result.error
      : `HTTP ${result.status}`;
    console.log(`  ${mark} ${route.padEnd(20)} ${detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log("");

  if (failed.length > 0) {
    console.error(
      `Preview validation failed: ${failed.length}/${results.length} route(s) did not render.`,
    );
    for (const f of failed) {
      console.error(`  - ${f.route} (${f.url}): ${f.error || `HTTP ${f.status}`}`);
    }
    process.exit(1);
  }

  console.log(
    `✓ Preview validation passed: all ${results.length} main routes rendered.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
