# CLAUDE.md — Agent Working Definition

This file defines how Claude Code operates in this repository.
It is read automatically at the start of every session.

---

## Project

Kids Games Platform MVP — a modular, free/open-source kids games platform.
Primary sources of truth (read these before acting):
- `Cursor_Plan_Kids_Games_Platform_AGENT.md` — concise implementation spec
- `Cursor_Plan_Kids_Games_Platform_PHASES.md` — phase gate execution control

---

## Autonomy

- Operate independently. Do not ask for permission before running install, build, test, lint, typecheck, or database commands.
- Complete entire phases end-to-end without waiting for approval between steps.
- Only pause to ask the user when a decision has architectural impact or is explicitly marked as a user choice in the plan docs.

---

## Working Directory

- All work is confined to this repository root: `/home/luke/git/ClaudeCodeTestApp` (or the project directory once scaffolded inside it).
- Do not write files, run commands, or modify configuration outside this directory.
- Do not push to remote repositories unless explicitly instructed.

---

## Phase Discipline

- Follow `Cursor_Plan_Kids_Games_Platform_PHASES.md` strictly.
- Do not start a phase until its entry criteria are met.
- Do not mark a phase complete until all acceptance criteria and required tests pass locally.
- When a later phase modifies earlier code, re-run the earlier phase's tests before advancing.

---

## Commands — Permitted Without Asking

The following categories of commands may be run freely **without prompting the user**:

### Package management
```
pnpm install
pnpm add <pkg> [--save-dev]
pnpm remove <pkg>
npm install / npm run <script>
```

### Development
```
pnpm dev / pnpm start
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:web
pnpm test:e2e
pnpm test:full
node <script>
tsx <script>
```

### File system (local project only)
```
mkdir -p <dir>          # create directories inside project root
touch <file>            # create empty files
cp / mv (within root)  # copy or move files within the project
rm <file>               # delete files within project root (not recursive without user check)
```

### Database (local only)
```
pnpm db:migrate
pnpm db:seed
pnpm db:reset        # drop + recreate + migrate + seed (local dev DB only)
scripts/dev-db.sh start|stop|reset
```

### Containers (local only)
```
podman-compose up -d
podman-compose down
podman-compose logs
podman ps
```

### Git (read-only and local branch ops)
```
git status
git diff
git log
git checkout -b <branch>   # local branches only
git add / git commit       # only when user explicitly requests a commit
```

---

## Commands — Ask First

- `git push` — always confirm before pushing
- `git reset --hard` — always confirm; destructive
- Any command that modifies files outside the project root
- Any `DROP DATABASE` or equivalent outside the test/dev database

---

## Tech Stack (fixed decisions)

| Concern | Choice |
|---------|--------|
| Package manager | pnpm + pnpm workspaces |
| Backend | Node.js + TypeScript + Fastify |
| Validation | zod or @sinclair/typebox |
| DB driver | pg (node-postgres) |
| Migrations | node-pg-migrate (raw SQL files) |
| Cache / rate-limit | Valkey |
| Frontend | React + TypeScript |
| Test runner | vitest (unit + integration), @testing-library/react (web), playwright (e2e) |
| Containers | Podman rootless + podman-compose |
| Reverse proxy | Caddy |

---

## Code Conventions

- TypeScript strict mode everywhere.
- ESLint must pass before a phase is marked complete.
- No `any` types without an explanatory comment.
- Tests live alongside the code they test (`*.test.ts` / `*.spec.ts`).
- Prefer editing existing files over creating new ones.
- Do not add comments unless the logic is non-obvious.
- Do not add docstrings or type annotations to code that wasn't changed.

---

## Security Constraints

- Never commit `.env` files. Use `.env.example` with placeholder values.
- Never log secrets, tokens, or password hashes.
- `POST /points/add` is intentionally client-callable in MVP (localhost only) — this is a documented, accepted gap. Add a `// TODO(v2): make server-authoritative` comment at the handler.

---

## Seed Data

- Flashcard images: use free/open placeholder SVGs bundled in the repo.
- Audio: `audio_path` is nullable. No audio files in MVP. Audio playback UI is wired but silent when path is null.

---

## Definition of Done (per phase)

A phase is complete when ALL of the following are true:
1. All artifacts listed in the phase's "Artifacts Produced" section exist.
2. All acceptance criteria in the phase pass manually or via tests.
3. `pnpm lint` passes.
4. `pnpm typecheck` passes.
5. All required tests listed in the phase pass locally.
6. No earlier phase's tests have been broken.
