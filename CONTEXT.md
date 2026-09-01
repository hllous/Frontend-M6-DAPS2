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
