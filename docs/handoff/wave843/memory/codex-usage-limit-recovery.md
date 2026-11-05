---
name: codex-usage-limit-recovery
description: After a Codex usage-limit error, Orca mail and replies never wake the worker; recover with worker-stop + worker-start --retry-of
metadata:
  type: feedback
---

When a Codex worker hits its usage limit (escalation `failureKind: usageLimitReached`), Orca keeps the dispatch at `input_accepted / in_progress`. `orchestration send` queues until a turn end that never comes, replying to the `msg_chaterr_*` id doesn't wake it, and `orca terminal send` is refused (`terminal_unsupported_for_agent_session`: structured chats aren't terminals).

**Why:** on 2026-11-04 I first told the user to click retry in the chats. The user said to use the Orca CLI and orchestration myself.

**How to apply:** once the limit resets, run `orca orchestration worker-stop --dispatch <id>`, then `worker-start --task <task> --retry-of <id> --worktree path:<wt> --agent codex --model … --effort …`, then `send` a resume note right away: what's done, the settled decisions, the next steps, and "don't redo the baseline". Stopping closes the chat, so its history is lost but the worktree is kept. `--task` can't be combined with `--spec-file`, so the resume note has to go as mail. Better still, avoid the limit: see [[orchestration-usage-budget]]. Related: [[codex-compaction-stall]].
