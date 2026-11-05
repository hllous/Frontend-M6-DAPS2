---
name: scratch-junctions
description: "Worker scratch app copies may link node_modules to a real worktree; check for links before deleting, never plain rm -r"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 02e5c841-118a-4d00-aeb7-778e0837614b
  modified: 2026-10-22T01:43:16.615Z
---

Before deleting a worker's scratch folder, list its symlinks and junctions (`find <dir> -maxdepth 3 -type l`, or `dir /AL /S` on Windows) and unlink them first.

**Why:** On 2026-10-21 a Haiku worker made `.orca/tmp/r3/app`, a copy of the app whose `node_modules` linked to the #659 worktree. Running `rm -r .orca/tmp/r3` followed the link and deleted `next` from that worktree, which broke the 3103 server (500 errors). It was fixed with `pnpm install --frozen-lockfile --prefer-offline --force` in the worktree. A scratch copy containing a lockfile can also change Turbopack's root detection for running servers.
**How to apply:**
- Tell workers not to copy the app; they should run tests against the PR's existing server.
- When cleaning up, check for links before deleting, then probe the affected servers in a real browser.
- See [[dev-servers-file-logs]].

2026-10-31: a worker's `playwright-cli` session daemon (`node ...cliDaemon.js <session>` plus headless msedge) keeps running after the worker is released and holds its worktree folder open ("Device or resource busy"), so `orca worktree rm` succeeds but the folder and the Orca card stay. Before removing worktrees, kill leftover `cliDaemon.js` processes and their `playwright_chromiumdev_profile` msedge children (`taskkill /PID <daemon> /T /F`). Long paths in `node_modules` also break `git worktree remove`; `robocopy <empty> <dir> /MIR /XJ` then `rmdir /s /q` clears them without following junctions.
