# M6 Environment, Hygiene and Urban Services Frontend

Internal frontend for planning, assigning, and field-executing Environment, Hygiene and Urban Services operations — collection routes and point-based interventions — for office supervisors and field personnel.

## Language

**Service**:
A schedulable unit of operational work — a ROUTE (an ordered sequence of zones) or a POINT (a single inventory item or location) — tracked through a status lifecycle from scheduling to completion. Canonical shape is Backend-owned; see `docs/backend-context/entidades/service.md`.
_Avoid_: Job, task, work order

**Assignment**:
The act of attaching a crew and vehicle to an already-scheduled Service. A distinct step from scheduling: a Service can exist scheduled but unassigned.
_Avoid_: Staffing, dispatch

**Zone (M6)**:
An M6 operational grouping of one or more M9 Neighborhoods, used to compose Routes and assign Crews. It is not M9's own "zona" concept. This cross-module naming collision remains unresolved; M6's term will be renamed if M9 retains ownership of "Zone". Neighborhoods are assigned to and removed from a Zone through a hypothesized adapter to M9's own, still-unpublished neighborhood catalog.
_Avoid_: M9 zone, neighborhood (the M9-owned unit a Zone groups, not a Zone itself)

**Validity (ServiceFrequency)**:
The date window in which a ServiceFrequency rule applies. Closing a Frequency ends that window by setting `validTo`; it is not a deactivation and does not alter Services already generated from the rule. Zone and Route deactivation, by contrast, is their catalog active/inactive state.
_Avoid_: Frequency deactivation, generic close

**ZoneResult**:
The recorded outcome (serviced / partial / not-serviced) for one zone within a ROUTE Service.
_Avoid_: Zone status, stop result

**Delayed notice**:
An ambient, field-crew-raised flag on an in-progress Service (a note plus a revised ETA) surfaced on the office view. Not a status change, and not a push notification.
_Avoid_: Delay status, alert

**Local draft**:
Form state for a field action (evidence, notes, chosen reason) held on-device when composed without connectivity. Never auto-synced; the crew must manually resubmit once reconnected.
_Avoid_: Offline queue, pending sync, cached submission

**Conflict** (Service):
The state where a field crew's manually resubmitted local draft can't be applied because the Service changed server-side (reassigned, cancelled, rescheduled) while the crew was working it offline. Always surfaced explicitly to a human; never resolved by last-write-wins.
_Avoid_: Sync error, merge conflict

**Evidence**:
A reason, a note, and a photo (where feasible), uploaded separately and attached by reference to a Service outcome or another resource's report/decision action (e.g. a Container overflow report, damage report, removal, or standalone repair completion — see that resource's `CONTRACTS.md` entry for which actions require it). Mandatory on every Service exception outcome (`PARTIALLY_COMPLETED`, any `PARTIAL`/`NOT_SERVICED` zone, `CANCELLED`, `SUSPENDED`); optional on a clean completion. For a non-Service action, an outcome reached *through* a linked Service uses that Service's own Evidence rather than a second, separate one. Backend attaches Evidence to a **resource**, not to the individual action: `POST /evidence` accepts exactly four owner types — `SERVICE`, `ZONE_RESULT`, `INSPECTION`, `CONTAINER` — so a tree, a tree survey and a tree intervention cannot carry Evidence at all, and a Container's photos are a flat list across all its reports.
_Avoid_: Attachment, proof, documentation

**Office**:
An M6 actor that schedules and assigns Services, configures catalogs, and holds every elevated capability — Service reschedule/cancellation, ViolationNotice issuance, TreeIntervention authorization. Mutually exclusive with Field; see [ADR-0002](docs/adr/0002-office-and-field-actors-are-mutually-exclusive.md).
_Avoid_: Supervisor, admin, back-office

**Field**:
An M6 actor that executes an assigned Service, including running environmental inspections — "Inspector" is not a distinct actor kind, just a Field actor whose current Service is an inspection. Splits into Crew Leader and Crew Member. Mutually exclusive with Office; see [ADR-0002](docs/adr/0002-office-and-field-actors-are-mutually-exclusive.md).
_Avoid_: Crew (the team a Field actor belongs to, not the actor itself), worker, inspector (as a separate actor kind)

**Crew Leader**:
The Field actor within a Crew authorized to perform state-changing actions on its assigned Service — start, suspend, resume, submit results and evidence. Corresponds to a Crew's `leaderUserId`.
_Avoid_: Foreman, crew lead

