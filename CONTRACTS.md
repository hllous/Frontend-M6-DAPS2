# M6 Frontend Contract Hypotheses

Backend endpoints for M6 don't exist yet. **Everything in this document is a frontend-owned hypothesis, not a confirmed contract.** It's written to let independent frontend development proceed — components, forms, query hooks, tests — against something concrete, while staying replaceable the moment Backend publishes a real OpenAPI spec. See [ADR-0003](docs/adr/0003-hand-written-contract-hypotheses-with-permanent-zod-validation.md) for why this approach was chosen over waiting.

Every row below is `hypothesis` until marked `confirmed`, with a link to the Backend doc or OpenAPI spec that confirmed it. Nothing here should be read as "this is how the backend works" — only "this is what the frontend is built to expect, and will adapt to whatever Backend actually ships."

## Anchor: Backend's own documented standard

`docs/backend-context/api/estandar-swagger.md` is Backend's own team-approved API standard (read-only mirror, dated 2026-09-01). It's the strongest available signal for what real endpoints will look like, so this document adopts it verbatim rather than inventing a competing shape:

- **Success**: bare resource object (or array) on the wire, never wrapped in `{ data: ... }`.
- **Paginated lists**: `{ data: T[], meta: { total, page, pageSize, totalPages } }`.
- **Errors**: `{ statusCode, message, error, timestamp, path }`, produced by a global exception filter.
- **Routes**: kebab-case plural (`/environmental-reports`), action-on-resource for non-CRUD verbs (`POST /services/:id/start`), never raw verbs in the URL.
- **Auth**: Bearer JWT issued by M1, `Authorization: Bearer <token>`.

## Identity and session boundary with M1

**Confirmed decision (2026-09-01): M1 issues the user JWT; M6 validates it.** M6 does not issue a replacement user token. M1's v2 document also declares `POST /api/v1/auth/login`, `POST /api/v1/auth/empleados/login`, `POST /api/v1/auth/refresh`, and `POST /api/v1/auth/logout`; login and refresh return the access token in `Authorization: Bearer`, with the refresh token in `X-Refresh-Token` on login and the token lifetime in `X-Token-Expires-In`.

This is not yet a complete verification contract. M1 still has to publish `alg`, `iss`, `aud`, signing-key/JWKS distribution, mandatory JWT claims, exact TTLs, refresh request body and rotation/revocation behavior. Treat every missing field as **hypothesis**, not as an implementation detail to invent.

The browser talks only to the Next.js BFF. The BFF talks only to M6 Backend; M6 Backend owns the server-to-server adapter to M1 for login, refresh and logout, and independently validates the M1 token for domain requests. The original M1 access token is stored in the sealed, `httpOnly` BFF session cookie; only BFF server code can unseal it and forward it as Bearer to M6 Backend. It never reaches browser JavaScript. M6 currently has no domain use case that consumes M1's citizen, organization or representation events/endpoints. If one appears, it is introduced behind a typed identity-directory adapter, so REST and Kafka request/response remain swappable transports.

## Request conventions (hypothesis — not documented by Backend)

Backend's standard fixes response shapes but says nothing about request query params. Hypothesized:

- **Pagination**: `?page=1&pageSize=20`, matching the response `meta` field names.
- **Filtering**: camelCase query keys mirroring resource fields, e.g. `?status=SCHEDULED&crewId=...`.
- **Sorting**: `?sortBy=<field>&sortDir=asc|desc`.

## Business-rule error discriminability (hypothesis)

Backend's `ErrorResponseDto` carries only a free-text `message` — no machine-readable discriminator. M6 needs to tell a *blocking* 409 (e.g. a Service state-machine violation) apart from a *warning-with-override* 409 (e.g. crew double-booking, which the office can override with a note — see #10). Hypothesized: a `code` field (`SCREAMING_SNAKE_CASE`, matching Backend's own enum-casing convention) added to the error DTO, e.g. `DOUBLE_BOOKING_WARNING`, `INVALID_STATE_TRANSITION`. **Unconfirmed — flag for Backend to weigh in on when the real contract is discussed.**

## Concurrency / staleness detection (hypothesis)

Relevant to Service reschedule/cancel and the local-draft conflict behavior in [ADR-0001](docs/adr/0001-no-offline-queue-for-field-service-actions.md). The frontend compares the `updatedAt` it last read for a resource against the server's current `updatedAt` before submitting a mutation, as an optimistic client-side pre-check — no new backend field needed, since every resource already carries `updatedAt` per Backend's own DTO example. This is advisory only: the backend's 409 at submit time is the authoritative backstop regardless of what the client's pre-check found.

