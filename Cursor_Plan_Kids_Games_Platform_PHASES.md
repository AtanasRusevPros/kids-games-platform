# Kids Games Platform Phases

## Purpose
- Execution control document.
- Defines strict implementation phases.
- Each phase includes scope, acceptance criteria, required tests, and out-of-scope items.
- A phase is complete only when all acceptance criteria are met and required tests pass locally.
- This file is self-contained and can be used by a fresh AI session without prior chat context.
- Backend API server and web client are both required for MVP.
- Mobile client is excluded from MVP.

## Global Rules
- Build backend API and web client for MVP.
- Do not implement mobile in MVP. `apps/mobile` is a README-stub placeholder only.
- Keep all phases runnable on localhost.
- Keep default local test runs fast.
- Add or update tests in the same phase as the feature work.
- Create tests either immediately before implementation or immediately after implementation, but always before the phase is marked complete.
- Bug fixes must add regression tests where practical.
- Prefer small increments with passing tests after each phase.
- When later phases modify earlier modules, re-run the earlier relevant tests and refine them if needed.
- A phase is incomplete if required artifacts are missing.
- Use pnpm workspaces throughout. All workspace commands use pnpm.
- Use node-pg-migrate for running SQL migration files.

## Phase 1: Workspace Scaffold

### Priority
- P0

### Estimated Complexity
- Medium

### Scope
- Create monorepo structure:
  - `apps/api`
  - `apps/web`
  - `apps/mobile` — README stub only, no implementation
  - `packages/shared`
  - `packages/game-sdk`
  - `infra/podman`
  - `infra/sql/migrations`
- Configure pnpm workspaces (`pnpm-workspace.yaml`).
- Add workspace scripts for:
  - lint
  - typecheck
  - test
  - test:unit
  - test:integration
  - test:web
  - test:e2e
  - test:full
- Add baseline TypeScript and lint configuration.
- Add test runner wiring.

### Entry Criteria
- Repository is available locally.
- No implementation phase has been completed yet, or the workspace needs to be re-initialized intentionally.

### File/Folder Ownership Targets
- workspace root configuration files
- `apps/api/**`
- `apps/web/**`
- `apps/mobile/**` placeholder only
- `packages/shared/**`
- `packages/game-sdk/**`
- `infra/podman/**`
- `infra/sql/migrations/**`

### Artifacts Produced
- Workspace root configuration files
- Monorepo folder structure
- Starter app/package entry files
- Shared TypeScript configuration
- Shared lint configuration
- Initial test runner configuration
- Workspace scripts for linting, typechecking, and tests

### Acceptance Criteria
- Repository contains the required top-level structure.
- Workspace install and script resolution work.
- `apps/api`, `apps/web`, `packages/shared`, and `packages/game-sdk` build/typecheck with starter code.
- Lint command runs successfully.
- Test commands exist and execute successfully, even if some run placeholder/sample tests only.

### Exit Criteria
- All acceptance criteria are met.
- Baseline workspace scripts are documented or self-evident from configuration.
- No missing configuration prevents Phase 2 from starting.

### Required Tests
- Workspace typecheck passes.
- Workspace lint passes.
- Placeholder unit test passes.
- Placeholder integration test passes.
- Placeholder web test passes.

### Test Timing
- Create test runner wiring during this phase.
- Add placeholder tests during this phase.
- Do not proceed until all baseline test commands run successfully.

### Out of Scope
- Real business logic
- Real database schema
- Real UI features
- Deployment runtime behavior

## Phase 2: API Foundation, Database Schema, and Authentication

> **Note:** Originally split into Phase 2 (auth) and Phase 3 (DB schema). Merged into one phase to avoid the auth-without-database ordering problem. Both must be completed together before advancing.

### Priority
- P0

### Estimated Complexity
- High

### Scope
- Set up node-pg-migrate and migration runner.
- Add SQL migrations for all MVP tables:
  - users
  - games
  - decks
  - cards
  - user_deck_progress
  - user_known_cards
  - user_points
  - user_game_points
- Add seed import for initial English flashcards content from JSON or CSV.
  - Seed card images use free/open placeholder SVGs.
  - `audio_path` is nullable; no audio files in MVP seed.
- Add repository/data-access layer for core entities.
- Implement backend API app setup:
  - Fastify server bootstrap
  - configuration loading
  - structured logging
  - `/health`
  - auth routes:
    - register
    - login
    - refresh
    - logout
- Add request validation.
- Add password hashing (bcrypt or argon2).
- Add JWT auth flow (access + refresh tokens).
- Add protected route support.

### Entry Criteria
- Phase 1 is complete.
- Workspace scripts, linting, typechecking, and test runners are functional.

