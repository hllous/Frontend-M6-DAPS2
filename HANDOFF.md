# Handoff: M6 visual system and DESIGN.md

## Objective

Continue GitHub issue [Frontend #12 — Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12), which belongs to map issue [#6](https://github.com/hllous/Frontend-M6-DAPS2/issues/6). Keep iterating through one tangible design decision at a time until `DESIGN.md` is complete.

## Repository state

- Repository: `hllous/Frontend-M6-DAPS2`
- Branch: `feature/012-design-system-standard`
- Latest commit: `5c11443caac4ec3ebbfb1e420627f7fe7a682bb1` (`feat(design): capture approved visual system prototypes`)
- Commit is pushed to `origin/feature/012-design-system-standard`.
- The only remaining working-tree item was untracked `.claude/`, which is user-owned/local and was intentionally not committed.

Read the repository `AGENTS.md` before acting. The backend mirror under `docs/backend-context/` is read-only and should only be consulted when a decision depends on domain/API truth.

## Authoritative context

- Approved decisions and remaining decision categories: `DESIGN.md`
- Product context: `PRODUCT.md`
- Individual prototype questions, options, and recorded verdicts: `src/app/prototype/*/README.md`
- User-supplied process brief: locate `design-brief-message.md` in the current Windows user's Downloads directory and read it before continuing.

Do not restate or reinterpret the approved choices here; use `DESIGN.md` as the source of truth.

## Exact continuation point

The next prototype is already prepared, but the user has **not** selected a winner:

```powershell
npm run prototype:charts
```

Then open `http://localhost:3012/?chart=A` and ask the user to validate the chart-comparison decision. The three options are documented in `src/app/prototype/charts/README.md`. Option A was recommended, but must not be recorded as approved until the user explicitly chooses it.

After approval:

1. Record the verdict in `DESIGN.md` and `src/app/prototype/charts/README.md`.
2. Immediately prepare exactly one next pending design decision from `DESIGN.md`.
3. Present 2–3 tangible variants, recommend one, and wait for the user's validation before making that decision normative.

The user explicitly wants forward progress without permission prompts, but also explicitly wants every new design decision validated. Therefore, automatically build the next comparison after an approval; never auto-select its winner.

## Verification notes

- `node --check` passed for every prototype `server.mjs`.
- `node src/app/prototype/palette/contrast-check.mjs` passed all palette comparisons.
- `node .agents/skills/impeccable/scripts/detect.mjs --json` returned `[]` before commit.
- `git diff --check` passed, with only expected LF-to-CRLF warnings.
- `node_modules` is absent, so ESLint could not be executed. Do not claim lint has passed unless dependencies are installed in the next session.
- Prototypes are intentionally static HTML/CSS for quick comparison. Production components should follow the existing shadcn Base UI configuration in `components.json`.

## Suggested skills

- `wayfinder` — continue the issue/map workflow if available in the next session.
- `prototype` — build each focused, URL-switchable comparison.
- `impeccable` — preserve design quality, run context/detector guidance, and triage hook findings.
- `shadcn` — keep production recommendations aligned with the project's Base UI setup.
- `browser` — inspect desktop and mobile variants when local browser automation is available.
