# M6 Frontend Contract Hypotheses

This document started when no M6 backend endpoint existed. **Backend has since finished all seven phases of its plan** — 130 routes across 23 Swagger tags as of `develop` commit `ffaa479` (mirrored 2026-09-03 in [`docs/backend-context/api/endpoints.md`](docs/backend-context/api/endpoints.md)). What remains a hypothesis here is narrower than it was: the request-side conventions Backend never documented, the capability names, the M1 identity fields M1 itself hasn't published, and the client-side rules the frontend enforces on top of a permissive backend. Endpoint shapes are now checkable against a real implementation. See [ADR-0003](docs/adr/0003-hand-written-contract-hypotheses-with-permanent-zod-validation.md) for why the hand-written-plus-Zod approach was chosen over waiting, and why the Zod layer stays even now.

Every row below is `hypothesis` until marked `confirmed`, with a link to the Backend doc or source that confirmed it. A row still marked `hypothesis` is what the frontend is built to expect, not a claim about how the backend works.

## Anchor: Backend's own documented standard

`docs/backend-context/api/estandar-swagger.md` is Backend's own team-approved API standard (read-only mirror, refreshed 2026-09-03 from `develop` commit `ffaa479`). Every endpoint Backend shipped follows it, so this document adopts it verbatim rather than inventing a competing shape:

- **Success**: bare resource object (or array) on the wire, never wrapped in `{ data: ... }`.
- **Paginated lists**: `{ data: T[], meta: { total, page, pageSize, totalPages } }`.
- **Errors**: `{ statusCode, message, error, timestamp, path }`, produced by a global exception filter.
- **Routes**: kebab-case plural (`/environmental-reports`), action-on-resource for non-CRUD verbs (`POST /services/:id/start`), never raw verbs in the URL.
- **Auth**: Bearer JWT issued by M1, `Authorization: Bearer <token>`.

## Identity and session boundary with M1

**Confirmed decision (2026-09-01): M1 issues the user JWT; M6 validates it.** M6 does not issue a replacement user token. M1's v2 document also declares `POST /api/v1/auth/login`, `POST /api/v1/auth/empleados/login`, `POST /api/v1/auth/refresh`, and `POST /api/v1/auth/logout`; login and refresh return the access token in `Authorization: Bearer`, with the refresh token in `X-Refresh-Token` on login and the token lifetime in `X-Token-Expires-In`.

This is not yet a complete verification contract. M1 still has to publish `alg`, `iss`, `aud`, signing-key/JWKS distribution, mandatory JWT claims, exact TTLs, refresh request body and rotation/revocation behavior. Treat every missing field as **hypothesis**, not as an implementation detail to invent.

The browser talks only to the Next.js BFF. The BFF talks only to M6 Backend; M6 Backend owns the server-to-server adapter to M1 for login, refresh and logout, and independently validates the M1 token for domain requests. The original M1 access token is stored in the sealed, `httpOnly` BFF session cookie; only BFF server code can unseal it and forward it as Bearer to M6 Backend. It never reaches browser JavaScript. M6 currently has no domain use case that consumes M1's citizen, organization or representation events/endpoints. If one appears, it is introduced behind a typed identity-directory adapter, so REST and Kafka request/response remain swappable transports.

## Request conventions (mostly confirmed)

Backend's written standard fixes response shapes and says nothing about request query params, but the shipped code settles most of it:

- **Pagination**: `?page=1&pageSize=20` — **confirmed**, `PaginationQueryDto` in `src/common/dto/`, which every list DTO extends. `pageSize` is capped at 100 and rejected (400) above it, so the frontend never requests more.
- **Filtering**: camelCase query keys mirroring resource fields, e.g. `?status=SCHEDULED&crewId=...` — **confirmed** across every list endpoint; the per-resource filter sets are enumerated in the tables below.
- **Sorting**: **no client-controlled sorting exists.** There is no `sortBy`/`sortDir` anywhere; each list endpoint has a fixed server-side ordering (e.g. Services by `scheduledDate desc, createdAt desc`, tree surveys newest-first). Any column-sort affordance in the UI is therefore client-side over the current page only, or it needs a backend change — it must not be presented as if it sorts the whole result set.

## Business-rule error discriminability (confirmed gap)

