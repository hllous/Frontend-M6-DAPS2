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
A reason, a note, and a photo (where feasible), uploaded separately and attached by reference to a Service outcome or another resource's report/decision action (e.g. a Container overflow report, damage report, removal, or standalone repair completion — see that resource's `CONTRACTS.md` entry for which actions require it). Mandatory on every Service exception outcome (`PARTIALLY_COMPLETED`, any `PARTIAL`/`NOT_SERVICED` zone, `CANCELLED`, `SUSPENDED`); optional on a clean completion. For a non-Service action, an outcome reached *through* a linked Service uses that Service's own Evidence rather than a second, separate one.
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
