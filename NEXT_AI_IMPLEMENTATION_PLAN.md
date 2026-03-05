# Next AI Implementation Plan: Operational Hardening + Documentation Improvements

## Context and Scope
This plan is for implementing selected improvements inspired by `GamePlatform1MVP`, but applied pragmatically to `kids-games-platform`.

In scope:
1. Add backup/restore operational scripts for the Podman stack.
2. Add stack-targeted E2E execution (`test:e2e:stack`).
3. Improve MD documentation with:
   - (4) implementation-status tracking
   - (5) scenario-driven usage/onboarding

Out of scope:
- Dual DB runtime mode (`pg-mem` + Postgres) as default runtime behavior.

Decision on out-of-scope item:
- **Skip Dual DB runtime mode for now** (intentional).

---

## Why these improvements are chosen

### Improvement 1: Backup/Restore scripts
- **Why:** current workflows include reset/reseed paths that are destructive to data.
- **Purpose:** provide a safe operational path to preserve and recover local/QA persistent data (player progress, auth data, test fixtures).
- **Expected impact:** lower risk during schema changes, migration experiments, and demos.

### Improvement 2: Stack-targeted E2E
- **Why:** current E2E primarily validates dev-server flow, not the full proxied deployment topology.
- **Purpose:** validate Caddy + container networking + TLS/proxy route behavior, which can fail independently from app logic.
- **Expected impact:** higher release confidence and earlier detection of deployment-only regressions.

### Improvement 4: Implementation status MD
- **Why:** development maturity and deferred work become hard to track without an explicit status artifact.
- **Purpose:** single source of truth for what is implemented, partial, deferred, and why.
- **Expected impact:** better planning discipline and faster onboarding for humans/AI collaborators.

### Improvement 5: Scenario-driven usage MD
- **Why:** exhaustive docs are useful, but scenario-first docs reduce setup friction and execution mistakes.
- **Purpose:** make common workflows executable by copy/paste with expected outcomes and troubleshooting hints.
- **Expected impact:** faster contributor productivity, fewer repeated support questions.

---

## Explicit decision: Skip Dual DB runtime mode for now

### Decision
Do **not** add runtime `DATABASE_MODE=memory|postgres` switching to `kids-games-platform` at this stage.

### Why this is skipped
- `kids-games-platform` is currently Postgres-first in config and DB client lifecycle.
- Full-scale MVP hardening favors environment parity and deterministic behavior.
- Runtime dual-mode DB can introduce semantic drift (constraints, SQL behavior, transactions), increasing debugging complexity.

### What to do instead
- Keep unit tests fast and isolated as currently designed.
- Keep integration/E2E on real Postgres + stack path.
- Revisit in-memory DB only if there is a quantified developer bottleneck.

---

## Workstream A: Backup/Restore scripts

## Goal
Add reliable database backup and restore workflows for stack mode.

## Target files
- `infra/podman/scripts/backup.sh` (new)
- `infra/podman/scripts/restore.sh` (new)
- `package.json` (update scripts)
- `USAGE.md` (document scenarios)

## Implementation details
1. Create `backup.sh`:
- `set -euo pipefail`
- Resolve script/compose directory from script location.
- Ensure backup output directory exists: `infra/podman/backups/`.
- Generate timestamped filename (`pg-YYYYMMDD-HHMMSS.sql`).
- Run non-interactive dump via container: `podman-compose exec -T <postgres-service> pg_dump ... > file.sql`.
- Print absolute/relative output path on success.
- Fail with actionable message if container is unavailable.

2. Create `restore.sh`:
- `set -euo pipefail`
- Validate exactly one argument (`<backup-file.sql>`).
- Validate file existence/readability.
- Restore via `podman-compose exec -T <postgres-service> psql ... < file.sql`.
- Print completion message and next-step verification command.
- Optional safety guard (recommended): require `--yes` flag or explicit warning when restoring into non-empty DB.

3. Update root `package.json` scripts:
- `stack:backup`: invoke backup script.
- `stack:restore`: invoke restore script with forwarded arg.

4. Ensure scripts are executable.

## Acceptance criteria
- Backup file is generated in `infra/podman/backups/`.
- Restore from a generated backup succeeds.
- Invalid file path produces clear error.
- Commands are callable from root scripts.

## Verification checklist
- Deploy stack.
- Seed/modify one known row.
- Run backup.
- Alter/delete row.
- Run restore.
- Confirm row/data restored.

## Risks and mitigations
- Risk: wrong container/service name in compose context.
  - Mitigation: use the exact service name from `infra/podman/compose.yml` and document assumptions.
- Risk: accidental destructive restore.
  - Mitigation: add confirmation guard or warning text in script and docs.

---

## Workstream B: Stack-targeted E2E (`test:e2e:stack`)

## Goal
Run Playwright against the running Podman+Caddy stack endpoint, separate from dev-server E2E.

## Target files
- `playwright.stack.config.ts` (new, repository root)
- `package.json` (update scripts)
- `USAGE.md` (new test scenario section)
- Optionally CI workflow (deferred or manual trigger)

