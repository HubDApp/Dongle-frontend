# Dongle — Local Development Stack

Docker Compose environment that gives you a fully-local Stellar testnet, IPFS node, Redis, and PostgreSQL — no SDF endpoints, no external accounts required.

```
┌──────────────────────────────────────────────────────────────┐
│                    Dongle local-dev stack                    │
│                                                              │
│  stellar/quickstart     ipfs/kubo        redis:7    postgres:16 │
│  (standalone + Soroban) (IPFS + gateway) (cache)   (future db)  │
│                                                              │
│  Horizon    :8000       API    :5001      :6379      :5432   │
│  Soroban RPC:8001       Gateway:8080                         │
│  Friendbot  :8002                                            │
└──────────────────────────────────────────────────────────────┘
```

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop / Engine | ≥ 24 | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose v2 | bundled with Docker Desktop | — |
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org/) |
| make | any | pre-installed on macOS/Linux; Windows: use Git Bash or WSL |

> **Windows users:** run all `make` commands inside **Git Bash** or **WSL 2**. Docker Desktop must be running.

## Quick Start

```bash
# 1 — Clone and enter the repo
git clone https://github.com/HubDApp/Dongle-frontend.git
cd Dongle-frontend/local-dev

# 2 — Copy and review environment defaults
cp .env.example .env

# 3 — Pull images and start all services
make start

# 4 — Deploy contracts + seed test data
make seed

# 5 — Start the Next.js app
cd ../dongle
npm run dev
# → http://localhost:3000
```

That's it. The seed step writes `dongle/.env.local` automatically, pointing the app at the local stack.

## Make Targets

| Command | What it does |
|---------|-------------|
| `make start` | Pull latest images and start all services detached. Waits for all health checks to pass before returning. |
| `make stop` | Stop containers. **Volumes are preserved** — data survives a restart. |
| `make restart` | `stop` then `start` |
| `make seed` | Fund test accounts, upload assets to IPFS, insert seed rows into PostgreSQL, prime Redis, write `dongle/.env.local` |
| `make clean` | Stop containers **and delete all volumes** (full wipe) |
| `make logs` | Tail all service logs (Ctrl+C to stop) |
| `make status` | Show container health and port mappings |
| `make shell SERVICE=stellar` | Open a shell inside a running container |
| `make reset` | `clean` → `start` → `seed` (full rebuild from scratch) |

## Services

### Stellar Quickstart (`stellar/quickstart:latest`)

Runs a fully local, standalone Stellar network with:
- **Horizon API** — `http://localhost:8000`
- **Soroban RPC** — `http://localhost:8001`
- **Friendbot** — `http://localhost:8002/friendbot?addr=<G...>`

The standalone network uses the passphrase `Standalone Network ; February 2017`. Configure Freighter to use a **Custom** network with the Soroban RPC URL set to `http://localhost:8001`.

**Fund an account manually:**
```bash
curl "http://localhost:8002/friendbot?addr=<YOUR_G_ADDRESS>"
```

**Check an account balance:**
```bash
curl http://localhost:8000/accounts/<YOUR_G_ADDRESS> | jq .balances
```

### IPFS Kubo (`ipfs/kubo:v0.29.0`)

A local IPFS node with:
- **HTTP API** — `http://localhost:5001` (add/cat/pin files)
- **Gateway** — `http://localhost:8080/ipfs/<CID>` (fetch content by CID)

**Add a file:**
```bash
curl -X POST "http://localhost:5001/api/v0/add" \
     -F file=@./my-file.json
# → { "Hash": "Qm...", "Size": "..." }
```

**Fetch a file via gateway:**
```bash
curl http://localhost:8080/ipfs/<CID>
```

### Redis 7 (`redis:7.2-alpine`)

Available at `localhost:6379`. Used by the Dongle app for:
- Notification pub/sub (multi-instance deployments)
- Rate-limit counters
- Analytics daily cache

**Connect with redis-cli:**
```bash
docker exec -it dongle-redis redis-cli -a dongle_dev_redis
```

### PostgreSQL 16 (`postgres:16-alpine`)

Available at `localhost:5432`. Reserved for the future backend persistence layer.

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `dongle_dev` |
| User | `dongle` |
| Password | `dongle_dev_pass` |
| Connection string | `postgresql://dongle:dongle_dev_pass@localhost:5432/dongle_dev` |

Schema is auto-created by `init-scripts/postgres/01-schema.sql` on first start.

**Open psql:**
```bash
docker exec -it dongle-postgres psql -U dongle -d dongle_dev
```

## Environment Variables

