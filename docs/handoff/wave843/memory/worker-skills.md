---
name: worker-skills
description: "Worker specs must require loading tdd, plus playwright-cli/shadcn/impeccable for UI, plus chrome-devtools-cli for perf or layout, and the report must list them"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 02e5c841-118a-4d00-aeb7-778e0837614b
  modified: 2026-10-22T01:37:09.458Z
---

Every worker spec requires loading the recommended skills before code, and the worker_done report must list the skills loaded.
- Always: `tdd`.
- UI work: `playwright-cli`, `shadcn`, `impeccable`.
- Perf, jank, layout shift or runtime errors: `chrome-devtools-cli`.

This rule lives in `.orca/tmp/critique/fix-common.md`, under "Skills".

**Why:** On 2026-10-21 the PO asked "Did the workers use recommended skills?". The transcripts showed the Claude workers loaded none, and most Codex UI fixers skipped `shadcn` and `impeccable`. The PO approved adding the rule to the specs, but chose not to nudge workers that were already running.
**How to apply:** Include the rule in every new worker spec, and check the worker_done report for the list. Don't interrupt running workers about it unless the PO asks. See [[interaction-checks]].

2026-10-30: the PO repeated "the agents should use playwright for visual feedback, for them to check the work ... and if needed, a critique". Worker specs now require a Playwright screenshot loop after each visible change (both sizes, compared with develop on 3100), plus an `impeccable` critique when a layout, dialog or component is added or reworked, with findings listed in the report. The template is `.orca/tmp/impl753/common.md`, steps 4 and 5.

2026-10-31: chart work also requires `dataviz`. It is built into Claude Code; for Codex workers it is installed at `~/.agents/skills/dataviz` (SKILL.md + references + `scripts/validate_palette.js`).