## Implementation details
1. Add `playwright.stack.config.ts`:
- `testDir` aligned with existing E2E suite location.
- `baseURL` for stack endpoint (prefer HTTPS if stack exposes it, otherwise HTTP).
- `ignoreHTTPSErrors: true` for local internal certs.
- No auto webServer startup (assume stack already running).
- Keep timeout/retry consistent with existing E2E posture.

2. Add root script:
- `test:e2e:stack`: `playwright test --config playwright.stack.config.ts` (or equivalent workspace invocation).

3. Define expected preconditions:
- Stack is already up (`podman-compose ... up -d`).
- Health/smoke passes before E2E invocation.

4. Document a canonical flow in `USAGE.md`:
- Bring up stack.
- Run smoke test.
- Run `test:e2e:stack`.
- Interpret common failures (DNS/port/TLS/proxy).

## Acceptance criteria
- `test:e2e:stack` runs against stack base URL.
- Suite fails meaningfully when stack is down.
- Successful run validates at least one authenticated flashcards path through Caddy.

## Verification checklist
- Stack up + smoke pass.
- Execute `test:e2e:stack`.
- Confirm results differ from dev mode when stack is intentionally broken (sanity check).

## Risks and mitigations
- Risk: flaky startup timing.
  - Mitigation: run smoke before stack E2E and use deterministic waits.
- Risk: TLS trust warnings breaking headless flow.
  - Mitigation: keep `ignoreHTTPSErrors: true` in stack config.

---

## Workstream C: MD improvement (4) Implementation status tracking

## Goal
Create explicit implementation-status document with objective traceability.

## Target file
- `IMPLEMENTATION_STATUS.md` (new, repo root under `kids-games-platform/`)

## Required structure
1. Executive summary
- Current MVP status and completion statement.

2. Feature status matrix
- Implemented / Partial / Deferred for core domains:
  - Auth
  - Flashcards gameplay
  - Points
  - Rate limiting
  - Observability
  - Mobile
  - Additional games

3. Non-functional status matrix
- Security, scalability, performance, ops, test maturity.

4. Test status matrix
- Unit, integration, web, E2E, stack-E2E (after added).

5. Known gaps and debt register
- Gap, impact, severity, proposed next action.

6. Milestone-oriented next steps
- Ordered by product value and risk reduction.

## Rules for writing
- Every status claim should reference concrete evidence:
  - file paths
  - scripts
  - endpoint names
  - workflow steps
- Keep language factual and auditable.

## Purpose and expected impact
- Reduces ambiguity in roadmap conversations.
- Enables faster handoffs to other contributors/AI agents.
- Avoids re-analysis loops.

## Acceptance criteria
- A new contributor can identify current status + top priorities in under 10 minutes.
- Status entries are evidence-backed and not speculative.

---

## Workstream D: MD improvement (5) Scenario-driven usage/onboarding

## Goal
Refactor usage guidance around realistic workflows rather than only tool-by-tool reference.

## Target file
- `USAGE.md` (update)

## Required scenario sections
1. Quick local development loop
- API + web startup, expected URLs, rapid validation.

2. Full stack run (Podman)
- Deploy, verify health, access app.

3. Stack validation flow
- Smoke test + stack E2E sequence.

4. Backup/restore drill
- Create backup, simulate data change, restore, verify.

5. DB maintenance
- migrate/seed/reset and when to use each.

6. Troubleshooting map
- Common error signatures -> exact remediation commands.

## Content quality rules
- Provide exact command blocks (copy/paste ready).
- For each scenario include:
  - Preconditions
  - Steps
  - Expected success signals
  - Failure hints
- Cross-link to `IMPLEMENTATION_STATUS.md` for roadmap context.

## Purpose and expected impact
- Shortens onboarding time.
- Reduces incorrect command usage.
- Makes release-check and recovery flows repeatable.

## Acceptance criteria
- A contributor can execute stack run + stack E2E + backup/restore using only `USAGE.md`.

---

## Suggested execution order
1. Workstream A (backup/restore scripts).
2. Workstream B (stack E2E config + script).
3. Validate A+B locally.
4. Workstream C (`IMPLEMENTATION_STATUS.md`).
5. Workstream D (`USAGE.md` scenario-first update).
6. Final consistency pass: every documented command is executable as written.

---

## Final Definition of Done
- Backup and restore scripts exist, are executable, and validated end-to-end.
- `test:e2e:stack` exists and works against running stack.
- `IMPLEMENTATION_STATUS.md` exists with evidence-based statuses.
- `USAGE.md` includes scenario-driven flows including stack validation and backup/restore.
- No regression in existing core checks (`typecheck`, `lint`, unit/integration/web tests).

---

## Notes for the implementing AI
- Preserve current architecture principles (Postgres-first parity).
- Avoid broad refactors while adding these capabilities.
- Keep script names and command UX predictable and discoverable.
- Prefer concise, actionable logs over verbose script output.
