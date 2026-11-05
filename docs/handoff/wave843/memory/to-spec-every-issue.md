---
name: to-spec-every-issue
description: Every issue gets /to-spec before implementation (even small bugs); /to-tickets when too big for one PR. Skills are user-level in ~/.claude/skills.
metadata:
  node_type: memory
  type: feedback
  originSessionId: ca8d3b96-ccf7-4f6c-a59e-c4bc525726cc
  modified: 2026-10-30T01:55:20.451Z
---

Run `to-spec` on every issue before implementing it, including small, well-specified bugs; also run `to-tickets` when the work doesn't fit one worker context or one reviewable PR. Written in `docs/agents/issue-tracker.md`.

**Why:** PO rule since 2026-10-15. On 2026-10-29 I told the user small bugs (#736) didn't need a spec and said to-spec wasn't installed; both were wrong.

**How to apply:** the skills live at `~/.claude/skills/to-spec/SKILL.md` and `to-tickets/SKILL.md` (user-level, `disable-model-invocation`, so they don't show in the Skill listing): read the SKILL.md and follow it. Ask the PO the seam question with AskUserQuestion. Record the split decision in the issue before dispatch.
