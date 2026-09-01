# M6 Environment, Hygiene and Urban Services Frontend

Internal frontend for planning, assigning, and field-executing Environment, Hygiene and Urban Services operations — collection routes and point-based interventions — for office supervisors and field personnel.

## Language

**Service**:
A schedulable unit of operational work — a ROUTE (an ordered sequence of zones) or a POINT (a single inventory item or location) — tracked through a status lifecycle from scheduling to completion. Canonical shape is Backend-owned; see `docs/backend-context/entidades/service.md`.
_Avoid_: Job, task, work order

**Assignment**:
The act of attaching a crew and vehicle to an already-scheduled Service. A distinct step from scheduling: a Service can exist scheduled but unassigned.
_Avoid_: Staffing, dispatch

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
A reason, a note, and a photo (where feasible), uploaded separately and attached by reference to a Service outcome. Mandatory on every exception outcome (`PARTIALLY_COMPLETED`, any `PARTIAL`/`NOT_SERVICED` zone, `CANCELLED`, `SUSPENDED`); optional on a clean completion.
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
The atomic unit of M6 authorization — a named permission (e.g. `service:schedule`, `violationNotice:issue`, `treeIntervention:authorize`) granted to an actor. Resolved from M1's identity claims through a frontend-owned mapping layer once M1 publishes its claims contract; never inferred from a hardcoded role string.
_Avoid_: Role, permission, scope
