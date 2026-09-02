# Git Flow — detail

Skeleton lives in `AGENTS.md`. This is the reference for the cases that come up occasionally, not every commit.

## PR checklist

- Compiles, tests pass, docs updated, no conflicts with `develop`.
- Description: what and why, Issue #XXX, changes, evidence.
- Contract changes (endpoints consumed from the M6 backend, shared types): notify the team, update docs, keep backwards compatibility when possible.

## Branch protection

Identical rules on `Backend-M6-DAPS2` and `Frontend-M6-DAPS2` — required `build`+`test` checks, linear history, no force-push, no deletion — already applied via GitHub API to `main`/`test`/`develop` on both repos. Reference: [`.github/branch-protection-rules.json`](../../.github/branch-protection-rules.json). Re-apply (idempotent) with [`.github/scripts/apply-branch-protection.ps1`](../../.github/scripts/apply-branch-protection.ps1) (needs `pwsh` + `gh` logged in as an admin).

## `hotfix/*` exception

For low-risk changes — docs, non-executable config, typos — that don't justify escalating `develop → test → main`. The only branch type that does **not** start from `develop`.

- Starts from `main`, format `hotfix/XXX-descripcion-corta` (same Issue-number rule as other branches).
- Opens **two PRs from the same branch**: `hotfix/XXX → main` and `hotfix/XXX → develop`. Same checklist, same green CI on both; can open and review both in parallel.
- **Don't delete the branch until both have merged** — deleting after the first merge (e.g. `--delete-branch` on the PR to `main`) leaves nothing to open the second PR from.
- `test` catches up on its own on the next `develop → test` promotion — no third PR needed.
- When in doubt whether something counts as "low-risk", use the normal `develop` flow instead.
