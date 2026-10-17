# Measuring the development loop

Use these scripts when recording development-loop timing changes. Run them
on an otherwise idle machine so another test run does not affect the result.
Keep failed runs in the raw data; a failed check is not a passing timing.

## Measure local steps

Run every step at least three times; `--runs` values below 3 are rejected.
The step subset may be selected with `--steps`, and dev-server steps use the
chosen `--port`:

```bash
node scripts/perf/measure-loop.mjs --out docs/perf/after-YYYY-MM-DD.json --runs 3
node scripts/perf/measure-loop.mjs --out docs/perf/after-YYYY-MM-DD-e2e.json --runs 3 --steps dev-server-ready,e2e-focused,e2e-full --port 4311
```

The available steps are `worktree-setup`, `dev-server-ready`,
`typecheck-cold`, `typecheck-warm`, `lint-cold`, `lint-warm`, `vitest-full`,
`e2e-focused`, `e2e-full`, and `build`. The e2e steps start and stop a
separate `next dev` process for every run. They fail before launch when the
port is already in use, verify that the listener belongs to the spawned
process tree, stop the listener and launcher, and wait for the port to become
free before recording a passing setup. The JSON records test counts and
failed test names for Vitest and Playwright, plus the launcher and listener
PIDs for the readiness step.

`worktree-setup` currently measures only `git worktree add` plus `npm ci`
with a warm npm cache. It does not include `.env.local`, copied skill folders,
or hooks, so treat it as a partial measurement of the #541 setup target.

The `build` step removes `.next` before every run. Run 1 is the first cold
machine build; runs 2 and 3 are repeat builds with a warm OS/process cache,
but still start with a cleared `.next`. Do not describe them as warm Next
builds.

Run the script regressions with:

```bash
npm run test:perf
```

The comparator rejects any step with fewer than three rows in either input
file. Use `--steps` to compare only selected measurements. The Oct 16 file
keeps historical readiness and full e2e rows without listener ownership or
port-shutdown checks, so exclude those rows and use the corrected files below:

```bash
node scripts/perf/compare.mjs docs/perf/baseline-2026-10-16.json docs/perf/after-2026-10-17-vitest-exclusions.json --steps vitest-full
node scripts/perf/compare.mjs docs/perf/baseline-2026-10-16.json docs/perf/after-2026-10-17-loop-parser.json --steps build
node scripts/perf/compare.mjs docs/perf/baseline-2026-10-17-readiness-fixed.json docs/perf/after-2026-10-17-readiness.json --steps dev-server-ready
node scripts/perf/compare.mjs docs/perf/baseline-2026-10-17-e2e-fixed.json docs/perf/after-2026-10-17-loop-parser.json --steps e2e-full
```

It reports median, minimum, maximum, absolute change, and percentage change
for each selected step in both files.

## Collect CI timings

Collect named successful `ci.yml` runs from a branch, then keep the JSON
with the PR's measurement report:

```bash
node scripts/perf/ci-timings.mjs --out docs/perf/ci-baseline-YYYY-MM-DD.json --branch develop --runs 5
```

The file records each GitHub Actions run ID, commit, wall time, job time,
and step time. Link the run IDs in the PR so the CI measurements can be
checked against their original runs.

## #571 provenance and results

The base application tree is `680b11f`. The first measurement rows (worktree
setup through focused e2e) ran at `680b11f`; the appended full e2e and build
rows ran at tool commit `c838ada` with the same app and e2e source tree. Both
segments are listed in the metadata of
[`baseline-2026-10-16.json`](../perf/baseline-2026-10-16.json). The original
full e2e batch did not log the listener PID or verify port release. Since the
old launcher only called `taskkill /T /F` and did not check the port afterward,
those rows could have reused a previous server; they remain historical data.

The readiness and e2e baselines were rerun three times with the fixed launcher
against the same `680b11f` app/e2e tree. The after batches used the same
reporter and fixed server lifecycle. The readiness files record launcher and
listener PIDs; the e2e files also record failed spec names. Every run confirms
that its server stopped before the next run. See the [corrected readiness
baseline](../perf/baseline-2026-10-17-readiness-fixed.json), [corrected e2e
baseline](../perf/baseline-2026-10-17-e2e-fixed.json), [after e2e
measurements](../perf/after-2026-10-17-loop-parser.json), and [after
readiness](../perf/after-2026-10-17-readiness.json).