**Crew Member**:
A Field actor belonging to a Crew who can view but not act on the Crew's assigned Service; only that Crew's Leader may submit outcomes.
_Avoid_: Worker, staff

**Capability**:
The atomic unit of M6 authorization — a named permission (e.g. `service:schedule`, `violationNotice:issue`, `treeIntervention:authorize`) granted to an actor, resolved from M1 identity roles/claims through a versioned M6 mapping layer. M1 confirmed its roles but has not yet published the JWT claims contract, so the exact extraction remains a hypothesis. Optimistic at the frontend — UI-only; M6 Backend is the sole authorizing authority, see [ADR-0005](docs/adr/0005-m6-backend-is-the-sole-authorization-authority.md).
_Avoid_: Role, permission, scope

**My Work**:
The capability-scoped landing view every actor sees on entry. For Field, it's their assigned Services; for Office, it's a personal action queue — items waiting on that specific Office actor, such as an unassigned Service. Never a cross-team or cross-zone summary; that belongs to a dashboard, not to My Work.
_Avoid_: Home, Inbox, Dashboard (as a synonym for this view)

**Sensitivity Tier**:
A three-level classification (Tier 0 operational/catalog data, Tier 1 internal-operational/identity-adjacent data, Tier 2 regulated third-party data — a citizen's identity on an EnvironmentalReport, inspector findings, ViolationNotice/SanctionOutcome detail) that drives client storage, export, and audit rules everywhere in M6. Capability-gating stays per-resource (see Capability); Tier is a separate, orthogonal axis about how the data itself must be handled once an actor is authorized to see it. See [ADR-0006](docs/adr/0006-frontend-security-controls-are-defense-in-depth-only.md).
_Avoid_: PII flag, confidential, sensitive (as an undefined adjective)

**RepairRequest**:
An M6 tracking record for infrastructure damage detected through a Service or EnvironmentalInspection and explicitly referred to M3. It follows the external repair request, not the M3 work order itself; Office sees all records, while Field sees only records related to its assigned work. `publicSafetyRisk` is an explicit fact separate from `severity`. A Container damage path that emits `containerDamaged` is not a RepairRequest.
_Avoid_: work order, repair task

**StreetClosureRequest**:
An M6 tracking record for a street closure explicitly requested from M7 on behalf of a Service or an authorized TreeIntervention. Its response can affect whether the related work may proceed: a pending request blocks the Service from starting. It is created by Office; Field sees only the request context attached to its assigned Service.
_Avoid_: traffic ticket, closure status (when referring to the M7 response)

**Stale external referral**:
An operational warning that a pending RepairRequest or StreetClosureRequest has exceeded its expected response window without a corresponding external update. It is not a new domain status and never changes the referral automatically.
_Avoid_: failed referral, timed-out request

**Manual referral recovery**:
An explicit Office-only action used when an expected external event has not arrived, invoking the available transition after review and confirmation. It is exceptional reconciliation, not the normal way a referral changes state.
_Avoid_: manual status edit, force transition

**Street-closure dependency**:
The operational dependency between a StreetClosureRequest and its source Service: a pending request prevents that Service from starting, approval permits execution, rejection requires an Office reschedule-or-cancel decision, and ending the closure releases the dependency. It is not a new Service status.
_Avoid_: blocked Service status, traffic approval

**Referral context**:
The source reference that explains why a RepairRequest or StreetClosureRequest exists. The reference is canonical; the interface may show a readable summary and navigation back to the source, but it does not create a second authoritative copy of the source.
_Avoid_: copied source, external work order

**Duplicate referral candidate**:
An existing active referral with the same source, referral kind, damage type when applicable, and location. It is a warning for human review, not an automatic merge or a guaranteed duplicate.
_Avoid_: duplicate by text, automatic merge

**Referral reconciliation**:
An Office review of a referral whose source changed, whose external response is missing or out of order, or whose submission result is uncertain. Reconciliation preserves the recorded facts and never lets a local state overwrite an external decision.
_Avoid_: force sync, last-write-wins

**Uncorrelated external response**:
An external response that cannot be matched confidently to the referral and source it claims to update. It is retained for review without changing the M6 referral or reopening its Service.
_Avoid_: orphan event, automatic recovery

**Unsent referral**:
An attempted referral for which M6 has no created tracking record because submission failed before creation. It is distinct from a pending referral, which has a created record and is awaiting the external module.
_Avoid_: failed status, pending request
