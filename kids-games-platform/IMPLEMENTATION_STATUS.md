# Kids Games Platform — Implementation Status

Single source of truth for what is implemented, what is partial, and what is deferred.
Every entry is evidence-backed with file paths, script names, or endpoint references.

> **See also:** [`WORKLOG.md`](WORKLOG.md) for phase-by-phase narrative and rationale.
> **Roadmap context:** [`USAGE.md`](USAGE.md) for executable workflows.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature Status Matrix](#feature-status-matrix)
3. [Non-Functional Status Matrix](#non-functional-status-matrix)
4. [Test Status Matrix](#test-status-matrix)
5. [Known Gaps & Debt Register](#known-gaps--debt-register)
6. [Milestone-Oriented Next Steps](#milestone-oriented-next-steps)

---

## Executive Summary

The MVP is **fully implemented and passing all automated quality gates.**

| Dimension | Status |
|-----------|--------|
| Core gameplay (flashcards) | Complete |
| Auth (register/login/refresh/logout) | Complete |
| Podman container stack | Complete |
| CI pipeline (GitHub Actions) | Complete |
| Test suite | 123 tests passing (unit + integration + web + E2E) |
| Ops tooling (backup/restore, stack E2E) | Complete (added post-MVP) |
| Documentation | Complete (USAGE, ARCHITECTURE, WORKLOG, this file) |

Deferred items (audio, points server-authority, mobile app, observability) are explicitly documented below.

---

## Feature Status Matrix

### Auth

| Feature | Status | Evidence |
|---------|--------|----------|
| Register (`POST /auth/register`) | Implemented | `apps/api/src/routes/auth.ts`, integration tests pass |
| Login (`POST /auth/login`) | Implemented | `apps/api/src/routes/auth.ts`, 9 auth unit tests |
| Refresh token (`POST /auth/refresh`) | Implemented | `apps/api/src/services/auth.service.ts` |
| Logout (`POST /auth/logout`) | Implemented | Deletes refresh token from DB |
| JWT access tokens (15 min) | Implemented | `apps/api/src/plugins/auth.ts` |
| Refresh tokens (7 days, rotated) | Implemented | `apps/api/src/repositories/token.repository.ts` |
| Rate limiting on auth endpoints | Implemented | `apps/api/src/plugins/rateLimit.ts` (Valkey or in-memory) |
| Account deletion | Deferred | No `DELETE /auth/me` endpoint; see gap #6 |
| Web login UI | Implemented | `apps/web/src/pages/LoginPage.tsx` |
| Web register UI | Implemented | `apps/web/src/pages/RegisterPage.tsx` |
| Protected route wrapper | Implemented | `apps/web/src/components/ProtectedRoute.tsx` |
| Auto token refresh in client | Implemented | `apps/web/src/services/api.ts` |

### Flashcards Gameplay

| Feature | Status | Evidence |
|---------|--------|----------|
| List all decks (`GET /flashcards/decks`) | Implemented | `apps/api/src/routes/flashcards.ts` |
| Get deck by ID | Implemented | `GET /flashcards/decks/:deckId` |
| List cards in deck | Implemented | `GET /flashcards/decks/:deckId/cards` (all cards, no pagination) |
| Card progress (known list) | Implemented | `GET /flashcards/decks/:deckId/progress` |
| Mark card known/unknown | Implemented | `POST /flashcards/decks/:deckId/progress/known` |
| Save card position | Implemented | `POST /flashcards/decks/:deckId/progress/position` |
| Idempotency keys on writes | Implemented | `Idempotency-Key` header, 24h cache in `idempotency_keys` table |
| Deck picker UI with progress | Implemented | `apps/web/src/pages/flashcards/DeckPickerPage.tsx` |
| Flashcard game UI | Implemented | `apps/web/src/pages/flashcards/FlashcardGamePage.tsx` |
| Card flip animation | Implemented | `apps/web/src/components/flashcards/FlashCard.tsx` |
| Known/unknown toggle | Implemented | `FlashCard.tsx` + progress service |
| Progress bar | Implemented | `apps/web/src/components/flashcards/ProgressBar.tsx` |
| Shuffle (Fisher-Yates) | Implemented | `FlashcardGamePage.tsx` |
| Audio playback | Partial | `AudioButton` renders; disabled when `audioPath` is null; all seed cards have null audio |
| Card images | Implemented (SVG) | Inline base64 SVG data URIs in `image_path` column (see gap #3) |
| Cards pagination | Deferred | Returns all cards; `page`/`limit` params accepted but not implemented |

### Points

| Feature | Status | Evidence |
|---------|--------|----------|
| Points schema | Implemented | `user_points`, `user_game_points` tables in migration |
| `GET /points` | Implemented | `apps/api/src/routes/points.ts` |
| `POST /points/add` | Partial | Implemented but client-callable (security gap); `// TODO(v2): make server-authoritative` comment |
| Points award on game completion | Deferred | No server-side game completion event triggers |
| Achievements/badges | Deferred | Not in scope for MVP |
| Leaderboard | Deferred | Not in scope for MVP |

### Game Catalog

| Feature | Status | Evidence |
|---------|--------|----------|
| `GET /games` | Implemented | `apps/api/src/routes/games.ts` |
| `GET /games/:gameId` | Implemented | Returns 404 for unknown ID |
| Game menu UI | Implemented | `apps/web/src/pages/MenuPage.tsx` |
| Game plugin registry | Deferred | `packages/game-sdk/` defines `GameModule` interface; dynamic registry not built |
| Second game (beyond flashcards) | Deferred | Placeholder in menu; implementation is future work |

### Rate Limiting

| Feature | Status | Evidence |
|---------|--------|----------|
| Auth endpoint rate limit (10/min) | Implemented | `apps/api/src/plugins/rateLimit.ts` |
| Valkey backend | Implemented | Used when `VALKEY_URL` env is set |
| In-memory fallback | Implemented | Used when `VALKEY_URL` is absent (localhost-only) |
| Per-route limits (non-auth) | Deferred | Only auth endpoints limited in MVP |

### Observability

| Feature | Status | Evidence |
|---------|--------|----------|
| Health endpoint | Implemented | `GET /health` returns `{status:"ok",db:"ok"}` |
| Container logs | Implemented | `podman-compose logs -f [service]` |
| Structured logging (Pino) | Deferred | Fastify's default logger is present; not forwarded to aggregator |
| Prometheus metrics | Deferred | Phase 8 (optional), not implemented |
| Grafana dashboard | Deferred | Depends on metrics endpoint |
| Sentry / error tracking | Deferred | Not in scope for MVP |

### Mobile

| Feature | Status | Evidence |
|---------|--------|----------|
| Mobile app | Deferred (stub) | `apps/mobile/README.md` only; no React Native/Expo code |

### Additional Games

| Feature | Status | Evidence |
|---------|--------|----------|
| Flashcards | Implemented | Full API + UI |
| Any other game | Deferred | Architecture supports it; no second game implemented |

---

## Non-Functional Status Matrix

| Concern | Status | Notes |
|---------|--------|-------|
| TypeScript strict mode | Implemented | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` across all packages |
| ESLint passing | Implemented | Enforced as phase gate; `pnpm lint` passes clean |
| Type checking passing | Implemented | `pnpm typecheck` passes across all 4 packages |
| HTTPS (production) | Ready | Caddy auto-provisions TLS when given a real domain in Caddyfile |
| HTTPS (localhost) | Optional | `ignoreHTTPSErrors: true` in playwright stack config |
| Rootless containers | Implemented | Podman rootless via `infra/podman/compose.yml` |
| Frozen lockfile in CI | Implemented | `pnpm install --frozen-lockfile` in `.github/workflows/ci.yml` |
| Offline progress queueing | Implemented | `apps/web/src/services/offlineQueue.ts` |
| Idempotent writes | Implemented | `Idempotency-Key` header + `idempotency_keys` DB table |
| DB backup/restore | Implemented | `infra/podman/scripts/backup.sh`, `restore.sh`, `pnpm stack:backup/restore` |
| Account deletion (store compliance) | Deferred | Required for Apple/Google store; not needed for web-only localhost |
| Performance tuning | Not started | No profiling done; not needed at current scale |
| Scalability | Single-server MVP | Architecture supports horizontal scaling (stateless API, external DB); not tested |

---

## Test Status Matrix

| Suite | Runner | Test count | DB required | CI job | Notes |
|-------|--------|-----------|-------------|--------|-------|
| Shared schemas | vitest | 6 | No | `unit-tests` | Zod schema validation |
| Game SDK | vitest | 1 | No | `unit-tests` | Type export check |
| API unit | vitest | 10 | No | `unit-tests` | Auth service logic, health route |
| Web components | vitest + jsdom | 47 | No | `web-tests` | All pages, services, hooks |
| API integration | vitest + pg | 57 | Yes (test DB) | `integration-tests` | All routes, repos, schema, seed |
| E2E (dev mode) | Playwright | 2 | Yes (full stack) | `e2e` (manual) | Register → login → flashcards via Vite dev server |
| E2E (stack mode) | Playwright | 2 | Yes (full stack) | Manual (`pnpm test:e2e:stack`) | Same suite against Podman+Caddy stack |
| **Total automated** | | **123** | | | |

**Config files:**
- Dev E2E: `apps/web/playwright.config.ts`
- Stack E2E: `apps/web/playwright.stack.config.ts`
- Web component: `apps/web/vitest.config.ts`
- API unit/integration: `apps/api/vitest.config.ts` / `apps/api/vitest.integration.config.ts`

---

## Known Gaps & Debt Register

| # | Gap | Impact | Severity | Proposed Action |
|---|-----|--------|----------|-----------------|
| 1 | `POST /points/add` is client-callable | Users can self-award points | Medium | Move award logic to server-side game completion events (V2) |
| 2 | Audio files absent (`audio_path` is null) | AudioButton renders but is silent | Low | Source CC audio files, store as static assets or S3 URLs |
| 3 | Card images are inline base64 SVG in DB | Large text column values; slower than file serving | Low | Move to static file path or object storage URL |
| 4 | No cards pagination | Slow for decks > 200 cards | Low | Add `?page=1&limit=50` and cursor-based pagination |
| 5 | `user_known_cards.deck_id` is denormalized | Minor schema redundancy | Very Low | Evaluate JOIN performance at scale; remove if adequate |
| 6 | No account deletion | Store compliance risk (Apple/Google) | Medium (if going to store) | Add `DELETE /auth/me` with CASCADE |
| 7 | `sessions` table is unused | Dead schema weight | Very Low | Implement when multiplayer planned; table does no harm |
| 8 | Mobile app is a stub | No mobile experience | N/A for localhost | Implement React Native / Expo app as separate effort |
| 9 | No observability beyond health endpoint | Can't diagnose production issues | Medium (if going to production) | Add Pino log forwarding, prom-client metrics, Grafana |
| 10 | Stack E2E not in CI | Deployment-only regressions not automatically caught | Low | Add optional CI job triggered on release branch |

---

## Milestone-Oriented Next Steps

Ordered by product value and risk reduction.

### Milestone 1 — Audio support (Low risk, medium value)

- Source Creative Commons audio clips for the 20 seed vocabulary words
- Store as static files in `apps/api/public/audio/` or an S3-compatible bucket
- Update `english-deck.json` with audio paths
- Re-seed: `pnpm db:reset`
- Verify AudioButton plays audio in the flashcard UI

### Milestone 2 — Second game (Medium risk, high value)

- Choose a game type (e.g., Spelling Bee, Word Match)
- Follow the guide in `WORKLOG.md` → "Adding More Games"
- Implement API routes, web pages, and vitest tests
- Register in `App.tsx` and update `MenuPage`

### Milestone 3 — Account deletion (Medium risk, store compliance)

- Add `DELETE /auth/me` route in `apps/api/src/routes/auth.ts`
- Repository: `DELETE FROM users WHERE id = $1` (CASCADE handles all related data)
- Add confirmation dialog in web UI settings page
- Integration test: verify all related rows deleted

### Milestone 4 — Points server-authority (Medium risk, security)

- Remove `POST /points/add` public endpoint (or gate behind admin role)
- Trigger point awards from game completion event handlers server-side
- Update integration tests

### Milestone 5 — Observability (Low risk, production readiness)

- Configure Pino JSON logging and ship to a log aggregator (Loki, Datadog, etc.)
- Add `prom-client` metrics endpoint (`GET /metrics`)
- Provision Grafana dashboard for API latency, error rates, DB pool usage
- Add frontend Sentry integration for JS error tracking

### Milestone 6 — Real domain + TLS (Config-only, high visibility)

- Update `infra/podman/caddy/Caddyfile` with your domain name
- Caddy provisions TLS automatically via Let's Encrypt
- Set `NODE_ENV=production`, rotate JWT secrets
- Point DNS to server IP

### Milestone 7 — Stack E2E in CI (Low risk, quality gate)

- Add a `stack-e2e` CI job triggered manually or on `release/*` branches
- Use `podman-compose up -d` + smoke test + `test:e2e:stack`
- Fails the release gate if Caddy proxy routes or TLS are broken