### File/Folder Ownership Targets
- `infra/sql/migrations/**`
- `apps/api/**`
- `packages/shared/**` for auth schemas, types, and DB contracts
- seed data directories/files under chosen repo location
- root workspace config only if needed for API/test wiring

### Artifacts Produced
- node-pg-migrate configuration and runner scripts
- SQL migration files for all MVP tables
- Seed import scripts and initial JSON/CSV content files
- Database access/repository modules
- Test database setup helpers
- API bootstrap and configuration modules
- Health endpoint
- Auth route handlers and validation schemas
- Password hashing/auth service modules
- JWT/token handling modules
- Protected-route middleware/hooks

### Acceptance Criteria
- Database can be created from empty state using migrations only.
- Seed import loads at least one English flashcards deck with cards (placeholder images, null audio).
- Auth persistence uses the real database.
- Core indexes, keys, and foreign keys exist for MVP tables.
- API starts locally.
- `/health` returns success.
- User can register with valid credentials.
- User can log in with valid credentials.
- Invalid credentials are rejected.
- Protected routes reject unauthenticated requests.
- Refresh flow works.
- Logout invalidates the applicable refresh/session state.

### Exit Criteria
- All acceptance criteria are met.
- Database can be recreated locally from migrations and seed flow without manual patching.
- Auth contract used by later client work is stable enough for integration.
- No missing backend/schema prerequisite blocks Phase 3.

### Required Tests
- Typecheck and lint pass.
- Migration smoke test from empty database passes.
- Seed validation test passes.
- Repository/data-access tests pass for:
  - user persistence
  - deck lookup
  - card lookup
  - progress persistence
- Constraint/relation tests pass for key uniqueness and FK integrity where implemented.
- API integration tests cover:
  - health
  - register
  - login
  - refresh
  - logout
  - unauthorized access to protected route
  - invalid payload handling
  - duplicate registration handling
  - invalid credential handling
- Unit tests cover auth helpers and validation logic.

### Test Timing
- Add migration smoke and seed validation tests alongside migration creation.
- Add repository tests alongside each repository/data-access module.
- Add unit tests for auth helpers during implementation of auth services.
- Add API integration tests before or immediately after each route group.
- Phase is incomplete until all migration, repository, and auth tests pass locally.

### Out of Scope
- Flashcards catalog/progress endpoints
- Points logic
- Production deployment
- Mobile auth
- Admin deck management UI

## Phase 3: Catalog and Flashcards API

### Priority
- P0

### Estimated Complexity
- High

### Scope
- Implement catalog endpoints:
  - `GET /games`
  - `GET /flashcards/decks?lang=en`
  - `GET /flashcards/decks/:deckId/cards` — accepts optional `page`/`limit` params; returns all cards by default in MVP
- Implement progress endpoints:
  - `GET /flashcards/decks/:deckId/progress`
  - `POST /flashcards/decks/:deckId/known`
  - `POST /flashcards/decks/:deckId/position`
- Implement `POST /points/add` — intentionally client-callable in MVP (localhost only). Document as accepted security gap; TODO for V2 server-side enforcement.
- Add idempotency handling for progress writes.
- Add rate limiting on selected sensitive endpoints where included in MVP.

### Entry Criteria
- Phase 2 is complete.
- Database migrations and seed import work locally.
- Auth persistence and protected-route foundation are stable.

### File/Folder Ownership Targets
- `apps/api/**`
- `packages/shared/**` for request/response contracts and validation types
- database/seed files only if API requirements expose missing schema issues

### Artifacts Produced
- Catalog route handlers
- Flashcards route handlers
- Progress route handlers
- Validation schemas for catalog/progress endpoints
- Idempotency storage and service modules
- Rate-limiting modules/config where implemented

### Acceptance Criteria
- Enabled games can be listed.
- English flashcards decks can be listed.
- Cards can be fetched for a selected deck.
- Authenticated user can fetch progress.
- Authenticated user can mark a card as known.
- Authenticated user can save card position.
- Retried progress writes with the same idempotency key do not duplicate effects.

### Exit Criteria
- All acceptance criteria are met.
- API contract for the web flashcards client is stable enough for Phase 4 and Phase 5.
- No missing catalog/progress backend prerequisite blocks frontend work.

### Required Tests
- Typecheck and lint pass.
- API integration tests pass for:
  - games listing
  - deck listing
  - card listing
  - progress fetch
  - mark known
  - save position
  - unauthorized access rejection
  - invalid payload rejection
  - idempotent retry behavior
- Unit tests cover progress calculation and idempotency helper logic where isolated logic exists.

