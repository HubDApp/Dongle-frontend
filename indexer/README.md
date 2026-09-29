# Dongle Soroban Event Indexer

Node.js service that polls Soroban RPC for contract events and exposes them via `/api/events`.

## Supported events

- `ProjectRegistered`
- `ProjectUpdated`
- `ReviewSubmitted`
- `VerificationApproved`

## Run locally

```bash
cd indexer
npm install
SOROBAN_CONTRACT_ID=YOUR_CONTRACT npm start
```

## Endpoints

- `GET /health` — service and circuit breaker status
- `GET /api/events` — query indexed events (`eventType`, `limit`, `offset`)
- `POST /api/events/replay` — replay historical events into the store

The Next.js app also exposes `GET /api/events` for client polling when the standalone indexer is not deployed.