Backend's `ErrorResponseDto` (`src/common/dto/error-response.dto.ts`) carries `statusCode`, `message`, `error`, `timestamp`, `path` — a free-text `message` and **no machine-readable discriminator**. That's still true with Backend's plan closed, so it is no longer a "wait and see" but a standing gap. M6 wanted to tell a *blocking* 409 (a Service state-machine violation) apart from a *warning-with-override* 409 (crew double-booking, overridable with a note — see #10); the second case doesn't exist server-side anyway (`AssignCrewDto` has no double-booking check at all), so nothing is currently blocked by this. The `code` field (`SCREAMING_SNAKE_CASE`, e.g. `INVALID_STATE_TRANSITION`) stays the proposed fix if a real need appears — raise it as a Backend issue rather than parsing `message` strings, which would break on any wording change.

## Concurrency / staleness detection (hypothesis)

Relevant to Service reschedule/cancel and the local-draft conflict behavior in [ADR-0001](docs/adr/0001-no-offline-queue-for-field-service-actions.md). The frontend compares the `updatedAt` it last read for a resource against the server's current `updatedAt` before submitting a mutation, as an optimistic client-side pre-check — no new backend field needed, since every resource already carries `updatedAt` per Backend's own DTO example. This is advisory only: the backend's 409 at submit time is the authoritative backstop regardless of what the client's pre-check found.

## Evidence / upload contract (confirmed)

Backend shipped this as **one generic endpoint**, not a per-resource sub-route — the hypothesized `POST /services/:id/evidence` shape does not exist. Confirmed against `docs/backend-context/api/endpoints.md` and `src/modules/attachments/`:

- `POST /evidence` — `multipart/form-data`, **one file per call**. Fields: `file`, `ownerType`, `ownerId`. Returns `{ id, url, filename, contentType, uploadedAt }`.
- `GET /evidence?ownerType=&ownerId=` — every attachment on that resource, oldest-to-newest. Returns a bare array, not a paginated envelope.
- **`ownerType` is a closed set of four**: `SERVICE`, `ZONE_RESULT`, `INSPECTION`, `CONTAINER`. Trees, tree surveys and tree interventions are **not** valid owners — the tree-side evidence rows below stay gaps for that reason, not because the upload path is missing.
- `ownerId` must reference an already-existing resource; 404 otherwise. So evidence is always attached *after* the owner is created, never in the same call.
- **`Idempotency-Key` header is required** (a client-minted UUID, one per upload attempt). The same key re-sent for the same owner returns the existing `Attachment` instead of re-uploading, backed by a unique DB constraint on (`ownerType`, `ownerId`, `idempotencyKey`) — a real guarantee, not a pre-check that could lose a race. This is exactly the retryable-upload shape ADR-0001 assumed; retry is per-upload, not a general offline queue.
- **Accepted types**: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. **Max 10 MB** per file; 400 on either violation. The frontend enforces both client-side before submitting.
- `filename` in the response is **server-derived** from the stored key plus the extension implied by the MIME type — it is *not* the name the user's file had. Don't show it as "the file the user picked"; keep the original name client-side if the UI needs it.
- An exception outcome still carries an **array** of evidence refs, not a single one ("reason + note, photo where feasible" doesn't cap the count — see the `Evidence` term in `CONTEXT.md`). With a one-file-per-call endpoint, that means N sequential uploads, each with its own idempotency key.
- Storage is Cloudflare R2 (S3-compatible, public bucket); `url` is directly renderable.

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
| — | Crew Leader of the assigned crew | Delayed notice (field-raised badge: note + revised ETA) | **no real endpoint** — `DELAYED` exists only as an internal, non-persisted fact per `docs/backend-context/entidades/service.md`; nothing in the 130 routes exposes writing one, and Backend has finished its plan, so this is a permanent gap unless it's raised as a change |
| `POST /evidence` (`ownerType=SERVICE` / `ZONE_RESULT`) | Crew Leader of the assigned crew | Evidence upload, attached by reference to a Service or ZoneResult outcome | **confirmed** — the generic endpoint covers both owner types; see the Evidence/upload section above. Uploaded as a separate call after the outcome record exists, so a mandatory-evidence exception outcome is two calls, not one |

**Corrections against the real backend (`docs/backend-context/`, refreshed 2026-09-03, commit `ffaa479`):** the original table modeled ROUTE and POINT as needing two different completion mechanisms (per-zone ZoneResults vs. a single Service-level outcome). The real backend doesn't draw that line — every Service, POINT included, carries a non-empty `zoneIds[]` and needs a ZoneResult per zone before `POST /services/:id/complete` will succeed; POINT just always has exactly one. Evidence upload is now confirmed against the generic `POST /evidence`. Delayed notice is the one row with no endpoint left, and since Backend closed its plan it won't get one on its own — it's a change request, not a pending phase. Not reopening #10 over any of this: the actor-facing workflow it resolved (who can do what, when) still holds; only this table's endpoint-level shape needed correcting.

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
| `POST /evidence` (`ownerType=CONTAINER`) | `container:report` | Evidence (photo/note) on `report-overflow`, `report-damage`, `remove`, and standalone `complete-repair` | **confirmed** — the hypothesized `POST /containers/:id/evidence` doesn't exist; the generic endpoint does, with `CONTAINER` as a valid owner type. Attached to the container, not to the individual transition, so the UI has to keep its own ordering/labelling if it wants to say *which* report a photo belongs to. `start-repair` and `relocate` (the initiating call) stay bare — they're dispatch decisions to act, not records of a finding or a result |
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
| — (client-side only) | — | Evidence (photo/note) on survey creation and on `authorize`/`reject` | **gap identified** — the generic `POST /evidence` shipped, but its `ownerType` set is `SERVICE`/`ZONE_RESULT`/`INSPECTION`/`CONTAINER` only: a tree, a survey and an intervention are all invalid owners, so there is no way to attach a photo to any of them. Fully optional here — unlike Service, this workflow has no exception-outcome concept that would make evidence mandatory on some path — so the frontend simply doesn't offer it, rather than routing it somewhere it doesn't belong. Adding `TREE_SURVEY`/`TREE_INTERVENTION` to the enum is the natural fix if the need becomes real |

**Structural note:** `TreeSurvey` has no `serviceId` — unlike `EnvironmentalInspection`, which is Service-linked, a survey can never be tied to a scheduled Service. It's ambient, same shape as Container's `report-overflow`/`report-damage`, not like a Service-driven inspection outcome.

## Shipped by Backend, not yet drafted here

These resources exist on the backend (all of them mirrored in [`docs/backend-context/api/endpoints.md`](docs/backend-context/api/endpoints.md)) but have no contract table here yet. They get one when their own domain-area ticket graduates from the map's fog — the table is written against the mirror, not invented, so drafting one early buys nothing.

| Tag | What it covers | Worth knowing before the ticket opens |
|---|---|---|
| `environmental-reports` | The 11-state ambient case file, opened from an M2 ticket or as an own-initiative detection | Only four transitions have endpoints (`start-review`, `forward`, `dismiss`, `close`); the rest are driven by the inspection. `NOTICE_ISSUED → CLOSED` happens **on a timer with no endpoint** (`SANCTION_DEADLINE_DAYS`), so the UI must never present it as an action. `escalated`/`citizenResponse` are written by M2 via events, never by us |
| `environmental-inspections` | Scheduling an inspection, completing it with an outcome, and issuing the `ViolationNotice` | The notice is **immutable** — no PATCH, no DELETE, 409 on a second notice for the same inspection. `checklist[]`, `findings` and `inspectorId` never leave the module. Without an `establishmentId` the notice is recorded but not forwarded to M4 |
| `repair-requests`, `street-closure-requests` | Outbound referrals to M3 and M7 | `publicSafetyRisk` on a repair request is a **required field of its own**, not derived from `severity` — M3's schema demands it, so whoever reports the damage fills it in |
| `indicators` | The four dashboard families (`coverage`, `compliance`, `incidents`, `waste`), all `from`/`to` filtered, defaulting to the last 30 days | The unit of coverage is the **(service, zone) pair**, not the service. `CANCELLED` services aren't counted as non-compliance. Container and tree figures are a snapshot of *now*, not of the period — only the reports are period-filtered |
| `citizen-portal` | `/public/reports/:ticketId`, `/public/services`, `/public/green-points`, `/public/zones` | The **only** unauthenticated endpoints in the module. Every response is an explicit projection; `/public/reports/:ticketId` returns 404 whether or not the ticket exists, and collapses the 11 case-file states into seven citizen-facing stages |
| `events` | Inbound event ingestion | Backend-to-backend, not a frontend surface |
