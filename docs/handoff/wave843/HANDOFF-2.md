# Handoff 2: wave 843, Orca coordinator (paused 2026-11-04 ~22:30)

You are the **Orca coordinator** for the PO feedback wave filed on 2026-11-04 (issues #843–#849 and their children). You dispatch workers; you don't implement. Reply to the PO in English. This continues `HANDOFF.md` in this folder. Read that first for the original queue and rules, then this file. `STATE.md` (same folder) is the running log, with dispatch IDs and decisions in time order.

## Continuing on another machine

This folder is published on branch `chore/wave843-handoff` under `docs/handoff/wave843/` (`.orca/tmp/` is gitignored). Get it with `git fetch origin && git checkout origin/chore/wave843-handoff -- docs/handoff/wave843`, then copy it to `.orca/tmp/wave843/` (and `git restore --staged docs/handoff` so it doesn't land in a commit). On a new machine:

- **The Orca state doesn't travel.** The Run `run_ce76647d110e`, the dispatches and the worktrees exist only on the first PC. Ignore the "resume the stuck workers" commands below. Instead, create fresh worktrees from the pushed branches with `orca worktree create --repo <this repo's id> --name <n> --branch <existing branch> --base-branch origin/<branch>`. If `--branch` refuses an existing branch name, check out the remote branch in the new worktree. Then `worker-start --spec-file t<n>.md --worktree path:<new worktree>`, and send the resume note right after.
- **Paths:** the specs say `E:/Tools/GitHub-Repositories/Frontend-M6-DAPS2/...`. Replace that with this machine's repo path, keeping the user's "worktrees and scratch on disk E, under `.orca/tmp`" rule if there's an E: drive.
- **Memory:** the user's memory notes for this repo live on the first PC. Copies are in `memory/` next to this file. Read `memory/MEMORY.md` and the files it lists. To make them load automatically, copy them into this machine's Claude project memory folder (`~/.claude/projects/<project-slug>/memory/`).
- The user skills (`to-spec`, `to-tickets`, `implement`, …) live in `~/.claude/skills` (Claude) and `~/.agents/skills` (Codex). Check that this machine has them before relying on them.
- Codex and Claude usage limits are per account, not per machine, so check them again before dispatching.

## Read first

- `HANDOFF.md` and `STATE.md`, plus `common.md` (the rules every worker reads; it was extended during this session). The memory index loads automatically. The entries that matter most here: usage budget (**Codex may be used up to 100%**; at most 2 workers at once), Codex usage-limit recovery, PO preview before a UI merge, PR merges, worker skills.
- The per-ticket worker specs are `t<issue>.md` in this folder. Copy the pattern: an **"GitHub writes are authorized by the PO"** line at the top, owned files, port, profile, and integration-branch notes when relevant.

## What's done (merged into `develop`)

| PR | Ticket | Notes |
|---|---|---|
| #855 | #850 jargon check + copy | The integration monitor is renamed **"Eventos"** (PO). Event codes stay raw there (admin only). "Escalado" stays. |
| #856 | #845 map perf | **#845 stays open** until the PO checks it on `main` with real data. |
| #857 | #853 compact pager | |
| #858 | #844 Catálogo without the zones list | |
| #859 | #846 data/reading widths | Also moved the Eventos pager. |
| #866 | #854 Servicios filter bar | Follow-up still open: the services list cache (2 min TTL) isn't invalidated from other screens. |
| #868 | #852 header name | Also fixed the mock Lucía/Carlos bug. Real sessions show "Legajo N" until M1 has a name lookup contract (documented in the PR). |

## In progress

### Tableros B (#849 phase 2): integration branch

- The PO chose **variant B**. The decisions are in [#849 comment 6642867255](https://github.com/hllous/Frontend-M6-DAPS2/issues/849#issuecomment-6642867255). The tickets are sub-issues #861–#865.
- **PO rule:** all five slices land on `feature/861-dashboard-signals` (**PR #867**), and nothing goes to `develop` until the PO has **seen the whole screen** and said OK. Slice PRs target that branch. CI doesn't run on them (CI only covers PRs to develop/test/main), so after merging each slice: check #867's CI, then `git pull` in the `feature-861-dashboard-signals` worktree so the preview server shows it.
- Merged into the integration branch: #861 (cards plus a "Fuera de horario" Servicios filter, `?late=true`), #865 (PR #869, family detail one click away, URL-backed), #862 (PR #870, sparklines plus "Cobertura por semana", 40/48 px touch fix).
- **#867 CI is red** (head `aff052e`, unit shard 2/4), after #862:
  1. `src/lib/indicators-contract.test.ts` › "conserva comparaciones y metas sin número sin pedir series a familias sin tendencia": the sparklines now request series.
  2. `src/components/indicators/indicators-dashboard-loading.test.tsx` › "shows the trend module as a busy region with a skeleton…" (aria-busy).

  Update both to the new behaviour and run the **whole** `src/components/indicators` and `src/lib/indicators*` test files. Put this into #863's resume note.
- **#863** zone panel: spec `t863.md`, branch `feature/863-zone-panel` (pushed, no work yet). Its dispatch `ctx_26db0e19520b` is stuck on the Codex limit.
- **#864** (not started): Denuncias vencidas and Árboles con riesgo alto cards. Also carry these two #861 leftovers: (a) "Ver lista" turns custom date ranges into relative periods; pass the exact from/to. (b) The period buttons' selected colours should become a shared variant. Write `t864.md` from `t863.md`.
- When #863 and #864 are in and #867 is green: start a dev server on the 861 worktree, send the PO the preview (link, profile `office-duty-queue`, what to try, screenshots), and merge #867 into `develop` only after the PO's OK. Then delete the prototype: ask the PO whether to close **PR #860** and delete the branches `feature/849-prototype-screenshots`/`docs/849-prototype-screenshots` (that question was never answered).

### #851 no short IDs or UUIDs

- Spec `t851.md`, branch `feature/851-no-ids` (pushed). 8 commits plus a final **WIP commit** ("wip(ids): … sin verificar") that I made at pause time. It is unverified: typecheck, tests, e2e, real-input check, code-review, PR and the required Backend issue are all still to do.
- Decisions already given: `externalRef` (`M4-FINE-…`) is hidden and shown as "Multa registrada en Faltas" (flag it for the PO in the PR). `expectNoInternalJargon` gets ID/UUID patterns plus an explicit `{ allowTechnicalIds: true }` option, used only in the Eventos test. The containers "no respeta el contrato" message gets reworded.
- Its dispatch `ctx_d9dfc76ce700` is stuck on the Codex limit.

## How to resume the stuck workers (after Codex resets, 2026-11-05 02:13)

Mail can't reach a worker stopped by a usage limit. For each: `orca orchestration worker-stop --dispatch <id>`, then `orca orchestration worker-start --task <task_id> --retry-of <id> --worktree "path:<worktree>" --agent codex --model gpt-6.1-terra --effort medium`, then immediately `send` a resume note (what's done, the decisions, the next steps, "don't redo X"). Tasks: #851 `task_3dcfbac30a9a`, #863 `task_3ce980e175b5`. The Run is `run_ce76647d110e`. A new coordinator session may need `--run run_ce76647d110e` (or to bind to that Run) before worker-start accepts it. If not, check `orca orchestration --help`.

**Dev servers are all stopped.** Restart the ones you need, detached, with file logs (see the memory). `develop` on 3100; 3108 = `feature-861-dashboard-signals` (preview); 3109 = #863; 3110 = #851. Example:
`powershell.exe -NoProfile -Command "Start-Process -WindowStyle Hidden -FilePath cmd.exe -ArgumentList '/c','pnpm exec next dev -p <port> > <log> 2>&1' -WorkingDirectory '<worktree>'"`.

## Still queued after that

- **#848 mobile review** (Sonnet): blocked by #843, #844, #846 and #847. Ask the PO whether to close **#847** (both children #853 and #854 are merged) and **#843** once #851 merges. #848 starts with an audit comment and may need `to-tickets`.
- Follow-ups to file (with `to-spec`, PO rule): invalidate the services list cache from other screens (#854); the existing local e2e failures in `entry-and-roles` (citizen case) and the offline-draft tests (they pass in CI; check against #831 first).

## PO working rules learned this session (also in memory)

- Merge into `develop` yourself once CI is green, **except** visible UI, which the PO previews first. Tableros always gets a preview.
- Auto-merge is enabled on the repo; `develop` requires branches to be up to date, so `gh pr update-branch <n>` before each merge.
- terra workers often quit on the first turn ("budget", "capacity", "arrange continuation"). Answer firmly with numbered steps; `common.md` now forbids handing tasks back.
- Check workers' "CI green" claims with `gh pr checks`: one claim was false.
- Keep coordinator turns lean. Claude was at 61% and Codex at 73% before the reset.

## Suggested skills

`orchestration` and `orca-cli` (coordinator loop, worker-start/stop, recovery), `babysit` (PR/CI watching), `resolving-merge-conflicts` (integration-branch merges), `pr` (if you write a PR body). From `~/.claude/skills` (user-only; read the SKILL.md): `to-tickets` (#848 if needed), `to-spec` (new follow-up issues).
