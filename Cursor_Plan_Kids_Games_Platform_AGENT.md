# Kids Games Platform AGENT Plan

## Usage
- This file is self-contained.
- Use this file as the primary implementation spec in a fresh AI session.
- Do not assume any prior chat context.
- If another plan file exists, this file is the concise implementation source of truth unless the user says otherwise.

## Goal
- Build a free/open-source MVP for a kids games platform.
- Primary game: Flash Cards.
- Architecture must be scalable later to multi-node/cloud.
- Initial runtime target: localhost on Debian-compatible stack with Podman rootless.

## MVP Scope
- Applications:
  - backend API application required
  - web client required
  - mobile client excluded from MVP
- User registration and login.
- Main menu with game selection.
- Flash Cards game:
  - previous / next
  - shuffle
  - mark known
  - known count
  - progress per deck
  - English first
- Backend stores:
  - users
  - game catalog metadata
  - deck metadata
  - user progress
- Local deployment:
  - Podman rootless
  - `podman-compose`
  - Caddy reverse proxy
  - Postgres
  - Valkey
- Local HTTPS support:
  - simple localhost HTTPS is enough
  - browser certificate warnings acceptable for early local development

## Non-Goals
- Mobile implementation
- Multiplayer implementation
- Complex animations
- Advanced bot AI
- Kubernetes
- Large-scale realtime
- Admin UI for content upload

## Decisions
- Develop on localhost first. No public domain yet.
- Flashcard content source: JSON or CSV import files. Seed uses free/open placeholder SVG images. `audio_path` is nullable; no real audio files in MVP. Audio playback is wired in the UI but plays nothing if path is null.
- No admin deck upload UI in MVP.
- Auth: email + password.
- Backend should be stateless.
- Durable state in Postgres.
- Hot ephemeral state in Valkey.
- Client handles most interaction logic.
- Phases 2 and 3 (API foundation + DB schema) are implemented together in a single pass to avoid auth-without-database ordering issues.

## Architecture
- `apps/api`: Node.js + TypeScript + Fastify
- `apps/web`: React + TypeScript
- `packages/shared`: shared types, validation, API DTOs, client helpers
- `packages/game-sdk`: game module interface and helpers
- `infra/podman`: compose, Caddy, scripts
- `infra/sql/migrations`: SQL migrations

## Recommended Repo Layout
```text
kids-games-platform/
  apps/
    api/
    web/
    mobile/           # placeholder only — README stub, no implementation
  packages/
    shared/
    game-sdk/
  infra/
    podman/
      compose.yml
      caddy/
        Caddyfile
      scripts/
        deploy.sh
        backup.sh
        restore.sh
    sql/
      migrations/
  docs/
  .github/workflows/
```

## Tech Choices
- Package manager:
  - pnpm with pnpm workspaces
- Backend:
  - Node.js
  - TypeScript
  - Fastify
  - `zod` or `@sinclair/typebox`
  - Postgres access via raw SQL migrations + `pg` driver
  - `node-pg-migrate` for running SQL migration files
- Data:
  - Postgres
  - Valkey
- Infra:
  - Podman rootless
  - `podman-compose`
  - Caddy
- Media:
  - static files served locally in MVP

## Core Data Model
- `users`
  - id uuid
  - email unique
  - password_hash
  - display_name
  - created_at
  - updated_at
- `games`
  - id text
  - title
  - status
  - created_at
- `decks`
  - id uuid
  - game_id fk
  - language_code
  - title
  - description
  - version
  - created_at
- `cards`
  - id uuid
  - deck_id fk
  - term
  - image_path
  - audio_path
  - tags text[]
  - created_at
- `user_deck_progress`
  - user_id fk
  - deck_id fk
  - last_index
  - known_count
  - updated_at
  - pk(user_id, deck_id)
- `user_known_cards`
  - user_id
  - deck_id
  - card_id
  - known_at
  - pk(user_id, card_id)
- `user_points`
  - user_id
  - total_points
  - updated_at
- `user_game_points`
  - user_id
  - game_id
  - points
  - updated_at
  - pk(user_id, game_id)
- `sessions` future-ready
  - id uuid
  - game_id
  - mode
  - state_json jsonb
  - version
  - updated_at

## API
- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
- Catalog:
  - `GET /games`
  - `GET /flashcards/decks?lang=en`
  - `GET /flashcards/decks/:deckId/cards`
- Progress:
  - `GET /flashcards/decks/:deckId/progress`
  - `POST /flashcards/decks/:deckId/known`
  - `POST /flashcards/decks/:deckId/position`
  - `POST /points/add`

## API Rules
- Validate every request.
- Protect authenticated routes.
- Use short-lived JWT access tokens plus refresh tokens.
- Use idempotency keys for retriable write endpoints.
- Store idempotency records in Postgres for a limited time.
- Add rate limiting for:
  - login
  - register
  - progress writes
- `POST /points/add` is intentionally client-callable in MVP (localhost-only). Points can be self-awarded. This is a known, accepted security gap for the MVP phase. TODO: make server-authoritative in V2.
- `GET /flashcards/decks/:deckId/cards` accepts optional `page`/`limit` query params but returns all cards by default in MVP. Pagination logic deferred.

## Client Plugin System
- Shared game shell for:
  - auth
  - menu
  - points
  - settings
  - localization