| Step | Before median (min–max) | After median (min–max) | Change | Verdict |
| --- | --- | --- | --- | --- |
| Full Vitest ([before](../perf/baseline-2026-10-16.json), [after](../perf/after-2026-10-17-vitest-exclusions.json)) | 81.12 s (76.46–83.84) | 50.15 s (50.13–50.89) | -30.97 s (-38.2%) | 1,734 tests / 183 files; after passes |
| Dev server ready ([before](../perf/baseline-2026-10-17-readiness-fixed.json), [after](../perf/after-2026-10-17-readiness.json)) | 4.36 s (4.24–4.39) | 4.38 s (4.22–4.61) | +0.02 s (+0.5%) | `GET /login` rendered by the owned listener |
| Full e2e ([before](../perf/baseline-2026-10-17-e2e-fixed.json), [after](../perf/after-2026-10-17-loop-parser.json)) | 243.36 s (240.63–246.82) | 232.66 s (224.28–241.49) | -10.70 s (-4.4%) | Both sets fail; counts and names vary under shared mutable fixtures |
| Build, clean `.next` each run ([before](../perf/baseline-2026-10-16.json), [after](../perf/after-2026-10-17-loop-parser.json)) | 28.16 s (19.76–93.00) | 24.24 s (20.33–65.97) | -3.92 s (-13.9%) | All six builds pass; only the first run starts with cold machine caches |

The full e2e baseline runs failed 16, 12, and 19 tests; the after runs failed
19, 12, and 17 tests (the first two after runs also skipped one test). The
complete names are in the raw JSON. These changing results do not meet #541's
repeatability target and remain owned by #575. The earlier baseline's
“13/13/18” rows cannot be matched to exact spec names because that batch
stored counts only; the corrected baseline is the name-bearing comparison.

The build table groups three runs per step. Run 1 before/after was 93.00/65.97
seconds; runs 2–3 were 28.16/19.76 and 20.33/24.24 seconds. All six rows
cleared `.next`, so the repeat runs are machine-warm, not warm-cache Next
builds.

The before and after Vitest rows both used `npm test` with Vitest's default
reporter. The current measurement script uses the verbose reporter to retain
failed test names; collect both sides with the same script and reporter for
future comparisons.

The measured worktree setup median is 199.93 s (188.86–218.07), limited to
`git worktree add` plus `npm ci` with a warm npm cache. The full setup target
still needs measurements for `.env.local`, copied skills, and hooks.

CI baseline: five successful `develop` runs are in
[`ci-baseline-2026-10-16.json`](../perf/ci-baseline-2026-10-16.json). The
current PR's own run ID is added to its PR body after CI finishes.

## Vitest exclusions and probe

In a worktree with copied `.claude` skills, the unfiltered run collected 115
additional tests under `.claude/skills/archify/test`; they failed collection
because Vitest could not bundle the Node.js built-in `node:test`. Excluding
`.agents/**` and `.claude/**` leaves the project suite at 1,734 tests across
183 files, matching CI. The unfiltered run also failed
`src/components/map/mapa-operativo.test.tsx > MapaOperativo > presents every
point layer with a synchronized accessible list`; it passed in the full
excluded run and in isolation. See the
[Vitest diagnostic](../perf/vitest-copied-skills-diagnostic-2026-10-17.json).

The initial focused e2e diagnostic used the same exact command three times:

```powershell
node scripts/perf/measure-loop.mjs --out "$env:TEMP\measure-loop-e2e-focused-diag-1.json" --runs 1 --steps e2e-focused
node scripts/perf/measure-loop.mjs --out "$env:TEMP\measure-loop-e2e-focused-diag-2.json" --runs 1 --steps e2e-focused
node scripts/perf/measure-loop.mjs --out "$env:TEMP\measure-loop-e2e-focused-diag-3.json" --runs 1 --steps e2e-focused
```

Durations and results were 39.14 s (2 passed / 27 failed), 54.40 s (26 / 3),
and 47.49 s (27 / 2); all exited 1. The corresponding JSON logs are
`C:\Users\nicof\AppData\Local\Temp\measure-loop-e2e-focused-diag-1.json`,
`C:\Users\nicof\AppData\Local\Temp\measure-loop-e2e-focused-diag-2.json`,
and `C:\Users\nicof\AppData\Local\Temp\measure-loop-e2e-focused-diag-3.json`;
the committed summary is
[`focused-e2e-fresh-servers-2026-10-17.json`](../perf/focused-e2e-fresh-servers-2026-10-17.json).
The port was confirmed free after each diagnostic run, so those runs did not
reuse a stale server.

The failed `services.spec.ts` workspace test reads fixture `SVC-1043`; the
`attaches a crew without vehicle to an already-scheduled service` test in the
same file mutates `SVC-1043`. This is concrete shared fixture evidence for
issue #575, not proof that this collision caused every loading failure.

The deliberate failure probe is outside the normal suite. Run it locally
when checking that Vitest still fails on an assertion:

```bash
npm run test:failure-probe
```

It is expected to exit 1 and print `PERF_FAILURE_PROBE`; CI fails if it
unexpectedly passes or the marker is missing.