## Evidence / upload contract (hypothesis)

- `POST /services/:id/evidence` — uploads one file, returns a reference: `{ id, url, contentType, uploadedAt }`.
- An exception outcome carries an **array** of evidence refs, not a single one ("reason + note, photo where feasible" doesn't cap the count — see the `Evidence` term in `CONTEXT.md`).
- The upload request includes a client-generated idempotency key (a UUID minted once per attempt), so retrying a failed/interrupted upload can't create duplicate Evidence records server-side. This is the concrete shape behind the map's "retryable uploads" note — retry is per-upload, not a general offline queue (ADR-0001 rules that out).

## Adapter seam (pattern, applies to every resource)

Each resource gets a typed adapter object, consumed by TanStack Query hooks — never called directly from components:

- Plain CRUD methods: `list(query)`, `get(id)`, `create(input)`.
- One method per backend action-endpoint, named after the action: `assign`, `start`, `suspend`, `resume`, `cancel`, `reschedule`, etc. — mirroring Backend's `POST /resource/:id/verb` convention.
- Every method parses its response through the resource's Zod schema before returning. A contract violation throws immediately, at the adapter boundary, rather than reaching the UI as untyped or malformed data.
- Auth header attachment is a stub at this layer (`getToken()` injected from the BFF session, never from browser storage) — resolved in full by the authentication/session ticket.
- **Replacement boundary** (ADR-0003): when Backend's OpenAPI ships, only the adapter's internals change — the fetch call, and where the Zod schema's shape comes from. Method signatures and inferred TS types stay stable, so UI and query-hook code never needs to change. The Zod validation layer itself stays permanently, even after a generated client exists.

## Naming conventions

Adapted from Backend's DTO naming, dropping the `Dto` suffix since there's no decorator layer to name:

| Backend (NestJS/Swagger) | Frontend (Zod) |
|---|---|
| `Create*Dto` | `Create<Resource>Input` |
| `Update*Dto` | `Update<Resource>Input` |
| `Query*Dto` | `<Resource>Query` |
| `*ResponseDto` | `<Resource>Schema` (inferred type: `<Resource>`) |

## Fixtures & mocks

One MSW handler set and fixture collection, reused across unit tests, Storybook, and local dev — not separate mocks per tool. Fixtures are scenario-shaped, not raw CRUD dumps: named states like "route mid-execution, one zone serviced" or "point service suspended, awaiting office cancel decision," not a generic `service-1.json`.

## Capability annotations

Each action endpoint below notes the capability it requires (from [#8](https://github.com/hllous/Frontend-M6-DAPS2/issues/8)'s capability model), the same way Backend's own standard notes required roles in each endpoint's description.

## Worked example: Service

Drawn directly from [#10](https://github.com/hllous/Frontend-M6-DAPS2/issues/10)'s resolved workflow.

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /services` | `service:schedule` | Create — generic `PLANNED`/`MANUAL` form, or linked-create prefilled from a `TICKET`/`INSPECTION`/`WEATHER_ALERT` reference. `mode` is copied from the `ServiceType`, never chosen directly | confirmed shape, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /services` | — (scoped by actor per #8) | List — paginated, filterable (`status`, `serviceTypeId`, `mode`, `origin`, `crewId`, `vehicleId`, `zoneId`, `ticketId`, `scheduledFrom`, `scheduledTo`), sortable | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /services/:id` | — (scoped by actor per #8) | Detail, with zones, ZoneResults and CollectionRecords | confirmed |
| `POST /services/:id/assign-crew` | `service:assign` | Attach crew + vehicle to an already-scheduled Service; accepts `overrideNote` when double-booked | **gap identified** — real `AssignCrewDto` has only `crewId`/`vehicleId`, no `overrideNote` field, no server-side double-booking check |
| `POST /services/:id/start` | Crew Leader of the assigned crew | Only the assigned crew; allowed outside window (flagged, not blocked); 409 without an assigned crew, or without a vehicle if the `ServiceType` requires one | confirmed |
| `POST /services/:id/zone-results` | Crew Leader of the assigned crew | Record one zone's ZoneResult; applies to **both** ROUTE and POINT — a POINT Service still carries exactly one zone in `zoneIds[]` and needs its ZoneResult recorded before it can complete. `reason` required unless `status = SERVICED` | **corrected** — real path/shape differs from the original hypothesis (`zone-results`, not `zones/:zoneId/result`), and there is no POINT-only outcome shortcut; see note below |
| `POST /services/:id/complete` | Crew Leader of the assigned crew | Takes **no request body**. 409 if any of the Service's zones (ROUTE's several, or POINT's one) is missing its ZoneResult. `COMPLETED` if every ZoneResult is `SERVICED`, else `PARTIALLY_COMPLETED` — computed server-side, never chosen by the caller | **corrected** — the original hypothesis split this into a separate POINT-only shape; the real backend uses one uniform action for both modes |
| `POST /services/:id/suspend` | Crew Leader of the assigned crew | `IN_PROGRESS → SUSPENDED`. `reason` required (`StatusChangeDto`) | confirmed |
| `POST /services/:id/resume` | Crew Leader of the assigned crew | `SUSPENDED → IN_PROGRESS`. Field self-resume for transient causes; clears the prior reason | confirmed |
| `POST /services/:id/cancel` | `service:cancel` | `SCHEDULED` **or** `SUSPENDED` → `CANCELLED`. `reason` required. Not reachable directly from `IN_PROGRESS` — an in-progress Service must be suspended first | **corrected** — the original hypothesis said "only reachable from `SUSPENDED`," which drops the direct `SCHEDULED → CANCELLED` path; #10's actual resolution comment already had this right, only this table's summary was too compressed |
| `POST /services/:id/reschedule` + `POST /services/:id/confirm-reschedule` | `service:reschedule` | `SCHEDULED → RESCHEDULED` with `reason`, then `RESCHEDULED → SCHEDULED` with the new date/window via a second call. Preserves the existing `zoneIds` snapshot verbatim — neither call touches it | confirmed (as two calls, not one) |
| — | Crew Leader of the assigned crew | Delayed notice (field-raised badge: note + revised ETA) | **no real endpoint** — `DELAYED` exists only as an internal, non-persisted fact per `docs/backend-context/entidades/service.md`; nothing in the 94 routes exposes writing one yet |
| — | Crew Leader of the assigned crew | Evidence upload, attached by reference to a Service or ZoneResult outcome | **no real endpoint** — `Service.attachments[]`/`ZoneResult.attachments[]` exist in the data model, but the write path is Backend Phase 7 (alongside `citizen-portal`), not built yet |

**Corrections against the real backend (`docs/backend-context/`, refreshed 2026-09-02, commit `9634379`):** the original table modeled ROUTE and POINT as needing two different completion mechanisms (per-zone ZoneResults vs. a single Service-level outcome). The real backend doesn't draw that line — every Service, POINT included, carries a non-empty `zoneIds[]` and needs a ZoneResult per zone before `POST /services/:id/complete` will succeed; POINT just always has exactly one. Delayed notice and Evidence upload stay pure hypothesis with no endpoint to check against yet — not downgraded further, just still unconfirmed. Not reopening #10 over any of this: the actor-facing workflow it resolved (who can do what, when) still holds; only this table's endpoint-level shape needed correcting.

## Worked example: Zones, Routes and Service Frequencies

Drawn from [#36](https://github.com/hllous/Frontend-M6-DAPS2/issues/36). `Zone` and `Route` are plain catalog CRUD, same alta/baja `status` posture as the other catalogs — codes are immutable after creation. `ServiceFrequency` is the one exception: it has no `active` column at all, closing via `validTo` instead (see the **Validity (ServiceFrequency)** term in `CONTEXT.md`). Capability names (`zone:manage`, `route:manage`, `serviceFrequency:manage`) are a frontend hypothesis, same rationale as the catalogs above.

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /zones` | `zone:manage` | Create — `code`, `name` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /zones` | — (any authenticated actor; used across Route/Service/Container/Tree scoping) | List — paginated, filterable (`active`, `search`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /zones/:id` | — | Detail, with assigned neighborhoods | confirmed |
| `PATCH /zones/:id` | `zone:manage` | Update `name`, `active`. `code` is **immutable after creation** | confirmed immutability rule, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `DELETE /zones/:id` | `zone:manage` | Logical delete. Backend performs **no referential check** — a Zone still listed in an active Route's stops, or still carrying Containers/Trees/GreenSpaces, deactivates without complaint | **gap identified** — frontend adds its own warn-but-allow confirmation (lists what still references the Zone) before submitting; backend itself has no guard, see `zones.service.ts` |
| `POST /zones/:id/neighborhoods` | `zone:manage` | Assign one or more M9 neighborhoods (`neighborhoodIds[]`); duplicates silently ignored | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md) — but the neighborhood **picker itself has no real data source**: M9's neighborhood catalog is an unpublished 🔴 blocker (`docs/backend-context/bloqueantes.md`). Frontend hypothesizes a separate adapter to M9's catalog (search + id→name resolution), mocked via fixtures, same posture as the M1 identity hypothesis |
| `DELETE /zones/:id/neighborhoods/:neighborhoodId` | `zone:manage` | Remove one neighborhood; 404 if not assigned | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `POST /routes` | `route:manage` | Create — `code`, `name`. Nace sin paradas (no stops) | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /routes` | — (any authenticated actor; used for Service/ServiceFrequency scheduling forms) | List — paginated, filterable (`active`, `zoneId`, `search`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /routes/:id` | — | Detail, with the stop sequence in order | confirmed |
| `PATCH /routes/:id` | `route:manage` | Update `name`, `active`. `code` is **immutable after creation** | confirmed immutability rule; capability name is hypothesis |
| `DELETE /routes/:id` | `route:manage` | Logical delete — already-scheduled Services keep their `routeId`, so this is soft by design. No referential check against active ServiceFrequencies referencing the Route | **gap identified** — same warn-but-allow treatment as Zone deactivation above |
| `PUT /routes/:id/stops` | `route:manage` | **Full-replacement** of the stop sequence in one atomic call — add/remove/reorder all collapse into this single request; array order is stop order; empty array is valid (route left with no stops). 400 if a zone repeats | confirmed route and semantics, [endpoints.md](docs/backend-context/api/endpoints.md) and `routes.service.ts` |
| — (client-side only) | — | Advisory `updatedAt` staleness pre-check before submitting the stop-sequence replace | **gap identified** — the real endpoint is an unconditional delete-and-recreate with **no concurrency guard at all** (unlike Service's mutations, which at least get a server-side 409 backstop). Frontend adds the same advisory pre-check pattern from the Concurrency section above as its only protection against two Office users clobbering each other's edits |
| `POST /service-frequencies` | `serviceFrequency:manage` | Create the rule — `serviceTypeId` (must be `ROUTE`-mode, 400 otherwise; frontend pre-filters the picker to avoid a guaranteed-failure submit), `routeId`, `weekdays[]`, `shift`, `validFrom`, optional `validTo` | confirmed route and validation, [endpoints.md](docs/backend-context/api/endpoints.md) and `service-frequencies.service.ts` |
| `GET /service-frequencies` | — (any authenticated actor) | List — paginated, filterable (`serviceTypeId`, `routeId`, `shift`, `weekday`, `validOn`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /service-frequencies/:id` | — | Detail, with weekdays | confirmed |
| `PATCH /service-frequencies/:id` | `serviceFrequency:manage` | Update `weekdays[]` (replaces the full set), `shift`, `validFrom`/`validTo`. `serviceTypeId`/`routeId` are **immutable** | confirmed immutability rule, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `DELETE /service-frequencies/:id` | `serviceFrequency:manage` | **"Cerrar vigencia"** — closes `validTo` at today, or at `validFrom` if the rule hasn't started yet. Not a deactivation (no `active` column exists); does not touch any Service already created | confirmed route and semantics, [endpoints.md](docs/backend-context/api/endpoints.md) and `service-frequencies.service.ts` |
| — | — | Automatic generation of `PLANNED`-origin Services from a ServiceFrequency rule | **no real mechanism at all** — no cron/scheduled job exists anywhere in the backend, and `Service` has **no `frequencyId` FK** in `schema.prisma`. A ServiceFrequency is a pure stored configuration rule today, with zero automated effect. Frontend scope is rule-authoring CRUD only; it does not build a stand-in "generate Services" workaround (see #36's resolution comment) |

**Structural note (not a gap to fix, a fact to document):** because `Service` carries no `frequencyId`, a ServiceFrequency's validity window can never retroactively affect an already-created Service — they're fully disconnected records the moment a Service exists, the same snapshot posture as `Route.zoneIds` → `Service.ServiceZone`.

## Worked example: Service Types and Disposal Sites

Drawn from [#39](https://github.com/hllous/Frontend-M6-DAPS2/issues/39). Plain catalog CRUD — neither entity has its own state machine; `status` is alta/baja (active/inactive), not a lifecycle, per `docs/backend-context/entidades/configuracion-y-recursos.md`. Capability names (`serviceType:manage`, `disposalSite:manage`) are a frontend hypothesis, following the `<resource>:<action>` pattern the Service table above uses — [#8](https://github.com/hllous/Frontend-M6-DAPS2/issues/8) only established that Office "configures catalogs" generically, it didn't enumerate per-resource capability names.

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /service-types` | `serviceType:manage` | Create — `code`, `name`, `category`, `mode`, `requiresVehicle` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /service-types` | — (any authenticated actor; used for Service scheduling forms) | List — paginated, filterable (`active`, `category`, `mode`, `search`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /service-types/:id` | — | Detail | confirmed |
| `PATCH /service-types/:id` | `serviceType:manage` | Update `name`, `requiresVehicle`, `active`. `code`, `category` and `mode` are **immutable after creation** — already-scheduled Services copied them, so changing them retroactively would desync those Services | confirmed immutability rule, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `DELETE /service-types/:id` | `serviceType:manage` | Logical delete (deactivate) — no hard delete | confirmed route; capability name is hypothesis |
| `POST /disposal-sites` | `disposalSite:manage` | Create — `code`, `siteType`, `name` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /disposal-sites` | — (any authenticated actor; used for CollectionRecord entry) | List — paginated, filterable (`active`, `siteType`, `search`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /disposal-sites/:id` | — | Detail | confirmed |
| `PATCH /disposal-sites/:id` | `disposalSite:manage` | Update name, `siteType`, `active` | confirmed route; capability name is hypothesis |
| `DELETE /disposal-sites/:id` | `disposalSite:manage` | Logical delete only — already-recorded `CollectionRecord`s reference the site by id, so a hard delete would orphan them | confirmed rationale, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |

## Worked example: Crews and Vehicles

Drawn from [#40](https://github.com/hllous/Frontend-M6-DAPS2/issues/40). Plain catalog CRUD, same alta/baja `status` posture as above. `Crew.leaderUserId`/`memberUserIds[]` are M1 user ids — M6 doesn't issue or store identity beyond the id; resolving a display name is a separate REST call to M1, still unconfirmed per [configuracion-y-recursos.md](docs/backend-context/entidades/configuracion-y-recursos.md#crew). `Crew.organizationId` is also M1's: cooperatives and contractors exist here as crews, not as a separate M6 concept. Capability names (`crew:manage`, `vehicle:manage`) are hypothesis, same rationale as the catalogs above.

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /crews` | `crew:manage` | Create — `name`, `crewType`, `leaderUserId`, `organizationId` (M1 org id; relevant for `COOPERATIVE`/`CONTRACTOR` crews), `defaultShift` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /crews` | — (any authenticated actor; Field sees only their own per [#8](https://github.com/hllous/Frontend-M6-DAPS2/issues/8)) | List — paginated, filterable (`active`, `crewType`, `defaultShift`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /crews/:id` | — (scoped by actor per #8) | Detail, including `memberUserIds[]` (integrantes) | confirmed |
| `PATCH /crews/:id` | `crew:manage` | Update | confirmed route; capability name is hypothesis |
| `DELETE /crews/:id` | `crew:manage` | Logical delete | confirmed route; capability name is hypothesis |
| `POST /crews/:id/members` | `crew:manage` | Add one or more members (M1 user ids) to the crew | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `DELETE /crews/:id/members/:userId` | `crew:manage` | Remove one member | confirmed route; capability name is hypothesis |
| `POST /vehicles` | `vehicle:manage` | Create — `plate`, `vehicleType`, `capacity` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /vehicles` | — (any authenticated actor; used for Service assignment) | List — paginated, filterable (`active`, `vehicleType`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /vehicles/:id` | — | Detail | confirmed |
| `PATCH /vehicles/:id` | `vehicle:manage` | Update | confirmed route; capability name is hypothesis |
| `DELETE /vehicles/:id` | `vehicle:manage` | Logical delete | confirmed route; capability name is hypothesis |

## Worked example: Green Spaces

Drawn from [#41](https://github.com/hllous/Frontend-M6-DAPS2/issues/41). Plain catalog CRUD, same alta/baja `status` posture as above. A `GreenSpace` (plaza, parque, cantero or rambla) carries no action endpoints of its own — watering and mowing are scheduled as ordinary `Service`s *against* the space (`ServiceCategory.GREEN_SPACES`), not as `green-spaces/:id/...` actions. Capability name (`greenSpace:manage`) is hypothesis, same rationale as the catalogs above.

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /green-spaces` | `greenSpace:manage` | Create — `name`, `spaceType`, `areaM2`, `zoneId` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /green-spaces` | — (any authenticated actor; used for Service scheduling and the Mapa layer) | List — paginated, filterable (`active`, `spaceType`, `zoneId`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /green-spaces/:id` | — | Detail | confirmed |
| `PATCH /green-spaces/:id` | `greenSpace:manage` | Update | confirmed route; capability name is hypothesis |
| `DELETE /green-spaces/:id` | `greenSpace:manage` | Logical delete | confirmed route; capability name is hypothesis |

## Worked example: Containers and Green Points

Drawn from [#37](https://github.com/hllous/Frontend-M6-DAPS2/issues/37). `Container` is the one catalog in this batch with a real state machine (`ACTIVE`/`OVERFLOWED`/`DAMAGED`/`UNDER_REPAIR`/`RELOCATING`/`REMOVED`); `GreenPoint` is plain alta/baja CRUD like the others. Capability names (`container:report`, `container:manage`, `greenPoint:manage`) are a frontend hypothesis: `report` covers ambient field/office reporting of a problem (no assignment required), `manage` covers Office dispatch decisions, following the Office-holds-elevated-actions split from [ADR-0002](docs/adr/0002-office-and-field-actors-are-mutually-exclusive.md).

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /containers` | `container:manage` | Create — `code`, `containerType`, `zoneId`, `capacityLiters`, `address`/`lat`/`lng`. Nace en `ACTIVE` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /containers` | — (any authenticated actor) | List — paginated, filterable (`status`, `containerType`, `zoneId`, `search`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /containers/:id` | — | Detail | confirmed |
| `PATCH /containers/:id` | `container:manage` | Update `zoneId`, `capacityLiters`, `address`/`lat`/`lng`. `code` and `containerType` are **immutable after creation**; status-machine fields never go through this endpoint, only the transition endpoints below | confirmed, `containers.service.ts`; capability name is hypothesis |
| `POST /containers/:id/report-overflow` | `container:report` | `ACTIVE → OVERFLOWED`. Real endpoint takes **no request body** | confirmed route and semantics, [endpoints.md](docs/backend-context/api/endpoints.md) and `containers.service.ts` |
| `POST /containers/:id/empty` | — (bridged, not a standalone entry point) | `OVERFLOWED → ACTIVE`. Reached by completing the linked `POINT` Service (`targetRef` = this Container) — the frontend fires this call as a second request in that Service's completion submission, one crew action driving two API calls | **gap identified** — the backend's Service-completion path never touches `Container.status` itself (confirmed: no write-back to `container` anywhere in `services.service.ts`, despite `container.md` describing emptying as "executed as a Service"). The frontend bridges the two calls by convention only, with no backend-enforced atomicity between them |
| `POST /containers/:id/report-damage` | `container:report` | `ACTIVE → DAMAGED`. `damageType`, `severity`, `requiresPublicWorks` (defaults `false`); `true` fires `containerDamaged` → M3 | confirmed route and payload, [endpoints.md](docs/backend-context/api/endpoints.md) and `report-damage.dto.ts` |
| `POST /containers/:id/start-repair` | `container:manage` | `DAMAGED → UNDER_REPAIR`. Office dispatch decision, no request body | confirmed |
| `POST /containers/:id/complete-repair` | `container:manage` (standalone) or bridged, same as `empty` | `UNDER_REPAIR → ACTIVE`. Standalone Office action when no repair Service was scheduled for it; bridged from a completed Service the same way as `empty` when one was | confirmed route; bridging is the same frontend-only convention as `empty` above, same gap |
| `POST /containers/:id/relocate` | `container:manage` | `ACTIVE → RELOCATING`. Office dispatch decision (the *initiating* half), no request body | confirmed |
| `POST /containers/:id/confirm-relocation` | — (bridged, same as `empty`) | `RELOCATING → ACTIVE` with the new `address`/`lat`/`lng` | same bridging gap as `empty` above |
| `POST /containers/:id/remove` | `container:manage` | Terminal state, no further transitions | **corrected** — the controller's own Swagger description claims `ACTIVE\|DAMAGED → REMOVED`, but the real `VALID_TRANSITIONS` table in `containers.service.ts` only allows `DAMAGED → REMOVED`; `endpoints.md` already had this right ("Solo desde `DAMAGED`"), only the controller docstring is stale |
| — (client-side only) | — | Evidence (photo/note) on `report-overflow`, `report-damage`, `remove`, and standalone `complete-repair` | **gap identified** — same posture as Service's own evidence gap above, not a lesser standard: `POST /containers/:id/evidence` is hypothesized (idempotent upload, attach-by-reference, per the Evidence/upload contract section), but no real endpoint exists yet, same Backend Phase 7 dependency. `start-repair` and `relocate` (the initiating call) stay bare — they're dispatch decisions to act, not records of a finding or a result |
| `POST /green-points` | `greenPoint:manage` | Create — `code`, `name`, `zoneId`, `wasteTypes[]`, `address`/`lat`/`lng` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /green-points` | — (any authenticated actor) | List — paginated, filterable (`active`, `zoneId`, `wasteType`, `search`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /green-points/:id` | — | Detail, with accepted waste types | confirmed |
| `PATCH /green-points/:id` | `greenPoint:manage` | Update. `wasteTypes[]` **fully replaces** the accepted set (composite key, not an ordered list — same full-replace posture as Route's stop-sequence `PUT`) | confirmed, `green-points.service.ts` |
| `DELETE /green-points/:id` | `greenPoint:manage` | Logical delete (`active = false`) | confirmed |

**Structural note:** `GreenPoint` has no state machine and no report/transition endpoints of its own — emptying and upkeep are scheduled as ordinary `Service`s (`mode = POINT`, `targetRef` = the Green Point), same as `GreenSpace`. Only `Container` carries real lifecycle state; the bridging gap above is specific to it.

## Worked example: Trees, Tree Surveys and Tree Interventions

Drawn from [#38](https://github.com/hllous/Frontend-M6-DAPS2/issues/38). `Tree` is plain alta/baja catalog CRUD; `TreeSurvey` is an immutable, ambient observation record with no lifecycle; `TreeIntervention` is the one real state machine in this batch. Capability names (`tree:manage`, `tree:survey`, `treeIntervention:request`, `treeIntervention:authorize`) are a frontend hypothesis — `treeIntervention:authorize` was already named in [#8](https://github.com/hllous/Frontend-M6-DAPS2/issues/8); `assign-service` reuses `service:schedule` rather than a Tree-specific capability, since it's the same "Office schedules a Service" action as everywhere else.

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /trees` | `tree:manage` | Create — `surveyCode` (unique, e.g. `ARB-00442`), `zoneId`, `species`, `address`/`lat`/`lng` (real decimals, not a generic `location`), `heightM`, `diameterCm` | confirmed route and fields, [endpoints.md](docs/backend-context/api/endpoints.md) and `create-tree.dto.ts` |
| `GET /trees` | — (any authenticated actor; used for Inventario list and the Mapa layer) | List — paginated, filterable (`active`, `zoneId`, `search` on species/address) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /trees/:id` | — | Detail | confirmed |
| `PATCH /trees/:id` | `tree:manage` | Update `zoneId`, `species`, `address`/`lat`/`lng`, `heightM`, `diameterCm`, `active`. `surveyCode` is **immutable after creation** — absent from `UpdateTreeDto` entirely, not just guarded | confirmed, `trees.service.ts` |
| `DELETE /trees/:id` | `tree:manage` | Logical delete (`active = false`) | confirmed |
| `POST /trees/:treeId/surveys` | `tree:survey` | Record a survey — `surveyedAt`, `healthStatus`, `riskLevel`, `riskType`, `suggestedIntervention`, `requiresStreetClosure`, `requiresPublicWorks`, `notes`. **Immutable once created** — no update or delete endpoint exists for a survey | confirmed route and immutability, [endpoints.md](docs/backend-context/api/endpoints.md) and `tree-surveys.controller.ts` |
| — (client-side only) | — | Require `riskType` when `riskLevel` is `HIGH`/`CRITICAL` | **frontend-enforced, backend doesn't** — `riskType` is documented "requerido si riskLevel >= HIGH" (`create-tree-survey.dto.ts:31`) but decorated only `@IsOptional()`; nothing blocks submitting a high-risk survey with no risk type. Frontend blocks submit; backend accepts either way |
| `GET /trees/:treeId/surveys` | — (any authenticated actor) | List — paginated, filterable (`healthStatus`, `riskLevel`), newest first | confirmed filters and ordering, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /trees/:treeId/surveys/:surveyId` | — | Detail | confirmed |
| — (client-side only) | — | "Request intervention" action on a high-risk survey, pre-filling `interventionType` from `suggestedIntervention` and `treeIds` from the tree | **gap identified** — `TreeSurvey.suggestedIntervention` is a bare enum hint, no FK to any `TreeIntervention` it leads to. Same shape as the Container→Service bridge in #37: the frontend supplies a guided action with no backend-tracked relationship. `justification` on the resulting intervention is pre-filled with a free-text reference to the source survey's date/id so the link survives as a readable trail |
| `POST /tree-interventions` | `treeIntervention:request` | Create — `interventionType`, `treeIds[]` (non-empty), `address`, `requiresStreetClosure`, `priority`, `justification`. Always starts `REQUESTED` regardless of type | confirmed route and validation, [endpoints.md](docs/backend-context/api/endpoints.md) and `create-tree-intervention.dto.ts` |
| — (client-side only) | — | Require `justification` when `interventionType` is `REMOVAL` | **frontend-enforced, backend doesn't** — documented "obligatorio para REMOVAL, opcional para el resto" (`create-tree-intervention.dto.ts:62`) but decorated only `@IsOptional()`. Frontend blocks submit on a justification-less removal request; backend accepts it |
| `GET /tree-interventions` | — (any authenticated actor) | List — paginated, filterable (`interventionType`, `status`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /tree-interventions/:id` | — | Detail, with linked trees | confirmed |
| `POST /tree-interventions/:id/submit-for-authorization` | `treeIntervention:request` | `REQUESTED → PENDING_AUTHORIZATION`. **REMOVAL only** — 400 for every other `interventionType` | confirmed, `tree-interventions.service.ts` |
| `POST /tree-interventions/:id/authorize` | `treeIntervention:authorize` | `→ AUTHORIZED`. **Every intervention type must pass through this call**, not REMOVAL alone — REMOVAL from `PENDING_AUTHORIZATION` only (409 if still `REQUESTED`, forcing `submit-for-authorization` first); every other type directly from `REQUESTED`. Sets `authorizedByUserId`/`authorizedAt` on **every** call, not REMOVAL-exclusively | **corrected** — `docs/backend-context/entidades/tree-intervention.md`'s state diagram phrase "el resto se programa directo" reads as "no authorization needed," and the schema comments `// solo REMOVAL` on `authorizedByUserId`/`authorizedAt`/`justification` (`schema.prisma:658-660`) reinforce that misreading. The real `VALID_TRANSITIONS` table and `authorize()` (`tree-interventions.service.ts:27-32`, `138-157`) show authorization is universal; only the extra `PENDING_AUTHORIZATION` checkpoint is REMOVAL-exclusive. UI shows one visible "Authorize" action for every type — see #38's resolution |
| — (client-side only) | — | `authorize`'s `authorizedByUserId` isn't derived from the caller's JWT | **gap identified** — `AuthorizeInterventionDto.authorizedByUserId` is an optional free-text string supplied by the caller, not read from the authenticated session server-side. Frontend fills it from the current Office actor's own id rather than exposing it as an editable field, so the record reflects who actually clicked, even though the backend doesn't enforce that |
| `POST /tree-interventions/:id/reject` | `treeIntervention:authorize` | `PENDING_AUTHORIZATION → REJECTED`. Takes **no request body** — no reason/note field exists anywhere on the backend | confirmed route; **gap identified** — no way to record why an intervention was rejected. Frontend can collect a reason in its own UI, but has nowhere on the backend to persist it against this intervention |
| — (client-side only) | — | "Create new request" action on a `REJECTED` intervention, pre-filled from the rejected one | **gap identified** — `REJECTED` has no outgoing transition (`VALID_TRANSITIONS` maps it to `[]`) and no reopen endpoint. Frontend offers a fresh `POST /tree-interventions` pre-filled with the rejected record's fields; no backend-tracked relationship between old and new |
| `POST /tree-interventions/:id/assign-service` | `service:schedule` | Link an `AUTHORIZED` intervention to the `POINT` `Service` executing it. 409 if not `AUTHORIZED`, 409 if already linked (`serviceId` is `@unique`), 400 if the target `Service.mode` isn't `POINT` | confirmed, `tree-interventions.service.ts:176-221` |
| — (client-side only) | — | One guided "Schedule" action bundling `Service` creation and `assign-service` | **gap identified (by design)** — the backend has no combined endpoint; the frontend's single UI action issues `POST /services` (`targetType=TREE`, `targetId` = the first of `treeIds[]`, since a `Service` takes exactly one target) followed by `assign-service` as a second call, same "one crew action, two API calls" shape as the Container bridge in #37. When `treeIds[]` has more than one tree, every tree is still shown on the intervention's and the Service's Related panel |
| — (client-side only) | — | Evidence (photo/note) on survey creation and on `authorize`/`reject` | **gap identified** — same posture as Service's and Container's evidence gaps: `POST /trees/:treeId/surveys/:surveyId/evidence` and the equivalent on interventions are hypothesized, not built (Backend Phase 7). Fully optional here — unlike Service, this workflow has no exception-outcome concept that would make evidence mandatory on some path |

**Structural note:** `TreeSurvey` has no `serviceId` — unlike `EnvironmentalInspection`, which is Service-linked, a survey can never be tied to a scheduled Service. It's ambient, same shape as Container's `report-overflow`/`report-damage`, not like a Service-driven inspection outcome.

Other resources (environmental reports/inspections) follow the same pattern above but aren't drafted here — each gets its contract detail when its own domain-area ticket graduates from the map's fog.
