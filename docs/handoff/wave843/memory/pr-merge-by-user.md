---
name: pr-merge-by-user
description: "PR merges: offer the user `!` lines by default; if they say \"do it yourself\", gh pr merge has worked (2026-10-28)"
metadata:
  node_type: memory
  type: reference
  originSessionId: 758a7163-ce91-409d-af80-8b25514e7219
  modified: 2026-10-29T00:59:41.423Z
---

By default, hand the user ready `! gh pr merge <n> --squash` lines. On 2026-10-23 Claude Code's auto-mode classifier blocked `gh pr merge` ("Merge Without Review") and PR comments claiming PO approval ("Self-Approval"). On 2026-10-28 the user said "do it yourself" and `gh pr merge --squash` ran fine (#728–#731). So merge directly when the user explicitly asks, and fall back to `!` lines if it gets blocked.

`develop` is strict (branch must be up to date). After one merge, the next PR shows `BEHIND`: run `gh pr update-branch <n>` and wait for green CI. Two PRs that each prune `eslint-suppressions.json` conflict: merge `origin/develop` in and keep both sets of removals. `--delete-branch` fails locally while a worktree holds the branch; remove the worktree first. Related: [[no-rebase-pushed-branches]]

On 2026-11-02 the PO said "You can merge to develop tho": for orchestration waves, merge each PR into `develop` yourself once CI is green. Auto-merge was enabled on 2026-11-04: after `gh pr update-branch <n>`, run `gh pr merge <n> --squash --auto`. Strict up-to-date still applies, so after each merge update the next PR's branch. "Closes #n" in a PR to `develop` may close the issue only after a delay, because `develop` isn't the default branch; confirm, and close it by hand if needed. Teammates sometimes merge their own PR for the same ticket mid-wave (#826 superseded our #827): check `git log origin/develop` before merging a long-running worker's PR.