### Test Timing
- Add integration tests for each endpoint group during the same phase.
- Add idempotency tests as soon as write retry handling is introduced.
- Re-run auth and database tests because this phase extends protected backend behavior.

### Out of Scope
- Multiplayer API
- Bot logic
- Advanced points/leaderboard logic beyond minimal schema compatibility

## Phase 4: Web App Shell and Plugin System

### Priority
- P0

### Estimated Complexity
- Medium

### Scope
- Implement React web app foundation.
- Add:
  - routing
  - auth flow screens
  - main menu
  - shared app shell
  - game registry/plugin system
- Register Flashcards as the first game module.
- Add shared API client integration.

### Entry Criteria
- Phase 1 is complete.
- Phase 2 auth endpoints are stable enough for client integration.
- Phase 3 game/catalog endpoints are available or stubbed compatibly.

### File/Folder Ownership Targets
- `apps/web/**`
- `packages/game-sdk/**`
- `packages/shared/**` for client API contracts/helpers
- root workspace config only if needed for web/test tooling

### Artifacts Produced
- Web app bootstrap and routing
- Auth pages/components
- Main menu components
- Shared shell layout/components
- Game registry/plugin modules
- Shared API client usage in web app

### Acceptance Criteria
- Web app starts locally.
- User can navigate to auth screens.
- User can log in from the web app.
- Authenticated user reaches the main menu.
- Main menu displays enabled games.
- Flashcards module is discoverable through the game registry.

### Exit Criteria
- All acceptance criteria are met.
- Client auth/navigation contract is stable enough for flashcards UI work.
- No missing shell/plugin prerequisite blocks Phase 5.

### Required Tests
- Typecheck and lint pass.
- Web tests pass for:
  - auth screen rendering and submission behavior
  - main menu rendering
  - route protection behavior
  - plugin registry behavior
  - enabled games display
- Integration tests pass for API client/auth wiring where implemented.

### Test Timing
- Add component tests during implementation of auth and shell views.
- Add route and plugin registry tests during registry implementation.
- Re-run backend auth tests because the client depends on their behavior contract.

### Out of Scope
- Full flashcards gameplay UI
- Offline queue
- Local HTTPS

## Phase 5: Flashcards UI and Progress Sync

### Priority
- P0

### Estimated Complexity
- High

### Scope
- Implement flashcards deck picker and gameplay UI.
- Add:
  - previous
  - next
  - shuffle
  - mark known
  - known count
  - progress display
  - pronunciation audio playback wiring
- Add local progress sync behavior:
  - save last position periodically
  - queue writes on disconnect
  - retry on reconnect

### Entry Criteria
- Phase 3 is complete.
- Phase 4 is complete.
- Flashcards API and web shell are both stable enough for UI integration.

### File/Folder Ownership Targets
- `apps/web/**`
- `packages/shared/**` for progress/offline/client contracts/helpers
- `packages/game-sdk/**` only if flashcards integration requires SDK evolution
- `apps/api/**` only for minimal backend adjustments discovered during integration

### Artifacts Produced
- Deck picker UI/components
- Flashcards gameplay UI/components
- Audio playback wiring
- Progress sync modules/services
- Offline queue modules/services
- Client-side progress state management

### Acceptance Criteria
- User can select an English deck.
- User can browse cards using previous/next.
- User can shuffle card order for the current session.
- User can mark a card as known.
- Known count and completion indicators update correctly.
- User progress persists after reload.
- Client queues progress writes when offline and retries when online.

### Exit Criteria
- All acceptance criteria are met.
- Critical end-to-end flashcards flow is stable locally.
- No missing MVP gameplay prerequisite blocks Phase 6 or Phase 7.

### Required Tests
- Typecheck and lint pass.
- Web tests pass for:
  - deck picker
  - card navigation
  - shuffle behavior
  - mark known behavior
  - progress display
  - loading and error states
  - offline queue behavior at UI/service level
- Unit tests pass for:
  - shuffle logic
  - progress calculations
  - offline queue merge/retry helpers
- Minimal end-to-end test passes for:
  - login
  - open deck
  - browse cards
  - mark known
  - reload and verify persisted progress

### Test Timing
- Add UI tests alongside deck picker and flashcards components.
- Add unit tests alongside shuffle/progress/offline queue logic.
- Add the minimal end-to-end test before the phase is considered complete.
- Re-run catalog/progress API tests because this phase depends on them heavily.

### Out of Scope
- Additional games
- Multiplayer
- Advanced analytics

## Phase 6: Local Podman and Reverse Proxy

### Priority
- P1

### Estimated Complexity
- Medium

### Scope
- Add local container/runtime configuration for:
  - caddy
  - api
  - postgres
  - valkey
