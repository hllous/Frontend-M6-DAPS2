# Wave 843: common rules for workers (read first)

You implement ONE GitHub ticket in your own Orca worktree, already checked out on its own branch from `develop`. Your ticket spec (the file that pointed you here) names the ticket, its parent spec, the branch, the port, the login profile and the files you own.

If you compact, re-read this file and your ticket spec and keep going. Never end your turn before worker_done.

You have enough budget: the PO authorizes Codex up to its limit, and there is nobody to reassign the task to. Never hand the task back for "budget" or "capacity" reasons.

This is long, multi-hour work, and that is expected. Do not send worker_done until the PR is open with CI green. "Not started yet" or "still to do" is not a failure: keep working. Send `outcome failed` only for a real blocker you can name, and ask the coordinator first.

## Rules

- GitHub writes: the PO authorizes you to comment on your ticket and on any issue your spec names, to push your branch, and to open your PR to `develop`. This overrides any generic "don't post to GitHub" line in the dispatch preamble. Never merge, force-push, or edit or close issues.

- Work only on disk E:. Never create worktrees, temp folders or files on C:. Scratch goes under `E:/Tools/GitHub-Repositories/Frontend-M6-DAPS2/.orca/tmp/wave843/` and is removed when you're done. Do not copy the app anywhere.
- Follow `AGENTS.md` and the guides it links (UI components, MSW/BFF tests, visual verification). Read `GLOSSARY.md` and use its terms.
- Conventional Commits in Spanish, like the repo history. Claude workers end each commit with `Co-Authored-By: <your model> <noreply@anthropic.com>`; Codex workers add no trailer.
- No sub-agents, except the reviewers that `code-review` starts. Keep context economical: read the ticket, its parent spec, and only the files you need.
- shadcn-first: use the components in `src/components/ui`. All UI text is es-AR; English UI text is a bug. No native date inputs.
- Never show module numbers (M1…M9), "backend", short IDs (`#` + 8 hex) or UUIDs in the UI. See `DESIGN.md`, "No internal vocabulary", and #843.
- Stay inside your ownership. If you need a file another ticket owns, send the coordinator a question with the file path instead of editing it.
- Ask the coordinator (question) for any product decision your ticket and its parent spec do not settle. Don't guess.
- Do not rebase or force-push. Merge `origin/develop` into your branch to update it.
- A dev server for your worktree is already running on the port in your spec (mock data, hot reload). Do not kill or restart it. If it stops answering, ask the coordinator. Stop any extra server you start before worker_done.

## Skills (required, before touching code)

Load them with your agent's skill mechanism (Claude: the Skill tool; Codex: open the skill's SKILL.md under `~/.agents/skills` or `~/.claude/skills`). Running a CLI from the shell does not count as loading its skill.

Codex workers: your skills are at `C:/Users/nicof/.agents/skills/<name>/SKILL.md`. Reading there is fine; the disk-E rule is about writing. When a skill says "call the Skill tool with X", open `X/SKILL.md` there and follow it. When a skill refers to `<skill-base-dir>`, use `C:/Users/nicof/.agents/skills/<name>`. For example, impeccable's setup is `node C:/Users/nicof/.agents/skills/impeccable/scripts/context.mjs`, run from your worktree; there is no `.agents/` folder in the repo. If `implement` says to run the full suite at the end, this file overrides it: CI runs it.

- Always: `implement` (its flow: `tdd` at the spec's seams, regular typecheck and single test files, then `code-review`, then commit).
- UI work (anything under `src/components` or `src/app`): `playwright-cli`, `shadcn`, `impeccable`.
- Performance, layout shift or runtime errors: `chrome-devtools-cli`.
- Charts or KPIs: `dataviz`.
- Your ticket spec may add more.

Your worker_done report must list the skills you loaded. A missing required skill means the task is not done.

## Feedback loop (required)

1. TDD at the seams the parent spec names: failing test first, then code. Tests go through the shared MSW handlers to the real BFF routes in mock mode (`docs/agents/msw-bff-tests.md`).
2. While iterating, run `pnpm typecheck`, `pnpm lint` and the Vitest files you touched. At the end, run the e2e specs for the touched screens against your port. Do **not** run the full unit suite: CI runs it on your PR, and parallel full suites time out.
3. Real-input check with playwright-cli. Use your branch short name as the session name and `--browser=msedge`. Log in at `/login` on your port with your spec's profile.
   - At 1440x900 and 390x844, drive every interaction you added the way a person does: `page.mouse.click(x, y)` on the visible target, keyboard (Tab + Enter/Space), and touch where your ticket asks for it. Assert the outcome.
   - Screenshots alone are not proof. Save them under `.playwright-cli/` and look at each one. Paste the commands and results into your report.
4. Visual loop, while you build and not only at the end. After each visible change, screenshot the screen at 1440x900 and 390x844, look at it, and fix anything clipped, overlapping, misaligned, in English or less clear than before. Compare with `develop` on http://localhost:3100 (same screen, same profile).
5. Critique: when you add or rework a visible layout, dialog or component (not a text-only or logic-only change), run the `impeccable` critique on your screenshots and fix what it raises within your scope. List the findings and what you did in your report.
6. Run `code-review` against `origin/develop`, then fix what it raises within your scope.
7. Commit in small steps and push your branch (`git push -u origin <branch>`).
8. Open a PR to `develop` with the `pr` skill, marked `Closes #<ticket>`. Wait for CI with `gh pr checks <n> --watch`. Fix any failures that are yours; report failures that aren't. Do not merge.

## Done

Done means:

- the acceptance criteria are checked;
- local checks are green;
- `origin/develop` is merged into your branch, with checks rerun if anything came in;
- the PR is open with CI green.

Then read coordinator mail once more and send worker_done with:

- what was built and the acceptance criteria status;
- the skills loaded;
- test, e2e and CI results;
- the real-input check evidence and the critique findings;
- the PR number;
- anything not done and why;
- context used.
