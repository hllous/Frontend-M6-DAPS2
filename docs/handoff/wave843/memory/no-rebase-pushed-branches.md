---
name: no-rebase-pushed-branches
description: "Update already-pushed PR branches by merging develop, never rebase + force-push; Claude auto mode blocks force-push"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 758a7163-ce91-409d-af80-8b25514e7219
  modified: 2026-10-23T19:17:24.826Z
---

Worker specs must say: update an already-pushed branch with `git merge origin/develop` (or `gh pr update-branch <n>`), never rebase + force-push. Rebase is fine only before the first push.

**Why:** On 2026-10-23 the #651 Claude worker rebased PR #682 and the push was blocked; Claude Code's auto-mode classifier denies force-push as "Git Destructive" for workers and coordinator alike, even when the user asks in chat. Codex workers could force-push. The user chose merge over force-push; PRs land squashed on develop (linear history), so merge commits in a PR branch don't matter.

**How to apply:** Put the rule in every spec's Workspace section. If a branch is already rebased locally, `git merge origin/<branch>`, take the local tree (`git checkout HEAD -- .`), commit, push normally. Related: [[orchestration-usage-budget]]
