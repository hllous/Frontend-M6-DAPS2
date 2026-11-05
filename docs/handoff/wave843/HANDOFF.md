# Handoff: wave 843 (PO feedback of 4/11/2026), Orca coordinator

You are the **Orca coordinator** for the PO feedback batch filed on 2026-11-04. You dispatch workers; you don't implement. Reply to the PO in English.

## Read first

- The specs are GitHub issues #843–#849, `ready-for-agent`. Read each spec body before writing its worker spec; don't restate them.
- Tickets:
  - #843 is split into #850, #851 and #852.
  - #847 is split into #853 and #854.
  - Blocking edges are native GitHub dependencies (`issue_dependencies_summary`).
- Worker rules: `E:/Tools/GitHub-Repositories/Frontend-M6-DAPS2/.orca/tmp/wave843/common.md` (already written). The per-ticket specs `t<issue>.md` are yours to write in the same folder. Each one is short: the ticket and parent links, branch, port, login profile, files owned, extra skills, and `Read common.md first`.
- The memory index loads automatically. The entries that matter here: usage budget (**at most 2 workers at once**), single waiter, disk E only, dev servers with file logs, worker skills, Codex compaction stall, PR merges.

## Queue (2 slots)

Pair a ticket that touches the app shell with one that doesn't. #850, #844, #846 and #852 all touch the shell or the no-role screen.

| Step | Tickets | Model | Notes |
|---|---|---|---|
| 1 | #845 map perf, #850 copy + jargon check | terra, terra | #845 diagnoses first. If its measurements look shaky, move it to Sonnet. #850 first posts its audit rows on #843 for the PO. |
| 2 | #853 pager, #844 Catálogo | terra, luna (small) | |
| 3 | #846 width, #849 prototype phase only | terra, Sonnet | #849: 2–3 variants on a throwaway route, plus a research comment. The PO picks one. |
| 4 | #852 header name, #851 IDs | terra, terra | #851 is blocked by #850, and #852 must wait until #850 has merged. |
| 5 | #854 filter bar | Sonnet | Blocked by #853, #845, #846. |
| 6 | #848 mobile review | Sonnet | Blocked by #843, #844, #846, #847. It starts with an audit comment and may need `to-tickets`. |
| later | #849 phase 2 | | After the PO picks a variant: add the decisions to #849, then run `to-tickets`. |

Models:

- Sonnet 5.5 is Claude Sonnet 5.5 at medium effort (`--agent claude`).
- terra is Codex `gpt-6.1-terra` at medium effort.
- luna is Codex `gpt-6-luna`.

Read usage before each pair (Codex rate limits in the `~/.codex` session logs; ask the PO for `/usage` on Claude). If usage is high, switch to luna at max effort. Never use Opus for workers.

## PO decisions not written in the specs

- Workers follow `implement`, not `implement-spec`: one ticket, one branch, one PR to `develop`.
- CI runs the full suite on each PR. Workers don't, and neither do you, unless an integration branch shows up.
- Merging: offer the PO `!` lines (`gh pr merge <n> --squash`) once CI is green. Merge yourself only if the PO says "do it yourself".
- Run `to-spec` on any new issue that comes up.
- Gates that need the PO: the extra copy rows from #850 (comment on #843), and the #849 prototype choice.

## Before the first dispatch

- `git pull` on `develop`. Check `gh issue list` and `gh pr list` for teammate work that overlaps these issues.
- Start the dev servers yourself, with file logs: `develop` on 3100, plus one per worker worktree. Workers never start them.
- Worktrees go under `.orca/worktrees/Frontend-M6-DAPS2/`. Name branches `feature/<n>-<slug>` (or `perf/…`, following the repo).

## Suggested skills

`orchestration` and `orca-cli` (coordinator loop, terminals, nudges), `babysit` (PR and CI watching), `to-tickets` (#848 and #849 phase 2), `to-spec` (new issues), `pr` (if you write a PR body), `resolving-merge-conflicts`.
