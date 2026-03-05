# Implementation Assumptions Log

This file documents every design and UX decision made during implementation that was not explicitly specified in the plan documents.

---

## Architecture & Tooling

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Vite** used as web bundler (not CRA) | CRA is deprecated; Vite is the current standard |
| 2 | **React Router v6** with `createBrowserRouter` | Current stable API |
| 3 | **Tailwind CSS v3** for styling | Fastest path to polished, responsive UI |
| 4 | **zod** chosen over `@sinclair/typebox` | Better DX, runtime + type safety in one |
| 5 | **`@fastify/rate-limit`** uses in-memory store in dev/test | Valkey not required for local development; Valkey integration activates when `VALKEY_URL` is set |
| 6 | **`refresh_tokens`** table added to migrations | Enables server-side logout; not in original schema spec but required for `POST /auth/logout` to work properly |
| 7 | **JWT access token TTL**: 15 minutes | Short-lived for security |
| 8 | **JWT refresh token TTL**: 7 days | Balance between UX and security |
| 9 | **Token storage**: `localStorage` for access + refresh tokens | Acceptable for localhost MVP; would use httpOnly cookies in production |

---

## Database

| # | Decision | Rationale |
|---|----------|-----------|
| 10 | `refresh_tokens` table added | Required for logout invalidation |
| 11 | `idempotency_keys` table added | Required for write idempotency (progress, points) |
| 12 | Migrations run via `node-pg-migrate` with `DATABASE_URL` env var | Standard approach |
| 13 | Test DB uses `TEST_DATABASE_URL` env var; integration tests fail clearly if not set | Honest about requirements |
| 14 | Dev Postgres started via `scripts/dev-db.sh` (rootless Podman, port 5432) | No full compose needed for Phases 1-5 |

---

## Seed Data

| # | Decision | Rationale |
|---|----------|-----------|
| 15 | 20 common English words seeded (animals, objects, nature) | Representative dataset for demo |
| 16 | Images: inline SVG data URIs stored directly in seed JSON | No image files needed; works without static file server |
| 17 | SVGs are simple colored rectangles with emoji text | Visually distinct without external assets |
| 18 | `audio_path` is `null` for all seed cards | Plan specifies no audio files in MVP |
| 19 | Audio button renders but shows tooltip "Audio coming soon" | UI is wired but gracefully disabled |

---

## API

| # | Decision | Rationale |
|---|----------|-----------|
| 20 | `POST /points/add` requires auth (JWT) even though client-callable | Minimum barrier; still insecure for awarding arbitrary points |
| 21 | Idempotency key TTL: 24 hours | Reasonable retry window |
| 22 | Rate limit: 10 requests/minute for login/register | Prevents brute force on localhost |
| 23 | `GET /flashcards/decks/:deckId/cards` returns all cards (no pagination active) | As per plan decision |
| 24 | CORS: allows `http://localhost:5173` (Vite dev server) and `http://localhost` (Caddy) | Local dev only |

---

## UI / UX

| # | Decision | Rationale |
|---|----------|-----------|
| 25 | **Color scheme**: Indigo-600 primary, amber-500 accent, slate-50 background | Kid-friendly but professional |
| 26 | **Font**: system font stack | No external font dependency |
| 27 | **Login/Register**: centered card layout on colored gradient background | Clean, focused auth flow |
| 28 | **Main menu**: game cards in responsive grid | Scales well when more games added |
| 29 | **Deck picker**: language filter tabs + deck cards with progress bars | Clear visual progress |
| 30 | **Flashcard**: large image area + term + nav buttons + known/shuffle controls | Follows spec exactly |
| 31 | **Progress bar**: green fill showing known/total percentage | Instant visual feedback |
| 32 | **Card counter**: "Card 3 of 20" display | Orientation within deck |
| 33 | **"Mark Known" toggle**: pressing again unmarks the card | Expected UX behavior |
| 34 | **Shuffle**: Fisher-Yates shuffle on current card order | Standard algorithm |
| 35 | **Offline indicator**: yellow banner shown when browser reports offline | Visible feedback |
| 36 | **Error states**: red alert boxes with clear messages | Better than silent failures |
| 37 | **Loading states**: spinner + disabled buttons | Prevents double-submit |
| 38 | **Responsive**: works on mobile viewport | Bonus; React Native excluded from MVP |

---

## Development Workflow

| # | Decision | Rationale |
|---|----------|-----------|
| 39 | API runs on port **3000** | Standard |
| 40 | Web dev server runs on port **5173** | Vite default |
| 41 | Vite proxies `/api/*` to `http://localhost:3000` in dev | No CORS issues during local dev |
| 42 | `scripts/dev-db.sh` starts Postgres 16 via rootless Podman | Self-contained, no system Postgres needed |
| 43 | `scripts/dev-db.sh` creates both `kids_games_dev` and `kids_games_test` databases | Single command setup |

---

## Out of Scope (confirmed not implemented)

- Multiplayer / WebSockets
- Audio files or audio playback
- Mobile app (placeholder dir only)
- Admin deck management UI
- Real image assets (SVG placeholders used)
- Prometheus/Grafana observability
- Production TLS certificates
