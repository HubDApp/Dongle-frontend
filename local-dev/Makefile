# =============================================================================
# Dongle local development — Makefile
#
# Prerequisites:
#   - Docker Desktop ≥ 24 / Docker Engine ≥ 24 + Compose v2
#   - Node.js ≥ 20 (for seed script)
#   - make (pre-installed on macOS/Linux; Windows: use Git Bash or WSL)
#
# Targets:
#   make start    Pull images and start all services (detached)
#   make stop     Stop containers (volumes preserved)
#   make restart  stop + start
#   make seed     Deploy contracts and insert test data
#   make clean    Stop containers AND remove all volumes (destructive)
#   make logs     Tail logs for all services
#   make status   Show container health and port mappings
#   make ps       Alias for status
#   make shell    Open bash inside a running service (SERVICE=<name>)
#   make reset    clean + start + seed (full rebuild)
# =============================================================================

# Source .env if it exists (allows overriding compose variables)
-include .env
export

COMPOSE := docker compose -f docker-compose.yml --env-file .env

.PHONY: start stop restart seed clean logs status ps shell reset \
        _wait-stellar _wait-ipfs _wait-redis _wait-postgres

# ── Primary targets ───────────────────────────────────────────────────────────

## Start all services in detached mode
start:
	@echo "🐳 Pulling latest images..."
	$(COMPOSE) pull --quiet
	@echo "🚀 Starting Dongle local stack..."
	$(COMPOSE) up -d --remove-orphans
	@echo ""
	@$(MAKE) --no-print-directory _wait-all
	@echo ""
	@echo "✅ All services are healthy."
	@echo ""
	@echo "   Horizon API        →  http://localhost:8000"
	@echo "   Soroban RPC        →  http://localhost:8001"
	@echo "   Friendbot          →  http://localhost:8002/friendbot?addr=<G...>"
	@echo "   IPFS API           →  http://localhost:5001"
	@echo "   IPFS Gateway       →  http://localhost:8080"
	@echo "   Redis              →  localhost:6379"
	@echo "   PostgreSQL         →  localhost:5432"
	@echo ""
	@echo "   Next step → make seed    (deploy contracts + load test data)"

## Stop containers but keep volumes
stop:
	@echo "🛑 Stopping Dongle local stack..."
	$(COMPOSE) stop
	@echo "✅ Services stopped. Run 'make start' to restart."

## Stop then start
restart: stop start

## Deploy contracts and seed test data into the running stack
seed:
	@echo "🌱 Running seed script..."
	@node scripts/seed.mjs
	@echo "✅ Seed complete."

## Stop containers AND destroy all volumes (full reset)
clean:
	@echo "⚠️  Removing containers AND all persistent volumes..."
	$(COMPOSE) down -v --remove-orphans
	@echo "✅ Clean complete."

## Tail logs for all services (Ctrl+C to stop)
logs:
	$(COMPOSE) logs -f --tail=100

## Show service status and port mappings
status:
	@echo ""
	@echo "── Container status ──────────────────────────────────────────────"
	$(COMPOSE) ps
	@echo ""
	@echo "── Health status ─────────────────────────────────────────────────"
	@docker inspect --format \
		'  {{.Name}}  →  {{if .State.Health}}{{.State.Health.Status}}{{else}}N/A{{end}}' \
		dongle-stellar dongle-ipfs dongle-redis dongle-postgres 2>/dev/null || true
	@echo ""

ps: status

## Open a bash shell in a running service container
## Usage: make shell SERVICE=stellar
shell:
	$(COMPOSE) exec $(SERVICE) /bin/sh

## Full reset: clean → start → seed
reset: clean start seed

# ── Internal wait helpers ─────────────────────────────────────────────────────

_wait-stellar:
	@echo "⏳ Waiting for Stellar Quickstart to be healthy..."
	@timeout=120; \
	while [ $$timeout -gt 0 ]; do \
		status=$$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' dongle-stellar 2>/dev/null); \
		if [ "$$status" = "healthy" ]; then echo "   ✓ stellar"; break; fi; \
		sleep 2; timeout=$$((timeout-2)); \
	done; \
	if [ "$$timeout" -le 0 ]; then echo "   ✗ stellar timed out — check: docker logs dongle-stellar"; exit 1; fi

_wait-ipfs:
	@echo "⏳ Waiting for IPFS to be healthy..."
	@timeout=60; \
	while [ $$timeout -gt 0 ]; do \
		status=$$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' dongle-ipfs 2>/dev/null); \
		if [ "$$status" = "healthy" ]; then echo "   ✓ ipfs"; break; fi; \
		sleep 2; timeout=$$((timeout-2)); \
	done; \
	if [ "$$timeout" -le 0 ]; then echo "   ✗ ipfs timed out — check: docker logs dongle-ipfs"; exit 1; fi

_wait-redis:
	@echo "⏳ Waiting for Redis to be healthy..."
	@timeout=30; \
	while [ $$timeout -gt 0 ]; do \
		status=$$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' dongle-redis 2>/dev/null); \
		if [ "$$status" = "healthy" ]; then echo "   ✓ redis"; break; fi; \
		sleep 2; timeout=$$((timeout-2)); \
	done; \
	if [ "$$timeout" -le 0 ]; then echo "   ✗ redis timed out — check: docker logs dongle-redis"; exit 1; fi

_wait-postgres:
	@echo "⏳ Waiting for PostgreSQL to be healthy..."
	@timeout=60; \
	while [ $$timeout -gt 0 ]; do \
		status=$$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' dongle-postgres 2>/dev/null); \
		if [ "$$status" = "healthy" ]; then echo "   ✓ postgres"; break; fi; \
		sleep 2; timeout=$$((timeout-2)); \
	done; \
	if [ "$$timeout" -le 0 ]; then echo "   ✗ postgres timed out — check: docker logs dongle-postgres"; exit 1; fi

_wait-all: _wait-stellar _wait-ipfs _wait-redis _wait-postgres
