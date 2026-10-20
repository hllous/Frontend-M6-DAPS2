# AGENTS.md

## Backend context

[`docs/backend-context/`](docs/backend-context/) mirrors Backend's domain model, API standard and endpoint catalogue (Swagger at `/api/docs`). It is read-only: fix differences in Backend, then re-copy from its `develop`. `CONTRACTS.md` reads endpoint shapes off it; `hypothesis` there means Backend has not confirmed the shape (capability names, M1's JWT claims, client-side-only rules).

## Git Flow

`main ← test ← develop ← feature/*|bugfix/*|refactor/*|infra/*|docs/*`. Commit on a working branch; `main`/`test`/`develop` change only through PRs.

- Branches from `develop`: `tipo/XXX-descripcion-corta` (`XXX` = GitHub Issue number)
- Conventional Commits (`feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(ci):`, …)
- PRs always target `develop`

## Guides

Read the one whose trigger applies:

- Opening a PR, branch protection, or a `hotfix/*`: [`docs/agents/git-flow.md`](docs/agents/git-flow.md)
- Creating, triaging or splitting issues (`to-spec`, `to-tickets`, labels): [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)
- Reproducing a CI e2e failure against your own `pnpm dev`: [`docs/agents/e2e-local-debugging.md`](docs/agents/e2e-local-debugging.md)
- Checking a UI change in the running app (screenshots, `playwright-cli`): [`docs/agents/visual-verification.md`](docs/agents/visual-verification.md)
- Adding or changing a `src/mocks` handler, or testing a BFF route: [`docs/agents/msw-bff-tests.md`](docs/agents/msw-bff-tests.md)
- Editing the Orca worktree setup script: [`docs/agents/orca-worktree-setup.md`](docs/agents/orca-worktree-setup.md)
- Changing any `.md`: run `pnpm dlx markdownlint-cli2@0.23.3` and `lychee --config lychee.toml '*.md' 'docs/**/*.md' '.github/*.md'`; CI runs both. Details: [`docs/README.md`](docs/README.md)

## Cross-repo changes

When work here surfaces something Backend must fix, add, or confirm — a gap, a contract question, a stale doc — file a GitHub issue in `hllous/Backend-M6-DAPS2` rather than only noting it locally (e.g. as a `CONTRACTS.md` "gap identified" row), and link back to the ticket that surfaced it. The same applies in reverse.

## Domain

Read `GLOSSARY.md` and the `docs/adr/` entries that touch your area before working in it; use the glossary's terms.

## UI components: shadcn-first

Build each UI element from its shadcn equivalent in `src/components/ui/`. A custom component is an exception: allowed only when shadcn has no equivalent, composed from shadcn primitives, approved by the PO, and documented.

Adapt in order: app-wide visuals through theme tokens in `src/app/globals.css`, project variants in `src/components/ui/`, then shared project compositions there. Screens import from `src/components/ui/` and add layout only. Keep shadcn structure, `data-slot` attributes, and accessibility behavior intact. Use CSS Modules for layout only; style appearance through theme tokens or UI variants.

`eslint-suppressions.json` is a ratchet: it only shrinks. Run `pnpm exec eslint . --prune-suppressions` after fixing violations; new entries need PO approval. Tables belong to #520 and skeletons to #525.

Format dates and times for `es-AR`, with Monday-first weeks, `dd/mm/aaaa`, and 24-hour time; preserve API value formats.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
