/**
 * Simulate 100 concurrent notification clients against a local SSE server.
 *
 * Usage (from dongle/):
 *   node scripts/notification-load-test.mjs
 *
 * Optional:
 *   NOTIFY_SSE_URL=http://localhost:3000/api/notifications/stream node scripts/notification-load-test.mjs
 *
 * When NOTIFY_SSE_URL is unset, the script starts an in-process mock SSE
 * server so the test does not require 100 production users.
 */

import http from "node:http";

const TARGET = process.env.NOTIFY_SSE_URL;
const CLIENTS = Number(process.env.NOTIFY_CLIENTS ?? 100);

function startMockServer() {
  /** @type {Set<import('node:http').ServerResponse>} */
  const clients = new Set();
  const server = http.createServer((req, res) => {
    if (req.url === "/stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (req.url === "/broadcast" && req.method === "POST") {
      const payload = JSON.stringify({
        id: "load-test",
        type: "project_verified",
        recipientId: "load",
        createdAt: new Date().toISOString(),
        projectName: "Load",
      });
      for (const client of clients) {
        client.write(`event: notification\ndata: ${payload}\n\n`);
      }
      res.writeHead(200);
      res.end(JSON.stringify({ sent: clients.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, port, clients });
    });
  });
}

async function readFirstEvent(url) {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to connect ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    if (buffer.includes("event: notification")) {
      reader.releaseLock();
      return true;
    }
  }
  return false;
}

async function main() {
  let url = TARGET;
  let mock;
  if (!url) {
    mock = await startMockServer();
    url = `http://127.0.0.1:${mock.port}/stream`;
  }

  const connections = Array.from({ length: CLIENTS }, () => readFirstEvent(url));
  await new Promise((r) => setTimeout(r, 300));

  if (mock) {
    await fetch(`http://127.0.0.1:${mock.port}/broadcast`, { method: "POST" });
  } else {
    console.log("Waiting for a live event on", url);
  }

  const results = await Promise.allSettled(connections);
  const ok = results.filter((r) => r.status === "fulfilled" && r.value).length;
  console.log(`Received notifications: ${ok}/${CLIENTS}`);
  mock?.server.close();
  if (ok < CLIENTS) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
