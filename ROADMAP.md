# M6 Frontend Implementation Roadmap

This is the capability- and dependency-based implementation roadmap for the M6 Environment, Hygiene and Urban Services frontend, produced by [Produce the capability- and dependency-based implementation roadmap](https://github.com/hllous/Frontend-M6-DAPS2/issues/67), the final ticket on the [Wayfinder map](https://github.com/hllous/Frontend-M6-DAPS2/issues/6).

Phasing is capability- and dependency-based, not calendar- or team-size-based: a phase is ready to start the moment its prerequisites close, regardless of who is available. Sequence numbers describe dependency order, not a fixed schedule — a team could run Phase 7's fixture-based work alongside Phase 2 once Phase 1 lands, for example.

## Source-of-truth boundaries

- The [Wayfinder map](https://github.com/hllous/Frontend-M6-DAPS2/issues/6) records *why* each decision was made — context, alternatives, open questions — one decision per linked ticket, gisted once in the map's Decisions-so-far.
- [`PRODUCT.md`](PRODUCT.md) records product evidence (prototypes, validated directions) and links here for sequencing.
- **This document** records sequencing, dependency edges, typed gates, and implementation acceptance evidence. It does not restate a decision's reasoning — it cites the decision and says what building it requires and how to know it's done.
- [`CONTRACTS.md`](CONTRACTS.md) owns resource- and wire-level contract detail (request/response shapes, adapter seams, per-resource acceptance requirements). Phases below cite `CONTRACTS.md` sections rather than repeating their content.
- [`DESIGN.md`](DESIGN.md) owns the visual/interaction standard every phase builds against.

## How to read a phase entry

Each phase states:

- **Outcome** — the end-to-end, user-visible capability that proves the phase, not an internal milestone.
- **Depends on** — prior phases and/or closed decisions required before the outcome is meaningful.
- **Acceptance evidence** — what a reviewer checks to call the phase done; links to `CONTRACTS.md` where that detail already exists rather than duplicating it.
- **Unblocks** — what becomes buildable once this phase's outcome exists.
- **Specification status** / **Implementation status** — kept as two separate axes per the ticket's own distinction: a phase can be fully specified (every dependency, gate, and acceptance criterion is written down, ready to hand to `/to-spec`) while still blocked on a prior phase or an external gate for implementation to actually start.

Every phase in this document is **specification-ready** as of this document landing — the tables below are complete. **Implementation-unblocked** status differs per phase; see each phase's "Depends on."

## Typed external and cross-cutting gates

None of these block writing this roadmap (confirmed when ticket #67 was claimed: the contract-reconciliation prerequisites it listed are closed via [PR #70](https://github.com/hllous/Frontend-M6-DAPS2/pull/70)). They gate specific phases at build or release time.

| Gate | Type | Affects | Tracking |
|---|---|---|---|
| M1's OAuth2/OIDC contract (JWKS, algorithm, issuer/audience, claims shape, refresh rotation) is unpublished | Blocks production readiness | Phase 0 (real-JWT mode), Phase 8 | [#17](https://github.com/hllous/Frontend-M6-DAPS2/issues/17), [ADR-0004](docs/adr/0004-owned-bff-session-the-m1-jwt-never-reaches-the-browser.md) |
| M1's role → Capability claims mapping is unconfirmed | Unresolved hypothesis | Every phase's capability gating | [#8](https://github.com/hllous/Frontend-M6-DAPS2/issues/8), `CONTEXT.md`'s `Capability` term |
| Backend's deployed JWT verifier is an HS256 stopgap, not M1's real contract | Unresolved hypothesis (interim only) | Phase 0's dev-JWT mode | ADR-0004 note (2026-09-02) |
| M9's neighborhood catalog is unpublished; Zone↔Neighborhood assignment is a hypothesized adapter | Blocks implementation (of neighborhood assignment specifically) | Phase 2c | [#36](https://github.com/hllous/Frontend-M6-DAPS2/issues/36) |
| M4's establishment-lookup contract is unpublished | Blocks implementation (of establishment lookup specifically) | Phase 6 | `CONTRACTS.md` → Remaining contract gaps |
| Backend #114: Swagger docs don't yet reflect `RESCHEDULED → CANCELLED` | Blocks production readiness | Phase 1 | [Backend#114](https://github.com/hllous/Backend-M6-DAPS2/issues/114) |
| Backend #90: authoritative malware scanning, Tier-2 read audit, server-side export allowlists remain undone | Blocks production readiness | Phase 8 (closing gate); Phases 1, 4, 5, 6 ship defense-in-depth controls only until then | [Backend#90](https://github.com/hllous/Backend-M6-DAPS2/issues/90), [ADR-0006](docs/adr/0006-frontend-security-controls-are-defense-in-depth-only.md) |
| M2's visible-to-citizen attachment policy and event shape are unresolved | Unresolved hypothesis | Phase 8 | `CONTRACTS.md` → Remaining contract gaps |
| Better Auth remains conditional on a compatible M1 OIDC contract | Unresolved hypothesis | Phase 0 / Phase 8 architecture choice | [#17](https://github.com/hllous/Frontend-M6-DAPS2/issues/17), [#18](https://github.com/hllous/Frontend-M6-DAPS2/issues/18) |
| Route stop-sequence `PUT` has no server-side concurrency guard | Unresolved hypothesis (documented backend limitation; frontend ships an advisory-only precheck) | Phase 2c | [#36](https://github.com/hllous/Frontend-M6-DAPS2/issues/36) |
| TreeSurvey → TreeIntervention has no foreign key; the link is UI convention only | Unresolved hypothesis | Phase 5 | [#38](https://github.com/hllous/Frontend-M6-DAPS2/issues/38) |

## Phase 0 — Foundation

**Outcome**: An authenticated Office or Field actor sees a capability-gated shell and navigation; every request round-trips through a typed, Zod-validated adapter against MSW fixtures with no real backend involved.

**Depends on**: [Define the application information architecture](https://github.com/hllous/Frontend-M6-DAPS2/issues/7), [Define M6 actors, capabilities, and information boundaries](https://github.com/hllous/Frontend-M6-DAPS2/issues/8), [Define the contract-first frontend and backend boundary](https://github.com/hllous/Frontend-M6-DAPS2/issues/9), [Resolve the authentication and session architecture](https://github.com/hllous/Frontend-M6-DAPS2/issues/18), [the JWT stopgap decision](https://github.com/hllous/Frontend-M6-DAPS2/issues/46), `DESIGN.md`.

**Scope note**: mock and dev-JWT (`M6_DEV_JWT`) modes only, per #46's three-mode split. The real M1 JWT mode is explicitly deferred to Phase 8 — do not present capability names or JWT claims as confirmed contracts anywhere in this phase; they're UI-only and optimistic per [ADR-0005](docs/adr/0005-m6-backend-is-the-sole-authorization-authority.md).

**Acceptance evidence**:
- Shell renders the capability-gated nav (Mi Trabajo / Servicios / Inventario / Control Ambiental / Mapa / Catálogo / Tableros) per #7, hiding items the mock actor's Capabilities don't grant.
- Login works in both mock and dev-JWT modes; production/real-JWT mode is not implemented yet and fails closed if attempted.
- One resource's adapter (any) round-trips through Zod validation against an MSW fixture with no network call reaching a real host.
- Design tokens, breakpoints (760px/1024px), and the collapsible sidebar / mobile nav from `DESIGN.md` render correctly.

**Unblocks**: every later phase.

## Phase 1 — Service core loop

**Outcome**: An Office actor schedules and assigns a Service (ROUTE or POINT); a Field actor executes and completes it, against fixture-level catalog data (a handful of seeded Zones, Routes, ServiceTypes, Crews, Vehicles — not yet manageable through the UI).

**Depends on**: Phase 0; [Define the central Service planning and field-execution workflow](https://github.com/hllous/Frontend-M6-DAPS2/issues/10) (carrying its corrected cancellation rule); the validated [map/table workspace](https://github.com/hllous/Frontend-M6-DAPS2/issues/14) and [operational form](https://github.com/hllous/Frontend-M6-DAPS2/issues/20) prototypes as reference, not as code to promote — neither prototype branch was ever merged, consistent with their "throwaway" status on the map.

**Acceptance evidence**: see `CONTRACTS.md` → [Service workflow](CONTRACTS.md#service-workflow) and → [Required contract and workflow coverage](CONTRACTS.md#required-contract-and-workflow-coverage) for the binding cancellation/reason/`IN_PROGRESS` rules and their required test coverage — not restated here. Additionally:
- Office can schedule and separately assign a ROUTE or POINT Service (scheduling and assignment are distinct steps per the `Assignment` term in `CONTEXT.md`).
- A ROUTE Service reaches `COMPLETED` only once every zone reaches `SERVICED`; a `PARTIAL`/`NOT_SERVICED` `ZoneResult` requires Evidence.
- Local Drafts persist field input without connectivity and require manual resubmission; a stale-server `Conflict` (per `CONTEXT.md`) is surfaced explicitly, never silently overwritten.

**Unblocks**: Phases 2a–2d, 3, 4, 5, 7 (fixture-based start).

## Phase 2 — Service-supporting catalogs

A vertical slice attached to Phase 1, not a horizontal sweep across every domain: Service can't be scheduled against real data without these, so they land immediately after the tracer proves the workflow. Split into four independently acceptance-tested subincrements so this doesn't become an unbounded bucket.

### Phase 2a — ServiceType and Disposal Sites

**Outcome**: Office manages the ServiceType and DisposalSite catalogs.

**Depends on**: Phase 1; [Produce CONTRACTS.md entries for the Service Types and Disposal Sites catalogs](https://github.com/hllous/Frontend-M6-DAPS2/issues/39).

**Acceptance evidence**:
- A ServiceType's `code`, `category`, and `mode` are editable at creation only; the edit form rejects or hides changes to those fields afterward.
- Deleting a DisposalSite is logical (soft) only — a DisposalSite referenced by an existing CollectionRecord is never hard-deleted, and the UI never offers that option.

### Phase 2b — Crews and Vehicles

**Outcome**: Office manages Crews (including membership) and Vehicles.

**Depends on**: Phase 1; [Produce CONTRACTS.md entries for Crews and Vehicles](https://github.com/hllous/Frontend-M6-DAPS2/issues/40).

**Acceptance evidence**:
- Crew membership is managed through the `/crews/:id/members` sub-resource, covered by its own adapter test, not folded into the Crew's general update call.
- `leaderUserId`, `memberUserIds[]`, and `organizationId` render as M1-identity references (name/lookup), never as raw-text fields the frontend can edit as if M6 owned them.

### Phase 2c — Zones, Routes, and Service Frequencies

**Outcome**: Office manages Zones and Routes (including stop-sequence ordering) and authors ServiceFrequency rules.

**Depends on**: Phase 1; [Define Zones, Routes, and Service Frequency management workflows](https://github.com/hllous/Frontend-M6-DAPS2/issues/36); gated by the M9 neighborhood-catalog and no-concurrency-guard items in the gates table above.

**Acceptance evidence**:
- Deactivating a Zone or Route still referenced by a Service is allowed but warns first (no server-side referential check exists).
- The Route stop-sequence builder issues one atomic full-replace `PUT`; the frontend's advisory `updatedAt` precheck surfaces a warning when the Route changed since the editor opened, but is not treated as an authoritative concurrency guard.
- ServiceFrequency management is rule-authoring CRUD only — there is no manual-generate action, and closing a Frequency's validity window (`validTo`) is verified to leave every already-generated Service untouched.

### Phase 2d — Green Spaces

**Outcome**: Office manages the Green Spaces catalog.

**Depends on**: Phase 1; [Produce the CONTRACTS.md entry for Green Spaces](https://github.com/hllous/Frontend-M6-DAPS2/issues/41).

**Acceptance evidence**: plain CRUD only — no action endpoints and no state-machine behavior to test. Watering/mowing continue to be scheduled as ordinary Services against the space (Phase 1).

**Unblocks (2a–2d collectively)**: Phase 8's catalog-completeness claim; no later phase depends on 2a–2d beyond Phase 1 already covering the minimum fixture-level data they formalize.

## Phase 3 — Outbound referrals (Service-sourced)

**Outcome**: Office creates and tracks a `RepairRequest` or `StreetClosureRequest` originating from a Service; Field creates a repair referral only from assigned work. Inspection-sourced and TreeIntervention-sourced referral creation are explicitly **not yet available** in this phase — the UI does not offer them as a source until Phases 5 and 6 land.

**Depends on**: Phase 1 only. [Define the outbound infrastructure referral workflows](https://github.com/hllous/Frontend-M6-DAPS2/issues/66) and [ADR-0007](docs/adr/0007-explicit-external-referrals-and-office-reconciliation.md).

**Acceptance evidence**:
- Referral creation is available from a Service; attempting it from an EnvironmentalInspection or a TreeIntervention has no entry point yet.
- Office sees and manages all referrals; Field sees only referrals attached to its assigned Services.
- A pending `StreetClosureRequest` blocks its whole Service (a ROUTE Service is blocked entirely, not per-zone) from starting; approval unblocks it; rejection forces an explicit Office reschedule-or-cancel choice; ending the closure releases the block.
- A stale referral (per `CONTEXT.md`'s `Stale external referral` term) renders as a warning only — never an automatic transition. A duplicate candidate surfaces for human review — never an automatic merge.
- A submission that fails before a record is created renders as "unsent," distinct from a created-but-pending referral that may later become stale.
- Manual recovery transitions are Office-only, require the external identifier (`workOrderId`/`closureId`), and require explicit confirmation.

**Unblocks**: Phase 5's TreeIntervention-sourced extension, Phase 6's EnvironmentalInspection-sourced extension.

## Phase 4 — Container lifecycle

**Outcome**: Field reports Container overflow/damage ambiently; Office dispatches repair, removal, or relocation.

**Depends on**: Phase 1; [Define the Container lifecycle and Green Points management workflows](https://github.com/hllous/Frontend-M6-DAPS2/issues/37).

**Why this early**: a small, self-contained state machine with an already-confirmed contract (see `CONTRACTS.md` → Worked example: Containers and Green Points) — it exercises the ambient-report / Office-dispatch split and evidence-attachment pattern other resources reuse, without waiting on any external gate.

**Acceptance evidence**:
- `container:report` (overflow/damage reporting) is available to both Field and Office without a Service assignment; `container:manage` (repair/removal/relocation dispatch) is Office-only.
- Completing a linked `POINT` Service atomically transitions the Container (`empty`, `complete-repair`, `confirm-relocation`) in the same backend transaction — no second frontend call is issued for these three when reached through a Service; the standalone `container:manage` endpoints exist only for the no-Service case. `remove` is a **direct** Container transition, reachable only from `DAMAGED`.
- Evidence uploads use `ownerType=CONTAINER` and attach to the Container as a flat list, not per-transition.
- Green Points CRUD has no status or state-machine tests, matching its plain-catalog shape.

**Unblocks**: nothing phase-specific beyond Phase 1's own downstream phases.

## Phase 5 — Tree census, survey, and intervention authorization

**Outcome**: Office registers Trees; Field or Office records TreeSurveys; Office authorizes and schedules a TreeIntervention. Phase 3's referral gains its TreeIntervention-sourced `StreetClosureRequest` path.

**Depends on**: Phase 1 (Service), Phase 3 (referral extension point); [Define the Tree census, survey, and intervention authorization workflows](https://github.com/hllous/Frontend-M6-DAPS2/issues/38).

**Acceptance evidence**:
- `tree:manage` gates Tree registration CRUD to Office; `tree:survey` allows both Field and Office to record a TreeSurvey.
- `treeIntervention:request` is Office-only. Every intervention type — not REMOVAL alone — requires an explicit `authorize()` call before scheduling; the UI shows one universal Authorize action regardless of type.
- A REMOVAL intervention is rejected client-side without a `justification`; a high-risk survey is rejected client-side without a `riskType` — both enforced despite being backend-unenforced.
- The TreeSurvey → suggested-TreeIntervention link is UI convention only (no FK); tests cover the link surviving independently of any backend enforcement.
- The guided "authorize + schedule" action creates the Service and calls `assign-service` as one bundled user action, a genuine two-call frontend bridge (`authorize()` and `assign-service` are separate backend calls, unlike Phase 4's Container transitions); tests cover partial failure between the two calls.
- Creating a `StreetClosureRequest` from an authorized TreeIntervention is now available (Phase 3's extension); creating one from an unauthorized intervention is not.

**Unblocks**: Phase 6 need not wait on this phase — they're independent — but both feed Phase 7.

## Phase 6 — Environmental Control case-file workflow

**Outcome**: Field-originated intake reaches Office triage; inspection and reinspection follow explicit Service-backed paths; immutable notices are issued. Phase 3's referral gains its EnvironmentalInspection-sourced `RepairRequest` path.

**Depends on**: Phase 1 (Service), Phase 3 (referral extension point); [Define the Environmental Control case-file workflow](https://github.com/hllous/Frontend-M6-DAPS2/issues/68); gated by the M4 establishment-lookup item in the gates table above.

**Acceptance evidence**: see `CONTRACTS.md` → [EnvironmentalReport workflow](CONTRACTS.md#environmentalreport-workflow) and → [Evidence workflow](CONTRACTS.md#evidence-workflow) for the binding reopen/late-update/terminal-state and evidence-upload rules — not restated here. Additionally:
- Creating a `RepairRequest` from an EnvironmentalInspection is now available (Phase 3's extension).
- Notice issuance is blocked without a resolved `establishmentId` until the M4 establishment-directory adapter is real; until then it runs against the typed, replaceable stub the gate describes.

**Unblocks**: Phase 7.

## Phase 7 — Operational indicator dashboards

**Outcome**: Office views operational indicator dashboards.

**Depends on**: Phase 1 to **start** — the indicator adapter, Zod schemas, accessible tables, and chart states can be built and specified against scenario fixtures matching `CONTRACTS.md` → [Worked example: Indicators](CONTRACTS.md#worked-example-indicators) as early as Phase 1 lands. Phases 1–6 are a **data-readiness dependency for the acceptance gate**, not a blocker to building this phase: the dashboard's own tests can pass against fixtures long before real cross-domain data exists.

**Acceptance evidence**:
- Chart and table components are normalized through a Zod-validated indicator adapter; no chart hard-codes an assumed response shape.
- Fixture-based tests (buildable from Phase 1 onward) cover every documented indicator/filter/semantic combination.
- The **real-data acceptance gate** — closed only once Phases 1–6 exist — is that dashboard values reconcile against records actually produced by those phases' own workflows, with no manual data massaging.

**Unblocks**: nothing downstream; this is a leaf.

## Phase 8 — Release hardening and production readiness

**Outcome**: The application is production-ready: real M1 JWT authentication replaces mock/dev-JWT modes, the full WCAG 2.2 AA and security posture is verified, and measurable performance/observability gates are met under real load.

**Depends on**: every prior phase at its own per-increment quality baseline (WCAG, contract validation, and testing are not deferred to this phase — see the note below) — plus every "blocks production readiness" and "unresolved hypothesis" gate in the gates table above, and [Set measurable performance, observability, and release gates](https://github.com/hllous/Frontend-M6-DAPS2/issues/64), [Define the production-shaped quality and release evidence model](https://github.com/hllous/Frontend-M6-DAPS2/issues/19), [Define deployment, observability, and release architecture](https://github.com/hllous/Frontend-M6-DAPS2/issues/15), [Define the security, privacy, and audit model](https://github.com/hllous/Frontend-M6-DAPS2/issues/16).

**Per-increment quality baseline (applies to Phases 1–7, not deferred here)**: every phase above ships WCAG 2.2 AA-compliant, Zod-contract-validated, tested code against its real or best-hypothesis contract as it's built. Phase 8 is the **closing** gate — the real M1 JWT cutover, the full cross-cutting accessibility/security audit, and performance budgets under real load — not where quality work first happens. Treating this phase as where hardening starts would mean Phases 1–7 shipped without it, which they don't.

**Acceptance evidence**:
- Production mode uses M1's real JWT exclusively; mock and dev-JWT modes are disabled or unreachable outside development.
- Backend #90's malware scanning, Tier-2 read auditing, and server-side export allowlists are confirmed live; frontend controls are verified as defense-in-depth only, per ADR-0006.
- Backend #114's Swagger documentation reflects the reconciled `RESCHEDULED → CANCELLED` contract.
- M2's visible-to-citizen attachment policy is confirmed and the `{ attachmentId, fileName, contentType, url, sizeBytes }` projection is verified end-to-end.
- Performance, observability, and rollback gates from #64/#15/#19 pass under real load.

**Unblocks**: general availability.

## Assumptions and open decisions

- Phase sequence numbers express dependency order, not a fixed schedule or required team size, per the ticket's own mandate.
- ADR-0007 ([recovered in this same effort](https://github.com/hllous/Frontend-M6-DAPS2/pull/71)) has no recorded alternatives — issue #66's resolution never discussed any, and none are invented here.
- The `Zone (M6)` / M9 "zona" naming collision (`CONTEXT.md`) remains unresolved; Phase 2c may need a rename if M9 retains ownership of "Zone."
- Exact CI/tooling gate thresholds for Phase 8 live in #19 and #64's own decisions; this document cites them rather than restating them, per the source-of-truth boundaries above.
- Splitting Phase 1 into separate "schedule+assign" and "execute+complete" increments was considered and set aside — a single Service-loop phase was judged to better prove the map/table workspace and operational-form patterns end-to-end in one pass. Revisit if Phase 1 proves too large for one implementation pass in practice.
- Phase 5 and Phase 6 have no dependency on each other and may run in either order or in parallel; both were sequenced before Phase 7 only because Phase 7 needs their data.

## Readiness for `/to-spec`

`/to-spec` is invoked **per phase**, not once for the whole document: a phase is specification-ready the moment its own dependency, gate, and acceptance-evidence entries above are complete — which is true for every phase in this document as written. A phase is additionally **implementation-unblocked** once its "Depends on" phases and any "blocks implementation" gates affecting it are closed. As of this document landing:

| Phase | Specification-ready | Implementation-unblocked |
|---|---|---|
| 0 | Yes | Yes |
| 1 | Yes | Once Phase 0 ships |
| 2a–2d | Yes | Once Phase 1 ships |
| 3 | Yes | Once Phase 1 ships |
| 4 | Yes | Once Phase 1 ships |
| 5 | Yes | Once Phases 1, 3 ship |
| 6 | Yes | Once Phases 1, 3 ship (M4 gate permitting) |
| 7 | Yes | Once Phase 1 ships (acceptance gate waits on Phases 1–6) |
| 8 | Yes | Once Phases 1–7 ship and all "blocks production readiness" gates close |

With this document landed, the [Wayfinder map](https://github.com/hllous/Frontend-M6-DAPS2/issues/6) has no open child tickets: the blueprint is decision-complete.
