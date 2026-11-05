# Wave 843 coordinator state (2026-11-04 ~16:00)

Run: run_ce76647d110e. Both step-1 workers are paused by the Codex usage limit (resets 8:20 PM). Chat history is kept.

| Ticket | Dispatch (current) | Worktree / port | State |
|---|---|---|---|
| #845 | ctx_f5681e8d6f52 | perf-845-map-load / 3101 | before table posted (#845 comment 6638741172, plus cold rows); store implementation in progress, 19 files uncommitted |
| #850 | done | PR #855, CI green, waiting for PO merge |
| #844 | (luna) | feature-844-catalog-no-zones-list / 3103 | started |

Resume: `orca orchestration send --to dispatch:<id> --subject "Resume" --body "Codex limit reset. Re-read t<n>.md and common.md, then continue where you left off."`
Dev servers 3100/3101/3102 run detached (logs dev-<port>.log).
PO decisions: measure #845 on the dev server, never bypass the auth guard; Accesos names belong to #852; English event types get translated in #850 with the table in the PR; "Escalado" stays.
Usage: Claude 35%, so keep coordinator turns lean. Step 2 goes on luna (max effort) if Codex is still high.

## Update ~16:40
- #845 is done: PR #856, CI green. #850 is done: PR #855, CI green. Both are waiting for the PO to merge. They share 4 files (src/lib/{containers,green-points,green-spaces,trees}.ts): merge #855 first, then merge develop into #856.
- Running: #844 (luna max, ctx_5ac24e84e96f, port 3103) and #853 (terra, ctx_bba402980ce9, port 3104).
- For the #854 spec: Mapa→Servicios is still about 2.9 s because Servicios refetches its services list (per #845's diagnosis). Have #854 cache or keep that list when it rebuilds the filter state.
- Possible new bug (also happens on develop): logging in as Carlos Rodríguez (office-duty-queue) shows Lucía Fernández in the header. It needs to-spec, and it touches #852.
- Codex 5h window at 42% at 16:32, resets about 21:03.
- PO 2026-11-04: integration monitor is named 'Eventos'; event codes stay raw (admin only). Specs #851/#852/#853 follow-up: say 'Eventos', not 'Conexiones con otras áreas'. #845 stays open until the PO checks it on main with real data.
- 17:40: merged #858, #857, #856. #855 merged develop in (conflict in green-points/trees resolved: kept the copy plus notifyMapInventoryChanged), auto-merge queued. Pending: the Eventos pager migration (the #853 follow-up on #847).
- ~17:55: cleanup done. Removed the 844/845/850/853 worktrees and branches, the 9 empty old folders, and 10 stale local branches (all identical to origin). Stopped servers 3101–3104 and the leftover next start on 3111. Still running: 3100 (develop), 3105 (#846), 3106 (#849).
- Running: #846 terra ctx_8d46c5d551c5 (3105); #849 phase 1 Sonnet ctx_96efcd27323a (3106).
- Usage rule corrected by the PO: Codex may be used until 100%.
- For the #854 spec: Servicios still clips the Fecha column at 1920 px after #846. Fix the map/table split (#847 decision: key columns fit at 1920 with no horizontal scroll).
- ~18:30: #846 merged (PR #859); its worker was stopped by the Codex limit after pushing, so I added the Fecha note and merged it myself; worktree and 3105 removed. Codex is out until 21:03.
- Running: #854 Sonnet ctx_4d0bbede812e (3107). Waiting for the PO: #849 variant pick (prototype on 3106, PR #860 not to be merged), and the Lucía/Carlos bug.
- Next after 21:03 (Codex): #852 header name and #851 IDs on terra (both unblocked). #848 mobile review after #854 (#847 closes when #854 merges).
- ~19:00: the PO picked #849 variant B. Decisions are on #849 (comment 6642867255). Phase 2 tickets #861–#865 are sub-issues of #849; #861 is blocked by #854, and #862–#865 by #861. Prototype worktree and 3106 stay until #860 is closed. Scratch t849p2/ holds the ticket bodies (delete at wave end).
- #854 merged (PR #866). Its worktree and 3107 are removed. #861 is unblocked in code (its 854 edge closes once 854 closes). Follow-up: the services list cache isn't cleared from other screens (2 min TTL).
- #861: PR #867, CI green. Sent back for a 'Fuera de horario' Servicios filter (PO decision) plus the shadcn and dataviz skills.
- PO rule: show the dashboard UI (#861–#865) before merging; keep 3108 running for the review.
- ~21:10, PO decision: build all of #861–#865 on the integration branch feature/861-dashboard-signals (PR #867) and show the whole B screen before merging to develop. Slice PRs target that branch; CI doesn't run on them, so after merging each one, check #867's CI. Then git pull in the 861 worktree so 3108 shows the combined result.
- Order: #865 (terra, 3109) + #852 (terra, 3110, includes the Lucía bug) → #862 + #863 → #864 + #851.
- #852 merged (PR #868; it also fixed the Lucía bug). #851 started on terra (3110).
- #865 merged into the integration branch (PR #869); its worktree and 3109 were removed and 3108 pulled. #862 started on terra (3109).
- For #864's spec: (a) "Ver lista" turns custom date ranges into relative periods, which is wrong; pass the exact from/to. (b) Move the period buttons' selected colours into a shared variant.
- #862 merged into the integration branch (PR #870, which includes the 40/48 px touch fix for ui-primitives). #863 started on terra (3109).
- ~22:15: Codex is out until 2026-11-05 02:13. #851 (ctx_d9dfc76ce700) stopped with 8 commits plus 8 dirty files, NOT pushed (worktree feature-851-no-ids). #863 (ctx_26db0e19520b) had just started and will stop too.
- #867 CI on aff052e: unit shard 2/4 fails after #862. (1) indicators-contract.test "conserva comparaciones y metas sin número sin pedir series a familias sin tendencia" (the sparklines now request series); (2) indicators-dashboard-loading.test "shows the trend module as a busy region…" (aria-busy). The fix goes into #863's resume note: update both tests to the new behaviour and run the whole indicators test folder.
- Recovery after the reset: worker-stop + worker-start --retry-of (same worktree) + resume mail (see memory codex-usage-limit-recovery).
- ~22:30: paused by the PO. Everything is committed and pushed (#851 has a WIP commit; the #863 branch was pushed empty). All dev servers are stopped. Next session: read HANDOFF-2.md.