All service configuration lives in `local-dev/.env` (copy from `.env.example`).

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `dongle` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `dongle_dev_pass` | PostgreSQL password |
| `POSTGRES_DB` | `dongle_dev` | PostgreSQL database name |
| `DATABASE_URL` | (derived) | Full PostgreSQL connection string |
| `REDIS_PASSWORD` | `dongle_dev_redis` | Redis password |
| `REDIS_URL` | (derived) | Full Redis URL |
| `STELLAR_HORIZON_URL` | `http://localhost:8000` | Horizon REST API base URL |
| `SOROBAN_RPC_URL` | `http://localhost:8001` | Soroban JSON-RPC URL |
| `STELLAR_NETWORK_PASSPHRASE` | `Standalone Network ; February 2017` | Local network passphrase |
| `STELLAR_FRIENDBOT_URL` | `http://localhost:8002/friendbot` | Friendbot endpoint |
| `IPFS_API_URL` | `http://localhost:5001` | IPFS HTTP API base URL |
| `IPFS_GATEWAY_URL` | `http://localhost:8080` | IPFS public gateway base URL |
| `SEED_ADMIN_SECRET` | (test key) | **TEST-ONLY** admin wallet secret |
| `SEED_USER1_SECRET` | (test key) | **TEST-ONLY** user1 wallet secret |
| `SEED_USER2_SECRET` | (test key) | **TEST-ONLY** user2 wallet secret |

> ⚠️ **The seed secret keys are for local development only.** They are committed intentionally so new contributors can start immediately. Never use them on testnet or mainnet.

## Seed Data

`make seed` runs `scripts/seed.mjs` which:

1. **Funds 3 accounts** via local Friendbot: `admin`, `user1`, `user2`
2. **Uploads assets to IPFS**: project logos (SVG), mock verification evidence (JSON)
3. **Inserts PostgreSQL rows**: 3 projects, 3 reviews, 2 verification requests
4. **Primes Redis**: rate-limit and analytics cache keys
5. **Writes `dongle/.env.local`**: points the Next.js app at the local stack (only if the file doesn't already exist)

Re-running `make seed` is idempotent — existing rows are skipped (`ON CONFLICT DO NOTHING`).

## Connecting Freighter to the Local Network

1. Open Freighter → Settings → Network → **Add Custom Network**
2. Set:
   - **Network Name:** `Dongle Local`
   - **Network URL:** `http://localhost:8001`
   - **Passphrase:** `Standalone Network ; February 2017`
   - **Horizon URL:** `http://localhost:8000`
3. Switch to `Dongle Local`
4. Import one of the seed secret keys (see `local-dev/.env.example`) or create a new account and fund it via Friendbot

## Deploying Contracts Locally

Once the stack is running, deploy Soroban contracts using the Stellar CLI:

```bash
# Install stellar CLI if not present
cargo install stellar-cli --features opt

# Deploy the project registry (example — adapt paths to your contract WASM)
stellar contract deploy \
  --wasm path/to/project_registry.wasm \
  --source admin \
  --rpc-url http://localhost:8001 \
  --network-passphrase "Standalone Network ; February 2017"
# → Outputs a contract ID: C...

# Update dongle/.env.local with the real contract ID
# NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT=C<55 chars>
```

## Troubleshooting

### Stellar Quickstart is slow to become healthy

The `stellar/quickstart` image downloads Stellar Core and applies any necessary migrations on first start. This can take 1–3 minutes. Watch progress with:
```bash
docker logs -f dongle-stellar
```

### IPFS API returns 403

The Kubo daemon may require CORS configuration. Apply it after start:
```bash
docker exec dongle-ipfs ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
docker exec dongle-ipfs ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT","POST","GET"]'
docker restart dongle-ipfs
```

### Port already in use

Check which process is using the conflicting port:
```bash
# macOS / Linux
lsof -i :<PORT>

# Windows (PowerShell)
netstat -ano | findstr :<PORT>
```

Then either stop that process or change the host port in `docker-compose.yml`.

### `make seed` fails with "pg not installed"

The seed script uses optional peer dependencies. Install them from `local-dev/`:
```bash
npm install pg redis
```

### Reset everything and start fresh

```bash
make reset   # = make clean + make start + make seed
```

## Health Check Endpoints

| Service | Endpoint | Expected |
|---------|----------|---------|
| Stellar Horizon | `http://localhost:8000/` | `200 OK` JSON |
| Soroban RPC | `http://localhost:8001/` | `200 OK` |
| IPFS API | `http://localhost:5001/api/v0/id` | `200 OK` JSON |
| Redis | `redis-cli ping` | `PONG` |
| PostgreSQL | `pg_isready` | exit code 0 |

Check all at once:
```bash
make status
```

## File Structure

```
local-dev/
├── docker-compose.yml          # Service definitions with health checks
├── Makefile                    # make start / stop / seed / clean / logs / status
├── .env.example                # Default environment variables (copy to .env)
├── README.md                   # This file
├── scripts/
│   └── seed.mjs                # Fund accounts, upload to IPFS, seed DB, write .env.local
└── init-scripts/
    └── postgres/
        ├── 01-schema.sql       # Creates all tables on first container start
        └── 02-grants.sql       # Grants privileges to the dongle user
```
