---
name: codex-compaction-stall
description: "Codex (gpt-6-luna max) Orca workers often idle after context compaction (\"OK\" at the prompt) without worker_done; check terminals and nudge"
metadata:
  node_type: memory
  type: feedback
  originSessionId: c437836f-1a9d-469c-8f57-1d1e9239296f
  modified: 2026-11-01T00:36:06.482Z
---

Codex Orca workers on `gpt-6-luna` at max effort frequently stop after a context compaction: the terminal shows "Context compacted · OK" and the `› Ask Codex to do anything` prompt, with uncommitted work and no worker_done. On 2026-10-31 this hit #774, #778 and the #773 reviewer (20–40 min idle each). `worker-list` reports them `unverifiable` / `stale_status`, not exited.

**Why:** a stalled worker looks identical to a slow one from the inbox; only the terminal shows it, and the PO asked for status repeatedly while two workers sat idle.

**How to apply:**
- When a `check --wait` times out, or a worker has been quiet a long time, read its terminal: `orca terminal read --terminal <handle> --json` (the text is in `result.terminal.tail`).
- If it is at the prompt after "Context compacted", nudge with `orca terminal send --terminal <handle> --text "<where it stopped + next steps + 'do not end your turn before worker_done'>" --enter`.
- Put in every Codex spec: "If you compact, re-read this file and keep going; never end your turn before worker_done." Workers that had this line recovered by themselves.
- Reusing a settled Codex terminal for a follow-up (`worker-start --terminal`) failed (`terminal_worktree_mismatch`, then `agent_unconfigured`); start a fresh worker instead.
Related: [[orchestration-usage-budget]], [[orca-single-waiter]]
