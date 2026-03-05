# Kids Games Platform — Local Development Guide

Everything you need to run the full stack locally, from first clone to playing in a browser.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [First-time Setup](#first-time-setup)
3. [Running the Stack](#running-the-stack)
   - [Option A — Direct (dev mode)](#option-a--direct-dev-mode)
   - [Option B — Containers (Podman)](#option-b--containers-podman)
4. [Database Commands](#database-commands)
5. [Running Tests](#running-tests)
6. [Building for Production](#building-for-production)
7. [Environment Variables](#environment-variables)
8. [Common Tasks & Workflows](#common-tasks--workflows)
9. [Ports & URLs Reference](#ports--urls-reference)
10. [Troubleshooting](#troubleshooting)
11. [Scenario Playbooks](#scenario-playbooks)
    - [Scenario 1 — Quick Local Development Loop](#scenario-1--quick-local-development-loop)
    - [Scenario 2 — Full Stack Run (Podman)](#scenario-2--full-stack-run-podman)
    - [Scenario 3 — Stack Validation (Smoke + E2E)](#scenario-3--stack-validation-smoke--e2e)
    - [Scenario 4 — Backup and Restore Drill](#scenario-4--backup-and-restore-drill)
    - [Scenario 5 — Database Maintenance](#scenario-5--database-maintenance)
    - [Scenario 6 — Troubleshooting Map](#scenario-6--troubleshooting-map)

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 20.x | LTS recommended |
| pnpm | 9.x | `npm install -g pnpm@9` |
| PostgreSQL | 16.x | Or use Podman (no local install needed) |
| Podman | 4.x | Only for container-based stack |
| podman-compose | 1.x | `pip install podman-compose` |

> **No PostgreSQL locally?** Use Option B (Podman) which spins up the DB in a container, or run just the DB container with `scripts/dev-db.sh`.

---

## First-time Setup

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd kids-games-platform

# 2. Install all dependencies (all workspaces)
pnpm install

# 3. Copy the API environment file
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env if you need non-default values

# 4. Start the database (Podman, rootless)
./scripts/dev-db.sh start

# 5. Run migrations to create all tables
pnpm db:migrate

# 6. Seed the database with the flashcard deck
pnpm db:seed
```

After step 6 the database has:
- 1 game record (`flashcards`)
- 1 English deck ("English Basics")
- 20 vocabulary cards with embedded SVG images

---

## Running the Stack

### Option A — Direct (dev mode)

Run the API and web app in two separate terminals. Hot-reload is active in both.

**Terminal 1 — API server:**
```bash
cd kids-games-platform
pnpm --filter @kids-games/api dev
# Listens on http://localhost:3000
```

**Terminal 2 — Web app:**
```bash
cd kids-games-platform
pnpm --filter @kids-games/web dev
# Listens on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

The web app proxies API calls through Vite's dev server to `http://localhost:3000`, so CORS is transparent in dev.

> **Database must be running** — start it with `./scripts/dev-db.sh start` if you haven't already.

---

### Option B — Containers (Podman)

Runs the full stack (DB + API + Web + Caddy reverse proxy) as rootless containers.

```bash
# Start everything
podman-compose -f infra/podman/compose.yml up -d

# Check that all containers started
podman ps

# View logs (all services)
podman-compose -f infra/podman/compose.yml logs -f

# View logs for one service
podman-compose -f infra/podman/compose.yml logs -f api

# Run smoke tests (waits for health, verifies web returns 200)
./infra/podman/smoke-test.sh

# Stop all containers
podman-compose -f infra/podman/compose.yml down
```

Open **http://localhost:8080** (Caddy proxies everything).

**First-time container run — seed the DB inside the container:**
```bash
# After containers are up and healthy:
podman exec kids-games-api node --env-file=/dev/null -r tsx/esm src/db/seed.ts
```

---

## Database Commands

All commands run from the `kids-games-platform/` root.

| Command | What it does |
|---------|-------------|
| `pnpm db:migrate` | Apply all pending SQL migrations |
| `pnpm db:migrate:down` | Roll back the last migration |
| `pnpm db:seed` | Insert seed data (idempotent — safe to run multiple times) |
| `pnpm db:reset` | **Destructive** — drops all tables, re-migrates, re-seeds |
| `./scripts/dev-db.sh start` | Start local Podman DB container |
| `./scripts/dev-db.sh stop` | Stop local Podman DB container |
| `./scripts/dev-db.sh reset` | Stop container, wipe volume, restart (fresh DB) |

**Migrations live in:**
`apps/api/src/db/migrations/001_initial_schema.sql`

**To add a new migration:**
1. Create `apps/api/src/db/migrations/002_my_change.sql`
2. Run `pnpm db:migrate` — node-pg-migrate applies it automatically

**Directly inspect the database:**
```bash
# Dev DB
psql postgresql://postgres:postgres@localhost:5432/kids_games_dev

# Test DB
psql postgresql://postgres:postgres@localhost:5432/kids_games_test

# Or via Podman exec
podman exec -it kids-games-postgres psql -U postgres -d kids_games_dev
```

---

## Running Tests

All commands run from `kids-games-platform/`.

### Quick reference

| Command | What it runs | Needs DB? |
|---------|-------------|-----------|
| `pnpm test:unit` | Shared schemas, SDK, API unit tests | No |
| `pnpm test:web` | React component tests (vitest + jsdom) | No |
| `pnpm test:integration` | API integration tests against test DB | Yes |
| `pnpm test:e2e` | Playwright end-to-end browser tests | Yes (full stack) |
| `pnpm test:full` | All of the above, in sequence | Yes |
| `pnpm typecheck` | TypeScript type check (all packages) | No |
| `pnpm lint` | ESLint (all packages) | No |

### Unit tests

```bash
pnpm test:unit
# 18 tests: schemas (6), game-sdk (1), auth service (9), health (1)
# No DB required — pure logic only
```

### Web component tests

```bash
pnpm test:web
# 47 tests across 8 test files
# Uses vitest + jsdom + @testing-library/react
# No server required — all API calls are mocked
```

Watch mode (live re-run on file save):
```bash
pnpm --filter @kids-games/web test:watch
```

### Integration tests

Requires the **test database** to exist and be migrated/seeded:

```bash
# One-time setup of test DB (if not already done)
CREATE DATABASE kids_games_test;
# Or via psql:
psql -U postgres -c "CREATE DATABASE kids_games_test;"

# Migrate the test DB
NODE_ENV=test DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kids_games_test \
  pnpm db:migrate

# Seed the test DB
NODE_ENV=test DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kids_games_test \
  pnpm db:seed

# Run integration tests
pnpm test:integration
# 57 tests: migration schema, seed data, auth endpoints, flashcard endpoints, repositories, games
```

The integration tests use `TEST_DATABASE_URL` from `apps/api/.env` automatically.

### End-to-end tests

Requires the full stack running (API on `:3000`, web on `:5173`):

```bash
# Start API and web in background (two terminals, or use & )
pnpm --filter @kids-games/api dev &
pnpm --filter @kids-games/web dev &

# Run Playwright tests (Chromium only)
pnpm test:e2e
```

The Playwright config (`apps/web/playwright.config.ts`) auto-starts the Vite dev server if not already running.

---

## Building for Production

```bash
# Build all packages (shared → game-sdk → api → web, in dependency order)
pnpm build

# Build a single package
pnpm --filter @kids-games/api build
pnpm --filter @kids-games/web build

# Build container images
podman build -f infra/podman/Dockerfile.api -t kids-games-api .
podman build -f infra/podman/Dockerfile.web -t kids-games-web .
```

The API build output lands in `apps/api/dist/`.
The web build output (static HTML/CSS/JS) lands in `apps/web/dist/`.

---

## Environment Variables

**File:** `apps/api/.env` (copy from `apps/api/.env.example`)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kids_games_dev
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kids_games_test

# JWT secrets (change for anything beyond localhost)
JWT_SECRET=change-me-in-production-jwt-secret-min-32-chars
REFRESH_SECRET=change-me-in-production-refresh-secret-min-32-chars

# Valkey / Redis (optional — in-memory fallback used if absent)
# VALKEY_URL=redis://localhost:6379
```

**Web app — Vite environment:**
The web app talks to the API via `/api` prefix (proxied by Vite in dev, by Caddy in prod).
No `.env` file needed for the web app in the default setup.

If you need a custom API base URL, set `VITE_API_BASE` in `apps/web/.env.local`.

---

## Common Tasks & Workflows

### Add a new vocabulary word to the seed deck

1. Open `apps/api/src/db/seed-data/english-deck.json`
2. Add an entry:
   ```json
   { "term": "Tiger", "tags": ["animal"], "emoji": "🐯" }
   ```
3. Run `pnpm db:reset` (drops + remigrates + reseeds dev DB)
   or `pnpm db:seed` (adds only new words, safe to re-run)

### Add a new API route

1. Create or edit a file in `apps/api/src/routes/`
2. Register it in `apps/api/src/app.ts`
3. Add shared types/schemas if needed in `packages/shared/src/`
4. Write integration tests in `apps/api/src/tests/<name>.integration.test.ts`
5. Run `pnpm test:integration` to verify

### Add a new page to the web app

1. Create a component in `apps/web/src/pages/`
2. Add a route in `apps/web/src/App.tsx`
3. Wrap with `<ProtectedRoute>` if login is required
4. Write component tests in `apps/web/src/tests/`
5. Run `pnpm test:web`

### Reset the local dev environment completely

```bash
# Stop running containers
podman-compose -f infra/podman/compose.yml down

# Wipe and restart the database
./scripts/dev-db.sh reset

# Reinstall dependencies (e.g., after lockfile changes)
pnpm install

# Re-run migrations and seed
pnpm db:migrate && pnpm db:seed
```

### Run linting and typechecking before committing

```bash
pnpm lint && pnpm typecheck
```

---

## Ports & URLs Reference

| Service | URL | Notes |
|---------|-----|-------|
| Web (dev) | http://localhost:5173 | Vite dev server |
| API (dev) | http://localhost:3000 | Fastify direct |
| API health | http://localhost:3000/health | Returns `{ status: "ok", db: "ok" }` |
| PostgreSQL | localhost:5432 | `kids_games_dev` database |
| Caddy proxy (containers) | http://localhost:8080 | Routes `/api/*` to API, rest to web |
| Caddy HTTPS (containers) | https://localhost | Requires TLS setup in Caddyfile |

**Key API endpoints (quick test with curl):**

```bash
# Health check
curl http://localhost:3000/health

# List games
curl http://localhost:3000/games

# List flashcard decks
curl http://localhost:3000/flashcards/decks

# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","displayName":"Test User"}'

# Login and get tokens
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

---

## Troubleshooting

### `pnpm install` fails

```bash
# Clear caches and reinstall
pnpm store prune
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Database connection refused

```bash
# Check if the DB container is running
podman ps | grep kids-games-postgres

# Start it if not running
./scripts/dev-db.sh start

# Check logs
podman logs kids-games-postgres
```

### `pnpm db:migrate` fails with "relation already exists"

The schema is already applied. This is safe to ignore, or run a reset:
```bash
pnpm db:reset
```

### Integration tests fail with "ECONNREFUSED"

The test DB doesn't exist or isn't running:
```bash
# Make sure DB is running
./scripts/dev-db.sh start

# Make sure TEST_DATABASE_URL is set in apps/api/.env
cat apps/api/.env | grep TEST_DATABASE

# Create the test DB if missing
psql postgresql://postgres:postgres@localhost:5432/postgres \
  -c "CREATE DATABASE kids_games_test;"

# Migrate the test DB
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kids_games_test \
  node --env-file=/dev/null -r tsx/esm apps/api/src/db/migrate.ts

# Seed the test DB
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kids_games_test \
  node --env-file=/dev/null -r tsx/esm apps/api/src/db/seed.ts
```

### Web tests fail with "Cannot find module"

Build the shared packages first (they are consumed via TypeScript source path aliases):
```bash
pnpm --filter @kids-games/shared build
pnpm --filter @kids-games/game-sdk build
```

### Caddy starts but returns 502 Bad Gateway

The API container hasn't passed its health check yet. Wait ~15 seconds and try again, or check:
```bash
podman-compose -f infra/podman/compose.yml logs api
```

### Podman permission errors (rootless)

```bash
# Ensure Podman is configured for rootless mode
podman system migrate
podman info | grep rootless
```

---

## Scenario Playbooks

Quick-reference scenarios you can execute end-to-end using copy-paste commands.
Cross-reference status of features at any time in [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md).

---

### Scenario 1 — Quick Local Development Loop

**Goal:** Make a code change and see it live in < 2 minutes.

**Preconditions:**
- `pnpm install` completed
- `apps/api/.env` exists (copied from `.env.example`)
- Database is running: `./scripts/dev-db.sh start`

**Steps:**

```bash
# Terminal 1 — API with hot reload
pnpm --filter @kids-games/api dev
# Expected: "Server listening at http://localhost:3000"

# Terminal 2 — Web with hot reload
pnpm --filter @kids-games/web dev
# Expected: "Local: http://localhost:5173"
```

Open **http://localhost:5173** in a browser. Register an account, log in, and open Flashcards.

**Rapid validation:**
```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok","db":"ok"}

# List games
curl http://localhost:3000/games
# Expected: JSON array with at least one game entry

# Run unit + web tests (no DB needed)
pnpm test:unit && pnpm test:web
# Expected: all tests pass
```

**Failure hints:**
- `ECONNREFUSED 3000` → API not started; check Terminal 1 for errors
- `ECONNREFUSED 5432` → database not running; run `./scripts/dev-db.sh start`
- `Cannot find module` → run `pnpm install` then build shared packages first

---

### Scenario 2 — Full Stack Run (Podman)

**Goal:** Run the entire platform as a container stack (db + api + web + caddy), as it would run in production.

**Preconditions:**
- Podman and podman-compose installed
- `apps/api/.env` exists
- Container images built (or will be built on first `up`)

**Steps:**

```bash
# 1. Build images and start all containers
podman-compose -f infra/podman/compose.yml up -d --build

# 2. Wait for containers to become healthy (~20 seconds)
podman ps
# Expected: kids-games-db, kids-games-api, kids-games-web, kids-games-caddy all shown

# 3. Seed the database (first time only)
podman exec kids-games-api node --env-file=/dev/null -r tsx/esm src/db/seed.ts

# 4. Verify the stack is up
./infra/podman/smoke-test.sh
# Expected: "Smoke test passed"
```

Open **http://localhost** in a browser (Caddy serves on port 80).

**Expected success signals:**
- `podman ps` shows all 4 containers in "healthy" or "Up" state
- `curl http://localhost/api/health` returns `{"status":"ok","db":"ok"}`
- Browser loads the login page at `http://localhost`

**Stop the stack:**
```bash
podman-compose -f infra/podman/compose.yml down
```

**Failure hints:**
- 502 Bad Gateway → API not healthy yet; wait 15 seconds, or check `podman-compose -f infra/podman/compose.yml logs api`
- Build fails → check that `apps/api/.env` exists; run `pnpm install` first
- Port 80 in use → stop conflicting service or change Caddy's port in `compose.yml`

---

### Scenario 3 — Stack Validation (Smoke + E2E)

**Goal:** Verify that the Podman+Caddy stack correctly proxies requests and that the app works end-to-end through Caddy.

**Preconditions:**
- Stack is up and healthy (Scenario 2 complete)
- Playwright dependencies installed: `pnpm --filter @kids-games/web exec playwright install --with-deps chromium`

**Steps:**

```bash
# 1. Smoke test — verifies health + web returns 200
./infra/podman/smoke-test.sh
# Expected: "Smoke test passed"

# 2. Stack E2E — runs Playwright tests against http://localhost (Caddy)
pnpm test:e2e:stack
# Expected: 2 E2E tests pass (register → login → flashcards flow)
```

**Interpreting common E2E failures against stack:**

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `net::ERR_CONNECTION_REFUSED` | Caddy/stack not running | Run `podman-compose up -d`, wait for healthy |
| `net::ERR_CERT_INVALID` | HTTPS cert not trusted | Already handled: `ignoreHTTPSErrors: true` in stack config |
| `GET /api/...` → 502 | API container not ready | Check `podman-compose logs api`; wait for health check |
| Test times out waiting for element | App loaded but API returning errors | Check browser console in trace: `npx playwright show-trace` |

**Note:** The stack E2E config lives at `apps/web/playwright.stack.config.ts`.
The base URL defaults to `http://localhost`. Override with `BASE_URL_STACK=https://localhost pnpm test:e2e:stack`.

---

### Scenario 4 — Backup and Restore Drill

**Goal:** Create a data backup, simulate data loss, and verify restore works correctly.

**Preconditions:**
- Stack is running (Scenario 2 complete)
- Database has been seeded and you have created at least one user account via the app

**Steps:**

```bash
# 1. Create a backup
pnpm stack:backup
# Expected: "Backup saved to: infra/podman/backups/pg-YYYYMMDD-HHMMSS.sql"
# Note the exact filename from the output.

# 2. Simulate data change (e.g., delete all progress data to simulate corruption)
podman exec kids-games-db psql -U postgres kids_games_dev \
  -c "DELETE FROM user_known_cards;"
# Or: pnpm db:reset  (destructive — drops and re-creates all tables)

# 3. Verify the data is gone
podman exec kids-games-db psql -U postgres kids_games_dev \
  -c "SELECT COUNT(*) FROM user_known_cards;"
# Expected: count = 0

# 4. Restore from backup
pnpm stack:restore infra/podman/backups/pg-YYYYMMDD-HHMMSS.sql
# Type 'yes' at the confirmation prompt.
# Expected: "Restore complete."

# 5. Verify the data is back
podman exec kids-games-db psql -U postgres kids_games_dev \
  -c "SELECT COUNT(*) FROM user_known_cards;"
# Expected: same count as before step 2

# 6. Confirm the API still works
curl http://localhost/api/health
# Expected: {"status":"ok","db":"ok"}
```

**Backup file location:** `infra/podman/backups/` (gitignored; keep copies elsewhere for important data).

**Failure hints:**
- `stack does not appear to be running` → start the stack first (`podman-compose up -d`)
- `file not found or not readable` → check the path passed to `stack:restore`
- Restore exits cleanly but data missing → check that the backup was taken after seeding (`pnpm db:seed`)

---

### Scenario 5 — Database Maintenance

**Goal:** Know which DB command to use for each situation.

| Situation | Command | Destructive? |
|-----------|---------|-------------|
| Apply new migration file | `pnpm db:migrate` | No |
| Roll back last migration | `pnpm db:migrate:down` | Yes (data in migrated tables) |
| Add fresh seed data (safe re-run) | `pnpm db:seed` | No (idempotent) |
| Wipe and rebuild dev DB from scratch | `pnpm db:reset` | Yes — drops all tables |
| Start local DB container | `./scripts/dev-db.sh start` | No |
| Stop local DB container | `./scripts/dev-db.sh stop` | No |
| Reset local DB container (wipes volume) | `./scripts/dev-db.sh reset` | Yes — wipes Docker volume |

**Adding a new migration:**
```bash
# 1. Create the file (increment the number)
touch apps/api/src/db/migrations/002_my_change.sql
# Edit and write your SQL

# 2. Apply it
pnpm db:migrate
# Expected: migration applied; idempotent — safe to re-run

# 3. Apply to test DB too
NODE_ENV=test \
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kids_games_test \
  pnpm db:migrate
```

**Directly inspect the database:**
```bash
# Dev DB
psql postgresql://postgres:postgres@localhost:5432/kids_games_dev

# Test DB
psql postgresql://postgres:postgres@localhost:5432/kids_games_test

# Via container exec (stack mode)
podman exec -it kids-games-db psql -U postgres kids_games_dev
```

---

### Scenario 6 — Troubleshooting Map

Quick lookup: error signature → exact remediation.

| Error signature | Root cause | Remediation |
|----------------|-----------|-------------|
| `ECONNREFUSED localhost:3000` | API not running | `pnpm --filter @kids-games/api dev` |
| `ECONNREFUSED localhost:5432` | DB not running | `./scripts/dev-db.sh start` |
| `relation already exists` on migrate | Migration already applied | Safe to ignore, or `pnpm db:reset` |
| Integration tests: `ECONNREFUSED` | Test DB missing or not running | See USAGE.md → Integration tests section |
| `Cannot find module` in web tests | Shared packages not built | `pnpm --filter @kids-games/shared build && pnpm --filter @kids-games/game-sdk build` |
| 502 Bad Gateway from Caddy | API container not healthy | `podman-compose -f infra/podman/compose.yml logs api` |
| `podman: permission denied` | Podman not in rootless mode | `podman system migrate` |
| `pnpm install` fails | Cache corruption | `pnpm store prune && rm -rf node_modules **/node_modules && pnpm install` |
| `Cannot redefine property: onLine` in tests | Missing `configurable: true` in test setup | Fixed in `apps/web/src/test-setup.ts` — pull latest |
| Stack E2E: `ERR_CONNECTION_REFUSED` | Stack not running | `podman-compose -f infra/podman/compose.yml up -d` then smoke test |
| Stack backup: `stack does not appear to be running` | DB container not found | Start stack first, then `pnpm stack:backup` |
