# AGENTS.md

## Contexto de dominio (backend)

Backend endpoints aren't modeled yet. [`docs/backend-context/`](docs/backend-context/) mirrors Backend's domain model and API standard (entities, enums, DER, Swagger convention) — read-only, dated per file; diverges from `Backend/docs/` over time. Event/integration docs (`eventos/`, `bloqueantes.md`) aren't mirrored: backend-to-backend traffic, not frontend-facing.

## Git Flow

`main ← test ← develop ← feature/*|bugfix/*|refactor/*|infra/*|docs/*`. Never commit directly to `main`/`test`/`develop`.

- Branches from `develop`: `tipo/XXX-descripcion-corta` (`XXX` = GitHub Issue number)
- Conventional Commits (`feat(scope):`, `fix(scope):`, `refactor(scope):`, `test(scope):`, `docs(scope):`, `chore(ci):`)
- PRs always target `develop`

Rare cases (PR checklist, branch protection reference, the `hotfix/*` exception): [`docs/agents/git-flow.md`](docs/agents/git-flow.md).

## Agent skills

### Issue tracker

Issues live in GitHub Issues (hllous/Frontend), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Cross-repo changes

Frontend and Backend are separate repos with separate issue trackers. When work here surfaces something the *other* repo needs to fix, add, or confirm — a backend gap, a contract question, a stale doc — file a GitHub issue in `hllous/Backend-M6-DAPS2` rather than only noting it locally (e.g. as a `CONTRACTS.md` "gap identified" row). Link back to whatever ticket/issue surfaced it. The same rule applies in reverse, from Backend to Frontend.

### Triage labels

Default canonical labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (CONTEXT.md + docs/adr/ at repo root). See `docs/agents/domain.md`.
