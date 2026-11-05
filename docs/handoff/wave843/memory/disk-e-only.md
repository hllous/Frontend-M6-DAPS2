---
name: disk-e-only
description: All work (worktrees, temp files, scratch, worker outputs) must live on disk E:, never C:
metadata:
  type: feedback
---

Always work on disk E:. Never create worktrees, temp folders, scratch files or worker outputs on C: (not even the session scratchpad under AppData\Local\Temp). Use `E:/Tools/GitHub-Repositories/Frontend-M6-DAPS2/.orca/tmp/` (gitignored via `/.orca/`) for scratch, specs, reports and temporary baselines, and remove baselines when done.

**Why:** On 2026-10-21 the user found two detached develop worktrees a worker had created in `C:\Users\nicof\AppData\Local\Temp` and said: "ALWAYS work in disk E never in another disk".

**How to apply:** Put the E:-only rule in every worker spec. Point specs at `.orca/tmp/`. After a run, check `git worktree list` for anything outside E:. Related: [[orchestration-usage-budget]]
