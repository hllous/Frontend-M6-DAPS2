---
name: orca-single-waiter
description: "Orca allows one active `check --wait` per Run; a second fails instantly with waiter_exists"
metadata:
  node_type: memory
  type: reference
  originSessionId: ae00c1e4-6025-4dad-9319-c16ffdbb99b3
  modified: 2026-10-21T19:11:09.783Z
---

Orca permits only one active `orchestration check --wait` per Run. Starting another while one is alive (for example a background wait left running) fails immediately with `waiter_exists`. If its output was discarded, that looks like an empty wait or a timeout.

**How to apply:** never send a background wait's output to `/dev/null`; print the tail so `waiter_exists` shows. Before starting a new wait, make sure the previous background wait has exited. If one is stale, find it with `Get-CimInstance Win32_Process | ? CommandLine -match 'orchestration check --wait'` and stop it. Related: [[orchestration-usage-budget]]
