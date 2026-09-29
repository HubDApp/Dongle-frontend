/**
 * Standalone Soroban event indexer service.
 * Polls RPC for contract events and exposes them via /api/events.
 *
 * Environment:
 * - PORT (default 4000)
 * - SOROBAN_RPC_URL
 * - SOROBAN_CONTRACT_ID
 * - DONGLE_EVENTS_API (optional upstream to sync with Next.js API)
 */

const express = require("express");

const PORT = Number(process.env.PORT || 4000);
const RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.SOROBAN_CONTRACT_ID || "CDEMOCONTRACT000000000000000000000";

const EVENT_TYPES = [
  "ProjectRegistered",
  "ProjectUpdated",
  "ReviewSubmitted",
  "VerificationApproved",
];

const events = [];
let lastLedger = 0;
let failureCount = 0;
let circuitOpenUntil = 0;

function circuitOpen() {
  return Date.now() < circuitOpenUntil;
}

function recordFailure() {
  failureCount += 1;
  if (failureCount >= 5) {
    circuitOpenUntil = Date.now() + 30_000;
  }
}

function recordSuccess() {
  failureCount = 0;
  circuitOpenUntil = 0;
}

async function pollRpc() {
  if (circuitOpen()) return;

  try {
    const url = `${RPC_URL}/events?contract=${encodeURIComponent(CONTRACT_ID)}&from=${lastLedger}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`RPC ${response.status}`);
    const body = await response.json();
    const incoming = (body.events || []).filter((e) => EVENT_TYPES.includes(e.type));

    for (const event of incoming) {
      events.push({
        id: crypto.randomUUID(),
        eventType: event.type,
        contractId: CONTRACT_ID,
        ledger: event.ledger,
        txHash: event.txHash,
        payload: event.payload || {},
        indexedAt: new Date().toISOString(),
      });
      lastLedger = Math.max(lastLedger, event.ledger);
    }

    recordSuccess();
  } catch {
    recordFailure();
  }
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: !circuitOpen(),
    circuitOpen: circuitOpen(),
    indexedEvents: events.length,
    lastLedger,
  });
});

app.get("/api/events", (req, res) => {
  const eventType = req.query.eventType;
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);

  let result = [...events];
  if (eventType) {
    result = result.filter((e) => e.eventType === eventType);
  }

  result.sort((a, b) => b.ledger - a.ledger);
  res.json({
    success: true,
    total: result.length,
    events: result.slice(offset, offset + limit),
  });
});

app.post("/api/events/replay", (req, res) => {
  const historical = req.body?.historical;
  if (!Array.isArray(historical)) {
    return res.status(400).json({ success: false, error: "historical array required" });
  }

  for (const item of historical) {
    events.push({
      id: crypto.randomUUID(),
      eventType: item.eventType,
      contractId: item.contractId || CONTRACT_ID,
      ledger: item.ledger,
      txHash: item.txHash,
      payload: item.payload || {},
      indexedAt: new Date().toISOString(),
    });
  }

  res.json({ success: true, count: historical.length });
});

setInterval(() => {
  void pollRpc();
}, 5000);

app.listen(PORT, () => {
  console.log(`Dongle Soroban indexer listening on :${PORT}`);
});
