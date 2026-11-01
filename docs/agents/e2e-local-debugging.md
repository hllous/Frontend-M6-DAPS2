# Local e2e debugging — detail

Skeleton lives in `AGENTS.md`. This covers reproducing a CI e2e failure by
running `pnpm dev` and `pnpm test:e2e` yourself, against a server you
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
M6_AUTH_MODE=mock NEXT_PUBLIC_DISABLE_MSW=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:<port> pnpm dev --port <port>
```

Confirm the server is actually up before trusting a test run against it:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:<port>/api/session/login -H "content-type: application/json" -H "x-requested-with: XMLHttpRequest" -d '{"scenarioId":"office-duty-queue"}'
```

`200` means it's ready. `404` almost always means the two env vars above,
not the code under test. The `x-requested-with` header is required by the
session routes (`SESSION_MUTATION_HEADERS` in `src/lib/session-request.ts`):
without it the route answers `403`, and without a JSON `content-type`, `415`,
even when the server is healthy.

## Killing a manually-started server on Windows

Stopping a backgrounded `pnpm dev` does not reliably kill the
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

## Run the whole relevant spec set in one invocation

The mock backend keeps mutated fixture state in memory for the life of
the server process. Playwright runs serially in CI (file-alphabetical
order), so a spec that reuses a fixture ID another spec file already
mutates will pass locally under parallel workers and fail in CI — grep
`e2e/*.spec.ts` for a candidate ID before reusing it, rather than trusting
a fixture file's on-paper status. The same accumulation happens across
separate manual `pnpm test:e2e` calls against a server you didn't
restart in between: if two otherwise-identical local runs disagree,
suspect leftover state first. Reset the mock data (below), then run every
spec file relevant to the change in a single command rather than
iterating call-by-call.

## Reset the mock data without restarting

In mock mode on a non-production server, `POST /api/mock/reset` restores
every seeded fixture (it answers `404` anywhere else). Run it before an e2e
run on a server that earlier runs have changed:

```bash
curl -s -X POST http://127.0.0.1:<port>/api/mock/reset -H "content-type: application/json" -H "x-requested-with: XMLHttpRequest" -d '{}'
```

A new `reset*Fixtures` function in `src/lib` belongs in the route's
`FIXTURE_RESETS` list (`src/app/api/mock/reset/route.ts`).

## Commands that pass arguments correctly

`pnpm <script> -- <args>` hands the literal `--` to the tool, which then
treats the rest as file filters instead of options:

- One e2e spec: `pnpm exec playwright test e2e/<file>.spec.ts`. With
  `pnpm test:e2e -- e2e/<file>`, Playwright runs every spec, including the
  ones that change mock data.
- Full Vitest suite with a worker cap: `pnpm test:full` (`vitest run
  --maxWorkers=2`). `pnpm test -- --maxWorkers=2` runs uncapped.
- Run Vitest, `tsc` and ESLint from the worktree you are testing. All three
  skip `.orca/**`, so the main clone never picks up worktree copies.
