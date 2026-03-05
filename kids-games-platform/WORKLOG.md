# Kids Games Platform — Work Log & Future Roadmap

A full narrative of what was built, why each decision was made, what was discovered along the way, and what comes next.

---

## Table of Contents

1. [Project Genesis](#project-genesis)
2. [Phase-by-Phase Work Log](#phase-by-phase-work-log)
   - [Phase 1 — Workspace Scaffold](#phase-1--workspace-scaffold)
   - [Phase 2+3 — API Foundation + Database](#phase-23--api-foundation--database)
   - [Phase 4 — Web Shell + Auth Screens](#phase-4--web-shell--auth-screens)
   - [Phase 5 — Flashcards UI + Progress Sync](#phase-5--flashcards-ui--progress-sync)
   - [Phase 6 — Podman + Caddy Localhost Stack](#phase-6--podman--caddy-localhost-stack)
   - [Phase 7 — CI Quality Gates](#phase-7--ci-quality-gates)
3. [Cross-Cutting Decisions](#cross-cutting-decisions)
4. [Bugs Found and Fixed](#bugs-found-and-fixed)
5. [Test Suite Summary](#test-suite-summary)
6. [Accepted Gaps & Technical Debt](#accepted-gaps--technical-debt)
7. [Potential Improvements — Near-term](#potential-improvements--near-term)
8. [Potential Improvements — Long-term](#potential-improvements--long-term)
9. [Adding More Games — Recommended Approach](#adding-more-games--recommended-approach)
10. [Infrastructure Evolution Path](#infrastructure-evolution-path)

---

## Project Genesis

The project started as a spec document describing a free/open-source kids vocabulary games platform. The goal was a **localhost-first MVP** — something a parent or teacher could run on a single server (or their laptop) to give kids a vocabulary learning experience with zero cloud dependencies.

Three plan documents were created before implementation:

| Document | Purpose |
|----------|---------|
| `Cursor_Plan_Kids_Games_Platform.md` | Full spec (961 lines) — detailed requirements for every feature |
| `Cursor_Plan_Kids_Games_Platform_AGENT.md` | Concise implementation source of truth for AI-assisted development |
| `Cursor_Plan_Kids_Games_Platform_PHASES.md` | Phase-gate execution plan with entry/exit criteria for each phase |

Before implementation began, a **gap analysis** was performed against the three documents. Key findings:

- **Phase 2 vs Phase 3 ordering conflict** — The plan required "user can register" in Phase 2 but the `users` table wasn't created until Phase 3. This was a chicken-and-egg problem. **Resolution:** Merge Phases 2 and 3 into a single implementation pass (API + full DB schema at once).
- **Package manager not specified** — Chose **pnpm** with workspaces, the industry standard for TypeScript monorepos of this size.
- **Seed asset ambiguity** — The spec mentioned `image_path` and `audio_path` but didn't clarify whether real files would be provided. **Resolution:** Generate placeholder SVG images as base64 data URIs; audio is left null with UI wired but silent.
- **`POST /points/add` is client-callable** — Noted as an intentional MVP gap; annotated with `// TODO(v2): make server-authoritative`.
- **Cards API pagination** — Deferred; returns all cards by default for the MVP scale (< 100 cards/deck).

---

## Phase-by-Phase Work Log

### Phase 1 — Workspace Scaffold

**Goal:** A working monorepo skeleton with no implementation logic.

**Artifacts created:**
- `pnpm-workspace.yaml` defining four packages
- `tsconfig.base.json` with strict TypeScript settings (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- `packages/shared/` — Types and Zod schemas
- `packages/game-sdk/` — `GameModule` / `GameContext` interface definitions
- `apps/api/` — Fastify skeleton with ESLint, vitest, and `pnpm` scripts
- `apps/web/` — Vite + React skeleton with Tailwind CSS, ESLint, vitest
- Root-level `package.json` with workspace-spanning scripts
- `.github/workflows/` stub

**Key decisions:**
- **TypeScript strict mode throughout** — `strict: true` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. This makes array indexing and optional object properties type-safe by default, catching many real bugs at compile time.
- **ESLint as a phase gate** — Every phase must pass `pnpm lint` before being marked complete. This prevents style drift from accumulating.
- **pnpm workspaces** — Chosen over npm workspaces for faster installs, hard links, and better lockfile stability. Version 9 used throughout.

---

### Phase 2+3 — API Foundation + Database

**Goal:** A fully functional Fastify API with PostgreSQL, JWT auth, and all MVP database tables.

**Artifacts created:**
- `apps/api/src/db/migrations/001_initial_schema.sql` — All 11 tables in one migration
- `apps/api/src/db/migrate.ts` — node-pg-migrate runner
- `apps/api/src/db/seed.ts` — Flashcard seed with 20 English vocabulary words
- `apps/api/src/db/seed-data/english-deck.json` — Vocabulary word list
- `apps/api/src/db/client.ts` — Pool singleton with `createPool()` / `initPool()` / `getPool()`
- All repositories: `user`, `deck`, `progress`, `game`, `token`, `points`
- `apps/api/src/services/auth.service.ts` — Password hashing (bcryptjs, 12 rounds), token management
- All route handlers: `auth`, `games`, `flashcards`, `points`, `health`
- `apps/api/src/plugins/` — auth (JWT), db (pool lifecycle), rateLimit
- `apps/api/src/mappers.ts` — snake_case → camelCase DTO conversion
- `scripts/dev-db.sh` — Helper for starting/stopping/resetting the local Podman DB container

**Key decisions:**

**Raw SQL with node-pg-migrate** — The spec called for raw SQL migrations rather than an ORM. This keeps the schema human-readable, avoids ORM abstraction leakage, and makes the migration history a clear audit trail. node-pg-migrate was chosen as a lightweight runner that understands raw SQL files.

**Explicit pool passing in repositories** — Every repository function accepts `pg.Pool` as its first argument rather than importing a global. This pattern makes test isolation trivial: pass a test-DB pool in tests, pass `getPool()` in route handlers. No mocking of module internals required.

**`createPool()` vs `initPool()`** — The client module exposes two functions:
- `initPool(url)` — sets the module-level singleton (used by the app in production)
- `createPool(url)` — returns a fresh pool without touching the singleton (used by migration/seed tests that need their own independent connection)

This separation was discovered as necessary after early integration tests interfered with each other through the shared singleton.

**JWT with refresh tokens** — Access tokens expire in 15 minutes; refresh tokens in 7 days. Refresh token rotation (delete old, insert new) provides forward secrecy. Concurrent refresh requests are coalesced in the client via a shared promise to avoid duplicate refresh calls on burst traffic.

**Idempotency keys** — Progress writes (`savePosition`, `markKnown`) accept an `Idempotency-Key` header. The API stores responses for 24 hours. On replay, the cached response is returned without re-executing the write. This enables safe retry from the offline queue.

**SVG placeholder images** — Rather than shipping binary image files or requiring an external CDN, card images are generated as inline SVG data URIs containing the card's emoji, colored background, and term text. The SVG is base64-encoded and stored directly in the `image_path` column. This keeps the repo entirely self-contained.

**Rate limiting architecture** — Auth endpoints are rate-limited (10 req/minute). The rate limiter is backed by Valkey (Redis fork) when `VALKEY_URL` is configured; falls back to in-memory when absent. In-memory is fine for single-server localhost deployments.

---

### Phase 4 — Web Shell + Auth Screens

**Goal:** A working React SPA with login/register, protected routing, and the game menu.

**Artifacts created:**
- `apps/web/src/App.tsx` — React Router with `ProtectedRoute` wrapper
- `apps/web/src/pages/LoginPage.tsx` and `RegisterPage.tsx`
- `apps/web/src/pages/MenuPage.tsx` — Game library listing
- `apps/web/src/components/Layout.tsx` — Shared header/footer with offline banner
- `apps/web/src/components/ProtectedRoute.tsx`
- `apps/web/src/services/api.ts` — `apiFetch()` with auto-refresh
- `apps/web/src/services/auth.service.ts` — Token storage in localStorage
- `apps/web/src/hooks/useOnlineStatus.ts`
- `apps/web/src/test-setup.ts` — Vitest global setup (localStorage mock, navigator.onLine mock)
- Tailwind CSS configuration and custom CSS classes

**Key decisions:**

**No global state library** — React local state (`useState`/`useEffect`) is sufficient for an MVP with simple data flows. The only cross-component state is in localStorage (tokens) and the offline queue. Adding Redux or Zustand would have been premature complexity.

**`apiFetch()` auto-refresh design** — When a 401 is received, the client attempts one token refresh. If the refresh succeeds, the original request is retried automatically — the calling code never needs to handle token expiry. If the refresh fails, tokens are cleared and the user sees an auth error. Concurrent 401s are deduplicated: all waiting requests share one refresh promise.

**Tailwind CSS** — Utility-first CSS avoids the need for a component library and keeps the bundle small. Custom classes (`.card`, `.btn-primary`, `.alert-error`) are defined in `index.css` to keep JSX readable.

---

### Phase 5 — Flashcards UI + Progress Sync

**Goal:** A fully interactive flashcard game with offline progress tracking.

**Artifacts created:**
- `apps/web/src/pages/flashcards/DeckPickerPage.tsx` — Deck listing with per-deck progress
- `apps/web/src/pages/flashcards/FlashcardGamePage.tsx` — Card game with navigation, known marking, shuffle
- `apps/web/src/components/flashcards/FlashCard.tsx` — Card face with image, term, tags, navigation buttons
- `apps/web/src/components/flashcards/ProgressBar.tsx` — Known/total progress indicator
- `apps/web/src/services/progress.service.ts` — Progress reads/writes with offline queueing
- `apps/web/src/services/offlineQueue.ts` — localStorage queue with UUID idempotency keys
- `apps/web/e2e/flashcards.spec.ts` — Playwright end-to-end test
- `apps/web/playwright.config.ts` — Playwright configuration

**Key decisions:**

**Fisher-Yates shuffle** — The shuffle button uses Fisher-Yates (Knuth) for an unbiased random permutation. This is important for learning apps — a biased shuffle would show some cards more often than others.

**Known state is local + server** — When a card is toggled as known, the UI updates immediately (local `Set<string>`). The server call happens asynchronously and failures fall back to the offline queue. This gives instant feedback regardless of network conditions.

**Offline queue design** — The queue is a JSON array in localStorage (`kg_offline_queue`). Each item has a UUID `id` which is passed as `Idempotency-Key` to the API on flush. This means:
1. Duplicate flushes (e.g., network blip mid-flush) are safe — the API deduplicates via the idempotency table
2. Items accumulate during prolonged offline periods and are all sent on reconnect
3. Failed items stay in the queue and are retried on the next flush

**Position saving strategy** — Position is saved on every card navigation. This is slightly aggressive (one API call per swipe) but ensures progress is never lost more than one card back. Idempotency keys make the calls safe to retry.

---

### Phase 6 — Podman + Caddy Localhost Stack

**Goal:** A container-based deployment runnable with a single `podman-compose up`.

**Artifacts created:**
- `infra/podman/compose.yml` — Four-service orchestration (db, api, web, caddy)
- `infra/podman/Dockerfile.api` — Multi-stage API image
- `infra/podman/Dockerfile.web` — Multi-stage web image (nginx)
- `infra/podman/nginx.conf` — SPA fallback configuration
- `infra/podman/caddy/Caddyfile` — Routing rules
- `infra/podman/smoke-test.sh` — Post-deploy verification script

**Key decisions:**

**Podman rootless** — Running containers without root privileges is the right choice for a server that might be shared. Podman's rootless mode uses user namespaces to provide container isolation without requiring a root daemon.

**Caddy over nginx as reverse proxy** — Caddy handles automatic HTTPS certificate management (via Let's Encrypt) when configured with a real domain. For localhost, it serves HTTP but is ready to switch to HTTPS by changing one line in the Caddyfile. This makes the path to a real domain trivially short.

**Multi-stage Docker builds** — The `deps` stage installs all dependencies; the `build` stage compiles; the `runtime` stage copies only production artifacts. This keeps images small (no dev tools, no TypeScript compiler in production) and avoids layer cache busting on source changes.

**API health check in compose** — The `api` service health check (`curl /health`) allows Caddy to start after the API is ready, preventing 502 errors during startup.

**Smoke test script** — `smoke-test.sh` polls the health endpoint with retries before making assertions. This makes it safe to run immediately after `podman-compose up -d` without manual waiting.

---

### Phase 7 — CI Quality Gates

**Goal:** Automated GitHub Actions pipeline that prevents broken code from reaching main.

**Artifacts created:**
- `.github/workflows/ci.yml` — Five-job pipeline

**Key decisions:**

**Five separate jobs** — `quality`, `unit-tests`, `web-tests`, `integration-tests`, `build`. Separating them gives faster feedback (parallel execution) and clear failure attribution. A lint failure shows in `quality` without running unnecessary tests.

**Integration job uses a service container** — The `integration-tests` job spins up `postgres:16-alpine` as a GitHub Actions service, applies migrations, seeds data, then runs tests. All secrets are injected as environment variables; no `.env` files are committed.

**Frozen lockfile** — `pnpm install --frozen-lockfile` in CI ensures the exact dependency tree from the lockfile is used, preventing "works on my machine" surprises from dependency drift.

**Separate test vs build jobs** — The `build` job runs in parallel with tests. If tests fail, the build still runs (providing build failure information simultaneously). If the build fails but tests pass, both facts are immediately visible.

---

## Cross-Cutting Decisions

### Dependency injection over global singletons

The API uses `getPool()` to retrieve the database pool in route handlers, but repositories accept an explicit `pg.Pool` parameter. This two-level approach:
- Keeps route handlers concise (they call `getPool()` once)
- Keeps repositories fully testable (pass any pool, including a test-DB pool)

### TypeScript strict mode as a bug prevention strategy

`noUncheckedIndexedAccess` makes `array[0]` return `T | undefined` rather than `T`. This forces explicit null checks everywhere an array index is used, catching a whole class of runtime crashes at compile time. Several potential bugs were caught during development because of this setting.

### Zod schemas as the API contract

Request bodies are validated with Zod schemas from the shared package. The first error message from `.safeParse()` is returned as the 400 response body. This gives clients human-readable validation errors without writing custom error messages.

### vitest for all test tiers

Using a single test runner (vitest) for unit, integration, and component tests reduces cognitive overhead. The same matchers, same mock API (`vi.fn()`, `vi.mock()`, `vi.spyOn()`), and same configuration patterns apply everywhere. Playwright is the sole exception for browser-level E2E tests.

---

## Bugs Found and Fixed

### Bug 1 — `setCardKnown` had swapped arguments in INSERT (Critical)

**File:** `apps/api/src/repositories/progress.repository.ts`

**Symptom:** `POST /flashcards/decks/:deckId/progress/known` returned 500. Integration tests for marking cards as known failed with a foreign key constraint violation.

**Root cause:** The INSERT query had columns `(user_id, card_id, deck_id)` but the values array was `[userId, deckId, cardId]` — the deck UUID was placed in the `card_id` column, which references the `cards` table. Since deck UUIDs don't exist in `cards`, the FK constraint rejected the insert.

```typescript
// BROKEN:
[userId, deckId, cardId]  // deckId went into card_id column

// FIXED:
[userId, cardId, deckId]  // correct order
```

**Detection:** Integration test `Progress repository > marks a card as known` failed. Root cause confirmed by checking the actual test DB card IDs (via `psql SELECT id FROM cards`) against the failing card_id in the error — the failing ID was a deck UUID, not a card UUID.

---

### Bug 2 — `navigator.onLine` mock non-configurable in jsdom

**File:** `apps/web/src/test-setup.ts`

**Symptom:** `progressService.test.ts` threw `TypeError: Cannot redefine property: onLine` in every test.

**Root cause:** The test setup defined `navigator.onLine` without `configurable: true`. When individual tests tried to redefine it (for offline testing scenarios), the property descriptor rejected the change.

**Fix:** Added `configurable: true` to the mock definition:
```typescript
Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
```

---

### Bug 3 — Ambiguous `getByText('🎮')` in MenuPage loading test

**File:** `apps/web/src/tests/MenuPage.test.tsx`

**Symptom:** `MenuPage > shows loading spinner initially` threw "Found multiple elements with the text: 🎮".

**Root cause:** The emoji appears in two places: the `<Layout>` header logo and the loading spinner's bounce animation div. `getByText` requires exactly one match.

**Fix:** Changed assertion from `screen.getByText('🎮')` to `document.querySelector('.animate-bounce')`, which uniquely targets the loading spinner div.

---

### Bug 4 — Ambiguous `/card/i` regex in FlashcardGamePage counter test

**File:** `apps/web/src/tests/FlashcardGamePage.test.tsx`

**Symptom:** `FlashcardGamePage > shows card counter` threw "Found multiple elements with the text: /card/i".

**Root cause:** The regex matched both the card counter `<p>` ("Card 1 of 3") and the "Shuffle cards" button.

**Fix:** Replaced the ambiguous check with specific assertions:
```typescript
expect(screen.getByText('3')).toBeTruthy();       // total span (unique)
expect(screen.getByText('0/3 known')).toBeTruthy(); // ProgressBar (unique)
```

---

### Bug 5 — Playwright e2e tests collected by vitest

**File:** `apps/web/vitest.config.ts`

**Symptom:** `pnpm test:web` failed because vitest tried to import the Playwright e2e test file (`e2e/flashcards.spec.ts`) and couldn't understand `test.describe` syntax.

**Fix:** Added an explicit `include` pattern to the vitest config to restrict collection to `src/` only:
```typescript
include: ['src/**/*.{test,spec}.{ts,tsx}'],
```

---

### Bug 6 — 206 TypeScript errors on vitest globals in web tests

**File:** `apps/web/tsconfig.json`

**Symptom:** `pnpm typecheck` reported 206 errors — `Cannot find name 'vi'`, `Cannot find name 'expect'`, etc. — across all web test files that used vitest's global mode.

**Root cause:** The web tsconfig did not include the vitest globals type definitions, so TypeScript didn't know about `vi`, `describe`, `it`, `expect`, `beforeEach`, etc.

**Fix:** Added to tsconfig:
```json
"types": ["vitest/globals"]
```

---

### Bug 7 — Unused `getPool` import in games integration test

**File:** `apps/api/src/tests/games.integration.test.ts`

**Symptom:** `pnpm lint` reported `'getPool' is defined but never used`.

**Root cause:** `getPool` was imported but the games integration test only uses `app.inject()` (no direct pool access needed).

**Fix:** Removed the unused import.

---

## Test Suite Summary

**Current totals (all passing):**

| Suite | Runner | Count | Key coverage |
|-------|--------|-------|-------------|
| Shared schemas | vitest | 6 | Zod validation correctness |
| Game SDK | vitest | 1 | SDK type exports |
| API unit | vitest | 10 | Auth service logic, health route |
| Web components | vitest + jsdom | 47 | All pages, services, components |
| API integration | vitest + PostgreSQL | 57 | All routes, repositories, DB schema, seed |
| E2E | Playwright | 2 | Full register→login→flashcards flow |
| **Total** | | **123** | |

**Test philosophy:** Tests verify behavior, not implementation. Integration tests assert HTTP status codes and response shapes. Repository tests assert data consistency. Component tests assert what the user sees and what actions trigger, not internal state.

---

## Accepted Gaps & Technical Debt

These are known issues that were deliberately deferred. Each is documented here so future contributors understand the intent.

### 1. `POST /points/add` is client-callable

```typescript
// apps/api/src/routes/points.ts
// TODO(v2): make server-authoritative
// Any authenticated user can currently call this and award themselves arbitrary points.
// For a localhost MVP this is acceptable — there's no adversarial user.
// In production: points must be awarded by server-side game logic, not client requests.
```

**Future fix:** Move points award logic into game completion events that the server validates. Remove the public POST endpoint or gate it behind an admin role.

### 2. Audio is wired but silent

The `audio_path` column exists in the schema. The `AudioButton` in `FlashCard.tsx` renders but is disabled when `audioPath` is null. All seed cards have `audio_path: null`.

**Future fix:** Record or source Creative Commons audio files, store as static assets or object storage URLs, update seed data.

### 3. Seed images are base64 SVG data URIs in the database

This keeps the seed self-contained but is not ideal for production: storing large blobs in PostgreSQL text columns is slower than serving static files. The base64 strings are also quite long.

**Future fix:** Store images as files in a static assets directory (or an S3-compatible bucket). Update `image_path` to reference file paths/URLs rather than inline data.

### 4. No pagination on cards API

`GET /flashcards/decks/:deckId/cards` returns all cards without pagination. This is fine for decks of < 200 words but would become slow for very large decks.

**Future fix:** Add `?page=1&limit=50` query params; implement cursor-based pagination in `findCardsByDeck()`.

### 5. `user_known_cards.deck_id` is denormalized

The `deck_id` column in `user_known_cards` is redundant since `card_id` already has a FK to `cards(id)` which has a FK to `decks(id)`. The denormalization exists as a performance convenience for the common query "get all known card IDs for a user in a deck" — without it, the query would require a JOIN through `cards`.

**Future fix:** Evaluate query performance on larger datasets. If the JOIN is fast enough, remove the denormalized column and the associated index.

### 6. No account deletion

The system has no `DELETE /auth/me` endpoint. This is a gap for mobile store compliance (Apple and Google require apps to offer account deletion). For a web-only localhost MVP it's acceptable.

**Future fix:** Add `DELETE /auth/me` which deletes the user row (CASCADE removes all related data).

### 7. Sessions table is unused

The `sessions` table exists in the schema for future multiplayer/PvP mode but has no routes, repositories, or UI.

**Future fix:** Implement when multiplayer is planned. Until then, the table adds no overhead.

### 8. Mobile app is a stub

`apps/mobile/` contains only a README. The monorepo is structured to accommodate a React Native or Expo app but none has been implemented.

---

## Operational Hardening (Post-MVP)

Implemented after the 7-phase MVP was complete, based on the `NEXT_AI_IMPLEMENTATION_PLAN.md` review.

### Improvement 1 — Backup/Restore Scripts

**Motivation:** The existing `pnpm db:reset` workflow is destructive. Schema changes and migration experiments needed a safe rollback path. Demo data (player progress, registered users) would be lost without a backup step.

**Artifacts created:**
- `infra/podman/scripts/backup.sh` — dumps `kids_games_dev` via `pg_dump --clean --if-exists` from the running stack container. Output: `infra/podman/backups/pg-YYYYMMDD-HHMMSS.sql`.
- `infra/podman/scripts/restore.sh` — validates the backup file, prompts for confirmation (`'yes'` required), terminates active connections, then restores the dump via `psql`.
- `infra/podman/backups/` — output directory (gitignored).
- Root `package.json` scripts: `stack:backup` and `stack:restore`.

**Design decisions:**
- `pg_dump --clean --if-exists` embeds `DROP TABLE IF EXISTS` statements into the dump file. This makes the restore self-contained: pipe the SQL to `psql` on the existing database without needing to drop/recreate it.
- Terminating active connections before restore (`pg_terminate_backend`) avoids lock conflicts when the API container is still running.
- Confirmation guard (`Type 'yes' to confirm`) prevents accidental overwrites.
- Scripts verify the stack is running before executing, giving a clear error message rather than a cryptic `pg_dump` failure.

**Usage:**
```bash
pnpm stack:backup
pnpm stack:restore infra/podman/backups/pg-YYYYMMDD-HHMMSS.sql
```

---

### Improvement 2 — Stack-Targeted E2E (`test:e2e:stack`)

**Motivation:** The existing Playwright E2E suite validates the dev-server flow (Vite on port 5173). It does not exercise Caddy's reverse proxy, container networking, or TLS routing. Regressions in the deployment topology would not be caught until manual testing.

**Artifacts created:**
- `apps/web/playwright.stack.config.ts` — separate Playwright configuration targeting `http://localhost` (Caddy HTTP). No `webServer` block (stack must already be running). `ignoreHTTPSErrors: true` for HTTPS testing. `BASE_URL_STACK` env var for override.
- `apps/web/package.json`: added `test:e2e:stack` script.
- Root `package.json`: added `test:e2e:stack` proxy script.

**Design decisions:**
- Reuses the same E2E test suite (`apps/web/e2e/`) against both endpoints — no test duplication. The two configs differ only in `baseURL` and `webServer` presence.
- Stack E2E is intentionally excluded from the default CI pipeline (`pnpm test:full`) because it requires a running container stack. It's a pre-release validation step, not a PR gate.
- `retries: 1` added (vs. `retries: 0` in dev config) because container startup can add brief latency on first request.
- Documented as Milestone 7 in `IMPLEMENTATION_STATUS.md` — adding a CI job for stack E2E on release branches is a recommended future step.

**Usage:**
```bash
# Bring up the stack first
podman-compose -f infra/podman/compose.yml up -d
./infra/podman/smoke-test.sh

# Then run stack E2E
pnpm test:e2e:stack
```

---

### Improvement 3 — Documentation Suite Completion

**Artifacts created:**
- `IMPLEMENTATION_STATUS.md` — evidence-backed status matrix for all features, non-functionals, tests, gaps, and milestones. Single source of truth for project maturity.
- `USAGE.md` extended with 6 scenario playbooks: dev loop, full stack run, stack validation, backup/restore drill, DB maintenance reference, and troubleshooting map.

---

## Potential Improvements — Near-term

These are improvements that would be relatively straightforward to implement with the current architecture.

### 1. Add more vocabulary decks

Add new JSON files in `apps/api/src/db/seed-data/` with different themes (numbers, colors, foods, animals by category) or different languages (Spanish, French, Japanese). Update the seed script to load multiple files.

### 2. Language switcher in DeckPickerPage

The deck API already supports `?lang=en` filtering. The frontend could show language tabs (EN, ES, FR) when multiple language decks are available. The API response already includes `languageCode` on each deck.

### 3. Progress reset per deck

Add a `DELETE /flashcards/decks/:deckId/progress` endpoint that removes the user's progress for a specific deck. Add a "Reset progress" button in the game UI.

### 4. Deck versioning

The `decks.version` column exists but isn't used. When a deck is updated (new cards added), bump the version and invalidate client-side cached progress. Cards that no longer exist should be removed from `user_known_cards`.

### 5. Admin seed endpoint

A `POST /admin/seed` endpoint (protected by an admin token) would allow updating deck content without SSH access to the server — useful for remote deployment.

### 6. Better error pages

Currently all errors fall through to generic error messages. Add specific 404, 503, and session-expired pages in the React app.

### 7. Keyboard navigation in flashcards

Add keyboard shortcuts: `→` for next card, `←` for previous, `Space` to toggle known. Improves accessibility and desktop usability.

---

## Potential Improvements — Long-term

### 1. Game Plugin Registry

The `game-sdk` package defines `GameModule` but the game registry doesn't exist yet. Building it involves:

1. A `registry.ts` module that exports a list of `GameModule` objects
2. `MenuPage` reads routes and icons from the registry rather than hard-coding
3. `App.tsx` dynamically registers routes from the registry
4. Each game module is lazy-loaded with `React.lazy()`

This transforms the platform into a true plugin system where new games can be added as separate npm packages without modifying core routing code.

### 2. Multiplayer / PvP Mode

The `sessions` table in the schema anticipates a future where two players compete on the same deck. Implementation would require:

1. WebSocket server (Fastify has `@fastify/websocket`)
2. Session state machine in `state_json` (turn-based, scoring)
3. A lobby/matchmaking UI
4. Real-time progress updates pushed to both clients

### 3. Spaced Repetition Algorithm

The current known/unknown binary is a simplified model. A proper spaced repetition system (e.g., SM-2 or FSRS) would track:
- Number of times answered correctly
- Review intervals
- "Ease factor" (how hard the card is for this user)
- Next review date

This would require new columns in `user_known_cards` and a scheduling query that returns only cards due for review.

### 4. Points & Achievements System

The `user_points` and `user_game_points` tables exist but points are client-callable (see accepted gaps). A proper achievements system would:
1. Move award logic to server-side game completion events
2. Define badges (e.g., "Learned 50 words", "Perfect session")
3. Show achievement notifications in the UI
4. Leaderboard for family/classroom use

### 5. Teacher/Parent Dashboard

A separate `/dashboard` area (behind an `admin` role) where:
- A teacher can see which students are using which decks
- Which words students consistently mark as unknown
- A class leaderboard
- Deck management (add/edit/delete decks and cards)

### 6. Observability

The Phase 8 (optional) plan included:
- Structured Pino logging shipped to a log aggregator
- `prom-client` metrics endpoint for Prometheus scraping
- Grafana dashboard for API latency, error rates, DB query times
- Sentry for frontend error tracking

Currently there is zero production observability beyond container logs.

### 7. User-Generated Decks

Allow users to create their own vocabulary decks through a web form. Would require:
- `POST /flashcards/decks` (create deck)
- `POST /flashcards/decks/:id/cards` (add card)
- File upload for card images
- A deck editor UI

### 8. Offline-First Architecture

The current offline support queues writes but still requires connectivity to load decks/cards. A true offline-first experience would use:
- Service Worker for caching API responses
- IndexedDB for structured local storage of decks and progress
- Background sync for flushing the write queue
- The current `offlineQueue.ts` is a stepping stone toward this

---

## Adding More Games — Recommended Approach

The cleanest path for adding a second game (e.g., "Spelling Bee"):

### Step 1 — Database

Add the game record to seed data. No schema changes needed unless the game has its own tables.

### Step 2 — API

If the game needs server-side data or progress tracking, add routes following the `flashcards.ts` pattern:
- `GET /spelling-bee/words` — list words for a round
- `POST /spelling-bee/rounds/:roundId/submit` — submit an attempt

### Step 3 — Frontend

Create page components under `apps/web/src/pages/spelling-bee/`. Use the existing `Layout`, `ProtectedRoute`, `apiFetch`, and `auth.service` — no new service infrastructure needed.

### Step 4 — Register routes

Add `<Route>` entries to `App.tsx`.

### Step 5 — MenuPage

Update the click handler to route by game ID. Until the full game registry is built, a simple `paths` map works:

```typescript
const paths: Record<string, string> = {
    flashcards: '/flashcards',
    'spelling-bee': '/spelling-bee',
};
```

### Step 6 — Game SDK (future)

When the registry is ready, export a `SpellingBeeModule` conforming to the `GameModule` interface and register it.

---

## Infrastructure Evolution Path

**Current (MVP):** Single server, Podman rootless, Caddy on localhost.

**Stage 2 — Real domain:**
1. Update Caddyfile with your domain name
2. Caddy auto-provisions a TLS certificate via Let's Encrypt
3. Set `NODE_ENV=production` in `.env`
4. Point DNS to your server

**Stage 3 — Managed database:**
Replace the DB container with a managed PostgreSQL service (e.g., Supabase, Neon, Railway). Change `DATABASE_URL` in the API service environment. The schema and migration system work identically.

**Stage 4 — Separate servers:**
Split API and web to separate containers on separate servers or use a PaaS (Render, Fly.io, Railway). The Caddy proxy becomes a standalone deployment pointing to the API server's public URL.

**Stage 5 — Kubernetes:**
The multi-stage Docker images are already K8s-ready. Wrap the compose services in Helm charts or plain manifests. Add horizontal pod autoscaling for the API.

The architecture was designed so each of these transitions is a configuration change, not a code rewrite.
