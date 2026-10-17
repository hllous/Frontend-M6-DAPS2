# Local e2e debugging — detail

Skeleton lives in `AGENTS.md`. This covers reproducing a CI e2e failure by
running `npm run dev` and `npm run test:e2e` yourself, against a server you
start manually rather than the one Playwright starts and tears down on its
own.

## Set the env vars Playwright's own webServer would have set

`playwright.config.ts` only injects `M6_AUTH_MODE=mock` and
`NEXT_PUBLIC_DISABLE_MSW=true` when it manages the server itself — which it
skips whenever `PLAYWRIGHT_BASE_URL` is already set, i.e. exactly the case
where you're pointing it at a server you started by hand. Without them,
`/api/session/login` 404s and every spec fails on session seeding, reading
like a broken environment rather than a missing flag:

```bash
M6_AUTH_MODE=mock NEXT_PUBLIC_DISABLE_MSW=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:<port> npm run dev -- --port <port>
```

Confirm the server is actually up before trusting a test run against it:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:<port>/api/session/login -H "content-type: application/json" -d '{"scenarioId":"office-duty-queue"}'
```

`200` means it's ready. `404` almost always means the two env vars above,
not the code under test.

## Killing a manually-started server on Windows

Stopping a backgrounded `npm run dev` does not reliably kill the
underlying `next dev` child — the port stays bound, and a naive restart
either fails with `EADDRINUSE` or, worse, silently reuses the stale
process (serving whatever build and env it started with, including
accumulated in-memory mock-fixture state from earlier test runs). Before
starting a server on a port you've used already:

```bash
netstat -ano | grep ":<port>" | grep LISTENING
taskkill //PID <pid> //F
```

The double slash on `//PID //F` is required in Git Bash — a single slash
gets rewritten as a filesystem path. Re-run the `curl` check above after
restarting to confirm you're talking to the new process, not the old one.

The `scripts/perf/measure-loop.mjs` e2e steps apply a stricter lifecycle:
they refuse an occupied port, verify the listening PID belongs to the spawned
server process tree, kill the listener and launcher, and wait for the port to
be free before the next run. Use those steps when collecting loop timings.

## Run the whole relevant spec set in one invocation

The mock backend keeps mutated fixture state in memory for the life of
the server process. Playwright runs serially in CI (file-alphabetical
order), so a spec that reuses a fixture ID another spec file already
mutates will pass locally under parallel workers and fail in CI — grep
`e2e/*.spec.ts` for a candidate ID before reusing it, rather than trusting
a fixture file's on-paper status. The same accumulation happens across
separate manual `npm run test:e2e` calls against a server you didn't
restart in between: if two otherwise-identical local runs disagree,
suspect leftover state first. Restart the server fresh, then run every
spec file relevant to the change in a single command rather than
iterating call-by-call.

## Failures on a fresh server

A fresh server rules out state left by an earlier server process, but it
does not isolate tests that run in parallel against the same mutable mock
fixtures. In the #571 focused diagnostic, three runs each started a new
server on port 4311; the port was confirmed free after every shutdown. The
runs reported 2 passed/27 failed, 26 passed/3 failed, and 27 passed/2 failed.
The Services workspace sometimes stayed at `Cargando escenario`. The failing
wide-viewport workspace test reads `SVC-1043`, which is also changed by the
`attaches a crew without vehicle` journey in `services.spec.ts`. This is
concrete fixture overlap for [#575](https://github.com/hllous/Frontend-M6-DAPS2/issues/575),
not proof that the fixture caused every failure. The
[diagnostic JSON](../perf/focused-e2e-fresh-servers-2026-10-17.json) records
the counts and port checks.

The original #571 full e2e baseline stored counts but no server PIDs or
post-shutdown port checks, so it could have reused a stale listener. It was
rerun three times with the process-ownership check; the exact failed spec
names are in [`baseline-2026-10-17-e2e-fixed.json`](../perf/baseline-2026-10-17-e2e-fixed.json).
The new after-runs are in [`after-2026-10-17-loop-parser.json`](../perf/after-2026-10-17-loop-parser.json).
