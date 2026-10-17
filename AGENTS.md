# AGENTS.md

## Contexto de dominio (backend)

Backend has finished all seven phases of its plan: 134 REST routes in 23 Swagger tags, documented at `/api/docs`. [`docs/backend-context/`](docs/backend-context/) mirrors Backend's domain model, API standard and endpoint catalogue (entities, enums, DER, Swagger convention, `api/endpoints.md`) — read-only, refreshed 2026-10-13 from `develop` commit `d3b7b4a16c377d1a0f52915130803d1cb2433a22` (the previous copy was `30d49ea`, 2026-10-01); it diverges from `Backend/docs/` over time, so re-copy rather than edit. Event/integration docs (`eventos/`, `bloqueantes.md`) aren't mirrored: they describe backend-to-backend traffic, not the frontend-facing API.

`CONTRACTS.md` reads endpoint shapes off that mirror. Anything still marked `hypothesis` there is genuinely unconfirmed (capability names, M1's JWT claims, client-side-only rules) — not "Backend hasn't built it yet."

## Git Flow

`main ← test ← develop ← feature/*|bugfix/*|refactor/*|infra/*|docs/*`. Never commit directly to `main`/`test`/`develop`.

- Branches from `develop`: `tipo/XXX-descripcion-corta` (`XXX` = GitHub Issue number)
- Conventional Commits (`feat(scope):`, `fix(scope):`, `refactor(scope):`, `test(scope):`, `docs(scope):`, `chore(ci):`)
- PRs always target `develop`

Rare cases (PR checklist, branch protection reference, the `hotfix/*` exception): [`docs/agents/git-flow.md`](docs/agents/git-flow.md).

## Local e2e debugging

Running `npm run dev` yourself against a Playwright `PLAYWRIGHT_BASE_URL` (reproducing a CI e2e failure, rather than letting Playwright start and stop its own server) needs env vars `playwright.config.ts` only sets automatically for its own server, and stopping that server doesn't reliably free the port on Windows. See [`docs/agents/e2e-local-debugging.md`](docs/agents/e2e-local-debugging.md).

## Measured development loop

Full Vitest takes a median of 50.15 s (81.12 s before #571 excluded the copied `.agents/` and `.claude/` skills; same 1,734 tests across 183 files). Local full e2e still fails 12–19 tests per run, and which ones varies; shared mutable mock fixtures are one shown cause (#575). Commands, raw data and the failure probe: [`docs/agents/measuring-the-loop.md`](docs/agents/measuring-the-loop.md).

## Agent skills

### Issue tracker

Issues live in GitHub Issues (hllous/Frontend), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

At triage, have the orchestrator or a human run `to-spec` on every issue before implementation and publish it as a spec labelled `ready-for-agent`; when the work does not fit one worker context or one reviewable PR, also run `to-tickets` to publish `ready-for-agent` sub-issues with `Blocked by` edges. Let those skills ask the PO questions, assign one ticket to each implementing agent, and keep fixes found while reviewing an existing ticket under that ticket's spec.

### Cross-repo changes

Frontend and Backend are separate repos with separate issue trackers. When work here surfaces something the *other* repo needs to fix, add, or confirm — a backend gap, a contract question, a stale doc — file a GitHub issue in `hllous/Backend-M6-DAPS2` rather than only noting it locally (e.g. as a `CONTRACTS.md` "gap identified" row). Link back to whatever ticket/issue surfaced it. The same rule applies in reverse, from Backend to Frontend.

### Triage labels

Default canonical labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (GLOSSARY.md + docs/adr/ at repo root). See `docs/agents/domain.md`.

## Verify docs

Changing a `.md` file: run `npx --yes markdownlint-cli2@0.23.3` (Node 22+) and `lychee --config lychee.toml '*.md' 'docs/**/*.md' '.github/*.md'`; CI runs both in the `docs` job. Details: [`docs/README.md`](docs/README.md).

## Verification checklist

- While iterating, run the related Vitest tests with `npx vitest run <test-file>`.
- Before committing, run `npm run verify`, which runs typecheck, lint, and the
  full Vitest suite in parallel.
- Before marking work done, rerun `npm run verify` and run the Playwright specs
  for each touched screen or component with `npm run test:e2e -- <spec>`.

## UI components: shadcn as the base

### Rule

Build each UI element from its shadcn equivalent in `src/components/ui/`. Use a custom component only when shadcn has no equivalent; compose shadcn primitives, get PO approval, and document the exception.

### Base first, then adapt

1. Start with `npx shadcn add <component>` in `src/components/ui/`.
2. Adapt in order: app-wide visuals through theme tokens in `src/app/globals.css`, project variants in `src/components/ui/`, then shared project compositions in `src/components/ui/`.
3. Import from `src/components/ui/` in screens and add layout only.
4. Keep shadcn structure, `data-slot` attributes, and accessibility behavior intact.
5. Use CSS Modules for layout only; style component appearance through theme tokens or UI variants.
6. Format dates and times for `es-AR`, with Monday-first weeks, `dd/mm/aaaa`, and 24-hour time; preserve API value formats.

`eslint-suppressions.json` only shrinks; run `npx eslint . --prune-suppressions` after fixing violations; adding entries needs PO approval; tables are owned by #520 and skeletons by #525.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
