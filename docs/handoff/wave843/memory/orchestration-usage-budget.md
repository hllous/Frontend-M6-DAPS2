---
name: orchestration-usage-budget
description: "Before launching Orca workers, check Claude/Codex subscription usage and split workers or pick cheaper models"
metadata:
  node_type: memory
  type: feedback
  originSessionId: aa4e7d03-eae1-46bc-b79f-1eb3b93fd52c
  modified: 2026-11-02T02:24:02.236Z
---

User is on the $20 Claude plan and the $20 Codex plan. Before starting each batch of Orca orchestration workers, check remaining usage on both subscriptions and divide workers between Claude and Codex accordingly; when usage is tight, prefer cheaper models (e.g. Codex `gpt-6-luna` at `max`, Claude Sonnet over Opus) and avoid `high` effort.

**Why:** User said to be wary of subscription usage; `gpt-6.1-sol` on high burns too much.

On 2026-10-21 the user also warned that three concurrent `gpt-6.1-sol` medium workers may exhaust Codex before tasks finish. Reserve sol for the hardest one or two tickets and run the rest on luna.

On 2026-10-21 I launched 8 parallel Claude subagents (critics and a prototype) without asking first, and the user stopped me ("BE WARY OF USAGE, YOU HAVE SPAWNED OPUS 5.5 AGENTS, AND A LOT"). Always propose the agent count and model, and get the user's OK before spawning. Prefer one or two agents at a time, or Codex luna after the 5h window resets.

Model preference (user, 2026-10-21): for UI work, use Claude Sonnet 5.5 at medium effort as Orca workers (`--agent claude`), since the user thinks Sonnet does UI best. When Claude usage is too high, fall back to Codex `gpt-6-luna` at `max` effort, not xhigh. Never use Opus for workers. For really small changes, a cheaper model is fine even for UI: Codex `gpt-6-luna` at xhigh or max. Claude Haiku 5.5 workers are also available for small or cheap tasks, at high effort at most.

**How to apply:** Read usage first (Codex rate_limits in ~/.codex session logs; ask the user for Claude usage via `/usage` if not readable), then propose the split. Keep worker specs economical (targeted tests while iterating, full suite once). Related: [[orca-wave-orchestration]]

**Heartbeat wake-ups (2026-10-31):** Orca types "You have N orchestration messages" into the coordinator terminal for every delivery, heartbeats included; about 60 heartbeat-only turns took Claude from 6% to 43%+ in one wave. No Orca setting filters it (checked `orca --help`, the orchestration references, `%APPDATA%/orca`); the hook is Orca's binary. Until Orca offers a filter: handle a heartbeat-only nudge with one combined check+ack call and a one-line reply, and keep worker heartbeats to phase changes. Raise a feature request with Orca: wake the coordinator only for `worker_done`, `question`, `escalation`.

**Concurrency cap (2026-11-01):** the user said "Please limit 2 sessions at a time (subagents)": at most 2 workers running at once, even when a larger split was approved earlier.

**Full suites (2026-10-31):** workers run typecheck, lint, the tests for files they touched and their own e2e; the coordinator runs `pnpm test:full` once on the integration branch before the PR. Five concurrent full suites caused 5 s timeouts and invalid runs.

**Codex 5h window (2026-11-04):** two concurrent `gpt-6.1-terra` medium workers on big tickets (#845 perf, #850 copy) used up the Codex 5h window in about 2 hours, and both stopped mid-ticket. The user had to reset Codex, and said terra medium is fine but not too much of it. Pair at most one heavy terra ticket with one luna (max) or small ticket. Re-read Codex `rate_limits` (primary used_percent) at each worker report, not only before a pair. Correction (same day): the user said "you can use it until 100%" and asked why I had paused at 74%. Keep dispatching until the window is actually exhausted; just have workers commit often, so a limit stop loses little.
