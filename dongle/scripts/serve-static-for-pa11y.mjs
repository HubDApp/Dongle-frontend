#!/usr/bin/env node
/**
 * Utility to serve the Next.js output directory for pa11y-ci audit runs.
 *
 * Usage:
 *   node scripts/serve-static-for-pa11y.mjs [port]
 *
 * Spawns a lightweight HTTP server rooted at `./out` (or `./.next/server/app`
 * fallback) and waits until it is reachable on the requested port (default 3000)
 * before returning. Exposes a `child` handle for the caller to tear it down.
 */

import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn, execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const PORT = Number(process.env.PA11Y_PORT || process.argv[2] || 3000);

const STATIC_DIRS = [
  path.join(projectRoot, "out"),
  path.join(projectRoot, ".next", "server", "app"),
  path.join(projectRoot, ".next", "static"),
];

function resolveRoot() {
  for (const dir of STATIC_DIRS) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const filePath = path.normalize(path.join(rootDir, urlPath));

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        const indexFile = path.join(filePath.replace(/index\.html$/, ""), "index.html");
        fs.stat(indexFile, (iErr, iStats) => {
          if (iErr || !iStats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Not found: " + req.url);
          }
          serveFile(indexFile);
        });
        return;
      }
      serveFile(filePath);
    });

    function serveFile(fp) {
      res.writeHead(200, { "Content-Type": mimeFor(fp) });
      fs.createReadStream(fp).pipe(res);
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`[serve-static] pa11y static server on http://127.0.0.1:${PORT} (root: ${rootDir})`);
      resolve(server);
    });
    server.on("error", reject);
  });
}

async function waitForReady(timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
          resolve(res.statusCode);
        });
        req.on("error", reject);
        req.setTimeout(1000, () => req.destroy(new Error("timeout")));
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`Static server on port ${PORT} not reachable after ${timeoutMs}ms`);
}

async function main() {
  const root = resolveRoot();
  if (!root) {
    console.error(
      "[serve-static] No static output directory found. Run `npm run build` first.",
    );
    process.exit(1);
  }
  const server = await startStaticServer(root);
  await waitForReady();
  process.env.__PA11Y_SERVER_PID = String(process.pid);

  process.on("SIGINT", () => server.close(() => process.exit(0)));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export { main as serveStaticForPa11y, waitForReady };
