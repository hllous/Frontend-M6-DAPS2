# Git Flow — detail

Skeleton lives in `AGENTS.md`. This is the reference for the cases that come up occasionally, not every commit.

## PR checklist

The checklist lives in the PR template, [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md), and GitHub pre-fills it on every PR. Edit the template, not a copy of it here.

## Branch protection

Classic branch protection (not rulesets) on `main`/`test`/`develop`: required `build`+`test`+`docs` checks, strict, linear history, no force-push, no deletion; admins are not enforced. `Backend-M6-DAPS2` has no `docs` job, so its rules differ. The `docs` job has no path filter on purpose: a required check that never reports blocks the merge.

Change the required checks per branch with a `PATCH` on `required_status_checks`:

```bash
gh api --method PATCH repos/hllous/Frontend-M6-DAPS2/branches/<branch>/protection/required_status_checks -F strict=true -f 'contexts[]=build' -f 'contexts[]=test' -f 'contexts[]=docs'
```

[`.github/scripts/apply-branch-protection.ps1`](../../.github/scripts/apply-branch-protection.ps1) is outdated: it sets only `build`+`test`, so running it would drop `docs`. [`.github/branch-protection-rules.json`](../../.github/branch-protection-rules.json) is in ruleset format and is not what's applied.

## `hotfix/*` exception

For low-risk changes — docs, non-executable config, typos — that don't justify escalating `develop → test → main`. The only branch type that does **not** start from `develop`.

- Starts from `main`, format `hotfix/XXX-descripcion-corta` (same Issue-number rule as other branches).
- Opens **two PRs from the same branch**: `hotfix/XXX → main` and `hotfix/XXX → develop`. Same checklist, same green CI on both; can open and review both in parallel.
- **Don't delete the branch until both have merged** — deleting after the first merge (e.g. `--delete-branch` on the PR to `main`) leaves nothing to open the second PR from.
- `test` catches up on its own on the next `develop → test` promotion — no third PR needed.
- When in doubt whether something counts as "low-risk", use the normal `develop` flow instead.