- Add Caddy config for localhost routing.
- Add optional simple localhost HTTPS setup with browser warnings allowed.
- Add environment and startup documentation/scripts as needed.

### Entry Criteria
- Phase 3 and Phase 5 are complete.
- API and web app both run locally without containerization.

### File/Folder Ownership Targets
- `infra/podman/**`
- `apps/api/**` only for container/runtime adjustments
- `apps/web/**` only for container/runtime adjustments
- environment template/config files at workspace root if needed

### Artifacts Produced
- `compose.yml`
- Caddy configuration
- Environment variable template files
- Local startup scripts or documented commands
- HTTPS-localhost notes/config if enabled

### Acceptance Criteria
- Full stack starts locally with Podman rootless and `podman-compose`.
- Web app is reachable through Caddy on localhost.
- API is reachable through Caddy on localhost.
- API health check succeeds through the reverse proxy.
- Optional HTTPS localhost route works if enabled.

### Exit Criteria
- All acceptance criteria are met.
- Local stack can be started and verified repeatably.
- No missing local runtime prerequisite blocks CI setup or local validation.

### Required Tests
- Local startup smoke test passes.
- Health endpoint smoke test through proxy passes.
- If HTTPS is enabled, HTTPS smoke test passes:
  - app loads on `https://localhost`
  - API reachable on `https://localhost`
  - auth flow works without insecure fallback

### Test Timing
- Add smoke tests in the same phase as compose/proxy setup.
- Run smoke tests after every significant compose or proxy change.
- Re-run end-to-end tests through the proxied stack if feasible.

### Out of Scope
- Public domain
- Let’s Encrypt production certificates
- Remote deployment

## Phase 7: CI and Quality Gates

### Priority
- P1

### Estimated Complexity
- Medium

### Scope
- Add CI workflow templates for local/remote repository use.
- Run quality gates in CI:
  - lint
  - typecheck
  - unit tests
  - integration tests
  - selected web tests
  - selected end-to-end tests
- Add build steps for relevant apps.

### Entry Criteria
- Phases 1 through 6 are complete enough that local commands are stable.
- Test commands and build commands are defined and repeatable locally.

### File/Folder Ownership Targets
- `.github/workflows/**`
- workspace root scripts/config used by CI
- app/package build config only if required for CI compatibility

### Artifacts Produced
- CI workflow files
- CI test/build command definitions
- Optional CI caching configuration
- Build scripts/config used by CI

### Acceptance Criteria
- CI configuration exists in repository.
- CI runs the required quality gates automatically.
- CI fails when lint, typecheck, or tests fail.
- CI builds the project artifacts required for the MVP.

### Exit Criteria
- All acceptance criteria are met.
- CI reflects the agreed local quality gates.
- MVP can be validated repeatedly through local commands and CI.

### Required Tests
- CI workflow validation passes.
- Full local `test` command passes.
- Full local `test:full` command passes or documents any intentionally deferred heavy checks.

### Test Timing
- Add CI workflow in the same phase as the required command definitions.
- Validate CI against the current local test matrix before marking phase complete.
- Re-run all existing fast local tests after CI integration changes.

### Out of Scope
- Production deployment to a public server
- Mobile build pipeline

## Phase 8: Optional Observability Baseline

### Priority
- P2

### Estimated Complexity
- Low

### Scope
- Add minimal observability support:
  - `/metrics` optional
  - basic metrics exposure if implemented
- Keep `/health` and structured logging in place.

### Entry Criteria
- MVP phases 1 through 7 are complete, or observability is intentionally pulled earlier by user request.

### File/Folder Ownership Targets
- `apps/api/**`
- `infra/podman/**` only if local observability services/config are introduced
- docs/config files related to observability if needed

### Artifacts Produced
- Metrics endpoint modules if implemented
- Metrics configuration if implemented
- Observability notes/config updates

### Acceptance Criteria
- `/health` remains functional.
- If `/metrics` is implemented, it responds successfully and does not break existing runtime behavior.

### Exit Criteria
- All acceptance criteria are met.
- Observability additions do not regress existing health, startup, or test behavior.

### Required Tests
- Health endpoint tests pass.
- Metrics endpoint tests pass if metrics are implemented.

### Test Timing
- Add metrics tests in the same phase as metrics implementation.
- Re-run health and startup smoke tests after observability changes.

### Out of Scope
- Grafana dashboards
- Prometheus deployment
- Log aggregation stack

## Completion Rule
- MVP is complete when Phases 1 through 7 are complete.
- Phase 8 is optional.
- No phase is complete if required tests are missing or failing.
- Reaching a later phase never removes the obligation to keep earlier phase tests passing.
