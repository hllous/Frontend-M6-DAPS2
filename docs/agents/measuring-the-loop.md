# Measuring the development loop

Use these scripts when recording development-loop timing changes. Run them
on an otherwise idle machine so another test run does not affect the result.
Keep failed runs in the raw data; a failed check is not a passing timing.

## Measure local steps

Run every step three times:

```bash
node scripts/perf/measure-loop.mjs --out docs/perf/after-YYYY-MM-DD.json --runs 3
```

Use `--steps` to select a subset and `--port` to choose the dev-server port:

```bash
node scripts/perf/measure-loop.mjs --out docs/perf/after-YYYY-MM-DD-vitest.json --runs 3 --steps vitest-full
node scripts/perf/measure-loop.mjs --out docs/perf/after-YYYY-MM-DD-e2e.json --runs 3 --steps e2e-focused,e2e-full --port 4311
```

The available steps are `worktree-setup`, `dev-server-ready`,
`typecheck-cold`, `typecheck-warm`, `lint-cold`, `lint-warm`, `vitest-full`,
`e2e-focused`, `e2e-full`, and `build`. The e2e steps start and stop a
separate `next dev` process for every run. The JSON records each step's
duration, commit, date, machine, exit code, and test summary.

## Compare local results

The comparison script reports median, minimum, maximum, absolute change,
and percentage change for steps present in both files:

```bash
node scripts/perf/compare.mjs docs/perf/baseline-2026-10-16.json docs/perf/after-YYYY-MM-DD.json
```

## Collect CI timings

Collect named successful `ci.yml` runs from a branch, then keep the JSON
with the PR's measurement report:

```bash
node scripts/perf/ci-timings.mjs --out docs/perf/ci-baseline-YYYY-MM-DD.json --branch develop --runs 5
```

The file records each GitHub Actions run ID, commit, wall time, job time,
and step time. Link the run IDs in the PR so the CI measurements can be
checked against their original runs.

## #571 baseline and current results

The local baseline was measured on Windows 10.0.26300, an AMD Ryzen 7
9800X3D workstation with 16 logical cores, and Node.js 22.19.0. The base
application code was `680b11f`; the appended full e2e and build rows were
measured on the same application tree with the measurement tooling at
`c838ada`.

| Step | Baseline median (min–max) | Result |
| --- | --- | --- |
| Worktree setup | 199.93 s (188.86–218.07) | `git worktree add` plus `npm ci` with a warm npm cache |
| Dev server ready | 4.20 s (4.06–5.62) | Cold `.next`, until `GET /login` renders |
| Typecheck cold | 10.78 s (10.71–11.52) | `npm run typecheck` |
| Typecheck warm | 4.08 s (4.08–4.09) | `npm run typecheck` |
| Lint cold | 14.63 s (14.28–15.15) | ESLint has no cache enabled |
| Lint warm | 14.04 s (13.74–14.49) | ESLint has no cache enabled |
| Full Vitest before #571 | 81.12 s (76.46–83.84) | 1,734 tests/183 files; baseline rows exit 1 |
| Full Vitest after #571 | 50.15 s (50.13–50.89) | 1,734 tests/183 files; all pass; -30.97 s (-38.2%) median |
| Focused e2e | 127.55 s (115.50–173.58) | The recorded runs failed 3, 9, and 14 tests |
| Full e2e | 220.46 s (212.04–230.40) | Fresh-server runs failed 13, 13, and 18 tests; not a passing-suite timing |
| Build | 28.16 s (19.76–93.00) | All passed; the first run was the cold outlier |

Raw local data: [baseline](../perf/baseline-2026-10-16.json),
[full-suite after-runs](../perf/after-2026-10-17-vitest-exclusions.json), and
[fresh-server e2e diagnostics](../perf/focused-e2e-fresh-servers-2026-10-17.json).
The CI baseline contains five successful run IDs in
[`ci-baseline-2026-10-16.json`](../perf/ci-baseline-2026-10-16.json).

### Vitest exclusions and probe

In a worktree with copied `.claude` skills, the unfiltered run collected 115
additional tests under `.claude/skills/archify/test`; they failed collection
because Vitest could not bundle the Node.js built-in `node:test`. Excluding
`.agents/**` and `.claude/**` leaves the project suite at 1,734 tests across
183 files, matching CI. The unfiltered run also failed
`MapaOperativo > presents every point layer with a synchronized accessible
list`; it passed in the full excluded run and in isolation, so the observed
failure depends on suite load/order. See the
[Vitest diagnostic](../perf/vitest-copied-skills-diagnostic-2026-10-17.json).

The deliberate failure probe is outside the normal suite. Run it locally
when checking that the test verdict still fails on an assertion:

```bash
npm run test:failure-probe
```

The command is expected to exit 1 and print `PERF_FAILURE_PROBE`. CI runs
the same command and fails the job if it unexpectedly passes or the marker
is missing.