- `GameModule` interface:
```ts
export interface GameModule {
  id: string;
  title: string;
  icon?: string;
  routes: { path: string; component: React.ComponentType }[];
  requiresAuth: boolean;
  init?: (ctx: GameContext) => Promise<void>;
}
```
- `GameContext` services:
  - api
  - auth
  - i18n
  - telemetry
  - points

## Flash Cards Spec
- Deck picker with language filter.
- Card screen:
  - word
  - image
  - pronunciation audio
  - previous
  - next
  - mark known
  - shuffle
- Stats header:
  - known count / total
  - completion percent
- Rules:
  - known cards persist per user + deck
  - shuffle order is session-local
  - save last position every N actions or every X seconds
- Offline behavior:
  - allow local navigation
  - queue writes locally
  - retry when online
  - merge queued updates on resume
  - rely on idempotency to avoid duplicates

## Deployment
- Localhost-first only.
- `infra/podman/compose.yml` services:
  - caddy
  - api
  - postgres
  - valkey
- Secrets in `.env` with `600` permissions:
  - `POSTGRES_PASSWORD`
  - `JWT_SECRET`
  - `REFRESH_SECRET`
  - `CADDY_EMAIL` optional later for public HTTPS
- Backups:
  - nightly `pg_dump`
  - rotate old backups

## Observability
- Required:
  - `/health`
  - structured logs
- Optional later:
  - `/metrics`
  - Prometheus
  - Grafana

## Security
- HTTPS via Caddy locally and later in production
- bcrypt or argon2 password hashing
- input validation on every endpoint
- least privilege DB user
- local HTTPS smoke coverage
- auth and protected-route security tests

## Testing Requirements
- All tests must run locally.
- Fast default test suite required.
- Add or update tests for each implementation step.
- Add regression tests for bug fixes.
- Create tests in the same phase as the feature work, either immediately before implementation when helpful or immediately after implementation before the phase is considered complete.
- When a later phase changes earlier modules, re-run and update earlier tests as needed.
- A phase is not complete unless its tests exist and pass locally.

## Test Types
- Static/code-quality:
  - TypeScript typecheck
  - ESLint
  - optional formatting check
- Unit:
  - shared utilities
  - validation logic
  - auth helpers
  - flashcards logic
  - offline queue helpers
- API integration:
  - auth endpoints
  - catalog endpoints
  - progress endpoints
  - invalid input
  - unauthorized access
  - duplicate registration
  - invalid credentials
  - idempotency behavior
- Database:
  - migration smoke tests
  - seed validation
  - repository/data-access tests
  - key constraints and relations
- Web client:
  - auth screens
  - menu and plugin registry
  - deck picker
  - card navigation
  - mark known
  - progress display
  - loading/error states
  - offline queue behavior
- End-to-end:
  - register/login
  - open deck
  - browse cards
  - mark known
  - reload and verify persisted progress
- HTTPS smoke:
  - app loads on `https://localhost`
  - API reachable on `https://localhost`
  - auth works over HTTPS
  - no insecure fallback required

## Recommended Test Stack
- `typescript`
- `eslint`
- `vitest`
- Fastify injection tests
- dedicated Postgres test database
- `@testing-library/react`
- `playwright`
- optional `msw` for isolated client tests

## Suggested Commands
- `lint`
- `typecheck`
- `test:unit`
- `test:integration`
- `test:web`
- `test:e2e`
- `test`
- `test:full`

## Quality Gates By Step
- Step 1 scaffold:
  - workspace typecheck
  - lint config works
  - test runners wired
- Step 2 API skeleton:
  - auth integration tests
  - health tests
  - validation tests
- Step 3 DB migrations + seed:
  - migration smoke tests
  - seed tests
- Step 4 Web shell + plugin system:
  - rendering tests
  - route/plugin tests
- Step 5 Flashcards UI + sync:
  - flashcards behavior tests
  - progress sync tests
  - minimal e2e flow
- Step 6 Podman + Caddy:
  - startup smoke test
  - health checks
  - local HTTPS smoke test
- Step 7 CI/CD:
  - CI runs lint, typecheck, tests, build
- Step 8 observability:
  - health/metrics tests

## Execution Rules
- Implement in phase order unless the user explicitly reprioritizes.
- Keep backend API and web client both in MVP scope.
- Treat mobile as future scope only.
- Keep localhost as the primary runtime target until the user introduces a public domain.
- Prefer minimal, working increments with passing tests over broad incomplete changes.
- If a new change affects an earlier phase, re-run the earlier phase tests.
- Use the phases document as the execution gate for:
  - entry criteria
  - exit criteria
  - artifacts produced
  - file/folder ownership targets

## Execution Sequence
1. Scaffold monorepo and test commands (pnpm workspaces).
2. Implement API foundation + DB schema together: Fastify bootstrap, node-pg-migrate migrations for all MVP tables, seed import, auth routes, JWT, protected routes.
3. Implement catalog and flashcards API endpoints with idempotency and rate limiting.
4. Build web shell and plugin registry.
5. Implement flashcards UI and progress sync.
6. Add Podman Compose and Caddy localhost setup.
7. Add CI workflow templates.
8. Add optional observability.

## Future-Ready Constraints
- Keep backend stateless.
- Keep state externalized.
- Make writes idempotent where retries can happen.
- Keep game modules replaceable.
- Preserve upgrade path to:
  - multiplayer/WebSockets
  - multiple API instances
  - load balancer
  - object storage
  - Prometheus/Grafana
  - Kubernetes/cloud
