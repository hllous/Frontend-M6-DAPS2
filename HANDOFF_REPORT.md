# 113 — Office creates a Service-sourced RepairRequest — completion report

## Status

Done

## What was built

- `src/lib/repair-requests.ts`
- `src/lib/repair-request-fixtures.ts`
- `src/app/api/repair-requests/`
- `src/components/services/create-repair-request-dialog.tsx`
- `src/components/services/service-detail.tsx`

## Test evidence

- RepairRequest e2e suite on port 4311 with `NEXT_PUBLIC_DISABLE_MSW=true`: **3 passed** in 3.5s.
- `npm.cmd test`: **PASS — 84 files, 489 tests**.
- `npm.cmd run typecheck -- --incremental false`: **PASS — 0 errors**.
- `npm.cmd run lint`: **PASS — 0 errors, 3 pre-existing warnings**.

## Bug 1

- Updated `e2e/repair-requests.spec.ts` so the Field no-entry-point test opens untouched, crew-`b`-assigned `SVC-1051` instead of unassigned `SVC-1043`.

## Root cause of bug 2

The submission logic and `submitFieldAction` network-failure path were correct. The failing run used a stale MSW-enabled dev server on port 4311. MSW intercepted `POST /api/repair-requests` before Playwright's `page.route()` callback, returned a successful fixture response, and therefore produced a normal pending referral instead of `Unsent referral`. Running the same branch with `NEXT_PUBLIC_DISABLE_MSW=true` made the route abort execute and all three tests pass. No product-code workaround was needed.

- `npm.cmd run typecheck -- --incremental false` — PASS.
- `npm.cmd test` — PASS: 77 files, 453 tests.
- Targeted #113 Vitest suite — PASS: 4 files, 14 tests.
- `npm.cmd run lint` — PASS with 3 pre-existing warnings and no errors.
- `npm.cmd run typecheck` — blocked by `EPERM` writing `tsconfig.tsbuildinfo`; the no-incremental check passes.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4311 npm.cmd run test:e2e -- e2e/repair-requests.spec.ts` — blocked before test execution because the worktree cannot create `test-results`; starting the required dev server was separately blocked creating `.next/dev`.

## Deviations from the ticket

The earlier partial/blocked verification notes below are superseded by the current green verification above; they are retained as historical handoff context.

No functional deviations. The UI is Service-only, keeps `publicSafetyRisk` independent from `severity`, shows canonical `Referral context`, distinguishes pending from `Unsent referral`, and provides adapter/BFF recovery methods without recovery UI. The documented Backend source-DTO gap is explicitly marked as a hypothesis in `src/lib/repair-requests.ts`.

## Problems found

- `npm.cmd ci --include=optional` — failed with `EBUSY` because an existing generated Next source-map file is locked. The existing dependency tree was sufficient for the passing Vitest/typecheck/lint checks.
- The isolated worktree ACL rejects generated writes to `.next`, `test-results`, and `tsconfig.tsbuildinfo`; no source workaround was applied.

## Open questions

- Backend still needs to confirm the exact RepairRequest source DTO/envelope and recovery DTO. The implementation uses the documented `address`, `detectedInType`, `detectedInId`, and optional `workOrderId` shape until that confirmation.
