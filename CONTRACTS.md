# M6 Frontend API Contracts and Known Gaps

This document describes the API behavior the frontend consumes, the frontend-only rules layered on top, and the remaining contract hypotheses. Backend's seven implementation phases are complete; its current `develop` snapshot, checked 2026-10-01, is `30d49ea1d56f735a124ae9260cafefff095e07b6` with 134 REST operations across 23 Swagger tags. The authoritative, versioned [OpenAPI document at that commit](https://github.com/hllous/Backend-M6-DAPS2/blob/30d49ea1d56f735a124ae9260cafefff095e07b6/docs/api/openapi.json) is generated from code and checked by CI. The read-only summary mirror is in [`docs/backend-context/`](docs/backend-context/README.md), including [`api/endpoints.md`](docs/backend-context/api/endpoints.md). **Confirmed** means checked against the pinned OpenAPI/implementation; **hypothesis** means the frontend schema has not yet been reconciled with that source or an external integration remains unconfirmed. See [ADR-0003](docs/adr/0003-hand-written-contract-hypotheses-with-permanent-zod-validation.md) for why handwritten schemas and runtime Zod validation remain in the frontend.

## Anchor: Backend's own documented standard

[`docs/backend-context/api/estandar-swagger.md`](docs/backend-context/api/estandar-swagger.md) is Backend's API standard, copied from the pinned `develop` snapshot above. This document adopts it rather than inventing a competing shape:

- **Success**: bare resource object (or array) on the wire, never wrapped in `{ data: ... }`.
- **Paginated lists**: `{ data: T[], meta: { total, page, pageSize, totalPages } }`.
- **Errors**: `{ statusCode, message, error, timestamp, path }`, produced by a global exception filter.
- **Routes**: kebab-case plural (`/environmental-reports`), action-on-resource for non-CRUD verbs (`POST /services/:id/start`), never raw verbs in the URL.
- **Auth**: Bearer JWT issued by M1, `Authorization: Bearer <token>`.

## Identity and session boundary with M1

**Decision:** M1 issues the user JWT; M6 validates it. M6 does not issue a replacement user token. M1's v2 document declares `POST /api/v1/auth/login`, `POST /api/v1/auth/empleados/login`, `POST /api/v1/auth/refresh`, and `POST /api/v1/auth/logout`; login and refresh return the access token in `Authorization: Bearer`, with the refresh token in `X-Refresh-Token` on login and the token lifetime in `X-Token-Expires-In`.

This is not yet a complete verification contract. M1 still has to publish `alg`, `iss`, `aud`, signing-key/JWKS distribution, mandatory JWT claims, exact TTLs, refresh request body and rotation/revocation behavior. Treat every missing field as **hypothesis**, not as an implementation detail to invent. The current frontend has `mock` and `backend-development` modes; `real-m1` deliberately fails closed. It does not yet log in to M1.

The browser talks only to same-origin Next.js Route Handlers. In `backend-development` mode those handlers read the sealed session cookie and call M6 Backend server-side with `M6_DEV_JWT` as Bearer; `M6_BACKEND_ORIGIN` is never exposed to browser code. The real M1 token flow described by the architecture decision is not implemented yet. M6 currently has no domain use case that consumes M1's citizen, organization or representation events/endpoints. If one appears, it is introduced behind a typed identity-directory adapter, so REST and Kafka request/response remain swappable transports.

## Request conventions (mostly confirmed)

Backend's written standard fixes response shapes and says nothing about request query params, but the shipped code settles most of it:

- **Pagination**: `?page=1&pageSize=20` — **confirmed**, `PaginationQueryDto` in `src/common/dto/`, which every list DTO extends. `pageSize` is capped at 100 and rejected (400) above it, so the frontend never requests more.
- **Filtering**: camelCase query keys mirroring resource fields, e.g. `?status=SCHEDULED&crewId=...` — **confirmed** across every list endpoint; the per-resource filter sets are enumerated in the tables below.
- **Sorting**: **no client-controlled sorting exists.** There is no `sortBy`/`sortDir` anywhere; each list endpoint has a fixed server-side ordering (e.g. Services by `scheduledDate desc, createdAt desc`, tree surveys newest-first). Any column-sort affordance in the UI is therefore client-side over the current page only, or it needs a backend change — it must not be presented as if it sorts the whole result set.

## Business-rule error discriminability (confirmed gap)

Backend's `ErrorResponseDto` carries `statusCode`, `message`, `error`, `timestamp`, and `path` — a free-text `message` and **no machine-readable discriminator**. Assignment overlap is now handled explicitly: `GET /services/:id/assignment-conflicts` reports conflicts, and `POST /services/:id/assign-crew` permits an override with a 10–500 character `overrideNote`. The frontend currently computes an advisory preflight from its loaded Service list, sends that note when needed, and handles a backend 409; it does not call the dedicated conflict endpoint. The missing `code` field remains a limitation for distinguishing other kinds of 409 responses; do not parse message strings as a general substitute.

## Concurrency / staleness (known limitation)

For a local Field draft, the frontend fetches the Service again and compares its `updatedAt` with the snapshot the draft was composed against before offering manual resubmission; a mismatch is shown as a conflict per [ADR-0001](docs/adr/0001-no-offline-queue-for-field-service-actions.md). This catches changes seen by that fresh read, but Backend does not compare a caller's version or provide an atomic concurrent-write guard. A 409 may reject an invalid current state; it is not a guaranteed stale-write check, and a change can still land between the frontend read and mutation. Route stop-sequence editing has the same advisory-only limit.

## Evidence / upload contract (confirmed)

Backend shipped this as **one generic endpoint**, not a per-resource sub-route — the hypothesized `POST /services/:id/evidence` shape does not exist. Confirmed against `docs/backend-context/api/endpoints.md` and `src/modules/attachments/`:

- `POST /evidence` — `multipart/form-data`, **one file per call**. Fields: `file`, `ownerType`, `ownerId`. Returns `{ id, url, filename, contentType, uploadedAt }`.
- `GET /evidence?ownerType=&ownerId=` — every attachment on that resource, oldest-to-newest. Returns a bare array, not a paginated envelope.
- **`ownerType` is a closed set of four**: `SERVICE`, `ZONE_RESULT`, `INSPECTION`, `CONTAINER`. Trees, tree surveys and tree interventions are **not** valid owners — the tree-side evidence rows below stay gaps for that reason, not because the upload path is missing.
- `ownerId` must reference an already-existing resource; 404 otherwise. So evidence is always attached *after* the owner is created, never in the same call.
- **`Idempotency-Key` header is required** (documented as a client-minted UUID, one per upload attempt). The service checks that the header is non-empty; it does not validate UUID format. Sequential reuse for the same owner returns the existing `Attachment`, and a unique DB constraint on (`ownerType`, `ownerId`, `idempotencyKey`) prevents duplicate attachment rows. In a simultaneous-request race, both files may reach R2 before one insert loses the uniqueness race, so the guarantee is record-level idempotency, not an atomic storage transaction. This is the retryable-upload shape ADR-0001 assumes; retry is per-upload, not a general offline queue.
- **Accepted declared types**: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. **Max 10 MB** per file. Backend sniffs the file bytes and rejects a mismatch with the declared MIME type; Multer enforces the size limit.
- Backend returns `{ id, url, filename, contentType, uploadedAt }`. `filename` is the uploaded name sanitized to remove paths/control characters and capped at 120 characters; the object key in storage is a UUID. The original name is therefore not returned verbatim, but the response filename is not a UUID.
- Backend strips Exif, XMP, and comments from JPEG, PNG, and WebP before upload when the container is understood, without re-encoding pixels. An unrecognized image structure is stored untouched. PDFs are accepted and stored without metadata cleanup, and no malware scan is performed. Frontend file-type/size checks remain UX safeguards, not a security boundary. Backend issue #90 is closed as **NOT_PLANNED**, but its comments explicitly leave PDF cleanup and malware scanning unimplemented and defer Tier-2 auditing; see [ADR-0006](docs/adr/0006-frontend-security-controls-are-defense-in-depth-only.md) for the remaining release posture.
- `size` records the bytes stored after metadata cleanup (or the original bytes when no cleanup applies); it is not returned in the response. The 10 MB admission limit is checked against the incoming file before cleanup.
- An exception outcome still carries an **array** of evidence refs, not a single one ("reason + note, photo where feasible" doesn't cap the count — see the `Evidence` term in `CONTEXT.md`). With a one-file-per-call endpoint, that means N sequential uploads, each with its own idempotency key.
- Storage is Cloudflare R2 (S3-compatible, public bucket); `url` is directly renderable.

## Adapter seam (pattern, applies to every resource)

Each resource gets a typed adapter object. Browser-facing adapters call the same-origin BFF Route Handlers; components do not call M6 Backend directly:

- Plain CRUD methods: `list(query)`, `get(id)`, `create(input)`.
- One method per backend action-endpoint, named after the action: `assign`, `start`, `suspend`, `resume`, `cancel`, `reschedule`, etc. — mirroring Backend's `POST /resource/:id/verb` convention.
- Every method parses its response through the resource's Zod schema before returning. A contract violation throws immediately, at the adapter boundary, rather than reaching the UI as untyped or malformed data.
- The BFF reads the session cookie, checks the frontend capability for UI-level access, and attaches the server-held bearer token when forwarding to Backend. The raw token is never read from browser storage.
- **Replacement boundary** (ADR-0003): Backend serves Swagger UI at `/api/docs` and versions a generated [OpenAPI document](https://github.com/hllous/Backend-M6-DAPS2/blob/30d49ea1d56f735a124ae9260cafefff095e07b6/docs/api/openapi.json). The frontend has not adopted a generated client; handwritten Zod schemas remain its runtime boundary and should be reconciled against this published source without weakening validation or changing view-level types unnecessarily.

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

Each action endpoint below notes the frontend Capability associated with it (from [#8](https://github.com/hllous/Frontend-M6-DAPS2/issues/8)). These are not Backend role requirements: the current backend does not apply domain `@Roles()` restrictions, and M1's claims-to-Capability mapping remains unconfirmed.

## Worked example: Service

Drawn directly from [#10](https://github.com/hllous/Frontend-M6-DAPS2/issues/10)'s resolved workflow.

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /services` | `service:schedule` | Create — generic `PLANNED`/`MANUAL` form, or linked-create prefilled from a `TICKET`/`INSPECTION`/`WEATHER_ALERT` reference. `mode` is copied from the `ServiceType`, never chosen directly | confirmed shape, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /services` | — (scoped by actor per #8) | List — paginated and filterable (`status`, `serviceTypeId`, `mode`, `origin`, `crewId`, `vehicleId`, `zoneId`, `ticketId`, `scheduledFrom`, `scheduledTo`). Backend fixes the sort order; it does not expose client-controlled sorting. | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /services/:id` | — (scoped by actor per #8) | Detail, with zones, ZoneResults and CollectionRecords | confirmed |
| `POST /services/:id/assign-crew` | `service:assign` | Attach crew + vehicle to an already-scheduled Service. An overlapping assignment returns 409 unless the request includes a 10–500 character `overrideNote`; an override records who and when | **confirmed** in the pinned OpenAPI and implementation. Frontend warns using a local preflight and sends the override note; it does not call the conflict-query endpoint |
| `GET /services/:id/assignment-conflicts` | `service:assign` | Check crew/vehicle overlap before assigning; without candidate IDs, evaluates the Service's current assignment | **confirmed** in the pinned OpenAPI; current frontend does not use this endpoint |
| `POST /services/:id/start` | Crew Leader of the assigned crew | Only the assigned crew; allowed outside window (flagged, not blocked); 409 without an assigned crew, or without a vehicle if the `ServiceType` requires one | confirmed |
| `POST /services/:id/zone-results` | Crew Leader of the assigned crew | Record one zone's ZoneResult; applies to **both** ROUTE and POINT — a POINT Service still carries exactly one zone in `zoneIds[]` and needs its ZoneResult recorded before it can complete. `reason` required unless `status = SERVICED` | **corrected** — real path/shape differs from the original hypothesis (`zone-results`, not `zones/:zoneId/result`), and there is no POINT-only outcome shortcut; see note below |
| `POST /services/:id/complete` | Crew Leader of the assigned crew | Takes **no request body**. 409 if any of the Service's zones (ROUTE's several, or POINT's one) is missing its ZoneResult. `COMPLETED` if every ZoneResult is `SERVICED`, else `PARTIALLY_COMPLETED` — computed server-side, never chosen by the caller | **corrected** — the original hypothesis split this into a separate POINT-only shape; the real backend uses one uniform action for both modes |
| `POST /services/:id/suspend` | Crew Leader of the assigned crew | `IN_PROGRESS → SUSPENDED`. `reason` required (`StatusChangeDto`) | confirmed |
| `POST /services/:id/resume` | Crew Leader of the assigned crew | `SUSPENDED → IN_PROGRESS`. Field self-resume for transient causes; clears the prior reason | confirmed |
| `POST /services/:id/cancel` | `service:cancel` | `SCHEDULED`, `RESCHEDULED`, or `SUSPENDED` → `CANCELLED`; `reason` is required. Direct cancellation from `IN_PROGRESS` is rejected; suspend or complete it first | **confirmed** in the transition implementation, Swagger description, and endpoint catalogue. Backend issue #114 is closed as **COMPLETED** after the #117 fix; the frontend already supports this transition |
| `POST /services/:id/reschedule` + `POST /services/:id/confirm-reschedule` | `service:reschedule` | `SCHEDULED → RESCHEDULED` with `reason`, then `RESCHEDULED → SCHEDULED` with the new date/window via a second call. Preserves the existing `zoneIds` snapshot verbatim — neither call touches it | confirmed (as two calls, not one) |
| `POST /services/:id/delay-notices` + `GET /services/:id/delay-notices` | — (frontend flow not implemented) | Create a delay notice without changing Service status, then read its newest-first history. The `START`/`DURATION` kind must match the current execution stage; a new notice replaces the active one | **confirmed** in the pinned OpenAPI and implementation. The frontend has no adapter or Route Handler for these endpoints yet |
| `POST /evidence` (`ownerType=SERVICE` / `ZONE_RESULT`) | Crew Leader of the assigned crew | Evidence upload, attached by reference to a Service or ZoneResult outcome | **confirmed** — the generic endpoint covers both owner types; see the Evidence/upload section above. Uploaded as a separate call after the outcome record exists, so a mandatory-evidence exception outcome is two calls, not one |

**Corrections against Backend's implementation (current `develop` snapshot `30d49ea1d56f735a124ae9260cafefff095e07b6`, checked 2026-10-01):** every Service, including POINT, carries a non-empty `zoneIds[]` and needs a ZoneResult for each zone before `POST /services/:id/complete` succeeds; POINT has exactly one zone. Evidence upload uses generic `POST /evidence` and now verifies magic bytes and strips supported image metadata. Cancellation from `RESCHEDULED` is supported by Backend and Frontend; Backend issue #114 records the documentation fix in #117, and earlier frontend claims that the transition was rejected were stale. Delay notices now have `POST` and `GET` endpoints, but the frontend has no adapter for them. See the pinned OpenAPI document for the full DTO shapes.

## Worked example: Zones, Routes and Service Frequencies

Drawn from [#36](https://github.com/hllous/Frontend-M6-DAPS2/issues/36). `Zone` and `Route` are plain catalog CRUD, same alta/baja `status` posture as the other catalogs — codes are immutable after creation. `ServiceFrequency` is the one exception: it has no `active` column at all, closing via `validTo` instead (see the **Validity (ServiceFrequency)** term in `CONTEXT.md`). Capability names (`zone:manage`, `route:manage`, `serviceFrequency:manage`) are a frontend hypothesis, same rationale as the catalogs above.

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /zones` | `zone:manage` | Create — `code`, `name` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /zones` | — (any authenticated actor; used across Route/Service/Container/Tree scoping) | List — paginated, filterable (`active`, `search`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /zones/:id` | — | Detail, with assigned neighborhoods | confirmed |
| `PATCH /zones/:id` | `zone:manage` | Update `name`, `active`. `code` is **immutable after creation** | confirmed immutability rule, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `DELETE /zones/:id` | `zone:manage` | Logical delete. Backend performs **no referential check** — a Zone still listed in an active Route's stops, or still carrying Containers/Trees/GreenSpaces, deactivates without complaint | **gap identified** — frontend adds its own warn-but-allow confirmation (lists what still references the Zone) before submitting; backend itself has no guard, see `zones.service.ts` |
| `POST /zones/:id/neighborhoods` | `zone:manage` | Assign one or more M9 neighborhoods (`neighborhoodIds[]`); duplicates silently ignored | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md) — but the neighborhood **picker itself has no real data source**: M9's neighborhood catalog remains unpublished ([Backend integration blockers](https://github.com/hllous/Backend-M6-DAPS2/blob/develop/docs/bloqueantes.md)). Frontend hypothesizes a separate adapter to M9's catalog (search + id→name resolution), mocked via fixtures, same posture as the M1 identity hypothesis |
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
| `POST /containers/:id/empty` | `container:manage` (standalone only) | `OVERFLOWED → ACTIVE`. A linked `POINT` Service reaches the same transition through `POST /services/:id/complete`, which updates the target Container in the same backend transaction — the frontend must not also call this endpoint after completing that Service | confirmed via `services.service.ts`'s `resolveContainerOutcome`/`containerTransitionData` (`tx.container.update` runs inside the same `$transaction` as the Service's own status write) and Backend's own [ADR-005](https://github.com/hllous/Backend-M6-DAPS2/blob/develop/docs/decisiones/adr-005-alineacion-frontend-sesion-y-seguridad.md); the former "no backend atomicity" gap is resolved |
| `POST /containers/:id/report-damage` | `container:report` | `ACTIVE → DAMAGED`. `damageType`, `severity`, `requiresPublicWorks` (defaults `false`); `true` fires `containerDamaged` → M3 | confirmed route and payload, [endpoints.md](docs/backend-context/api/endpoints.md) and `report-damage.dto.ts` |
| `POST /containers/:id/start-repair` | `container:manage` | `DAMAGED → UNDER_REPAIR`. Office dispatch decision, no request body | confirmed |
| `POST /containers/:id/complete-repair` | `container:manage` (standalone only) | `UNDER_REPAIR → ACTIVE`. A linked repair `POINT` Service reaches the same transition through `POST /services/:id/complete`, atomically, same as `empty` above | confirmed, same source; no longer a standalone-vs-bridged distinction |
| `POST /containers/:id/relocate` | `container:manage` | `ACTIVE → RELOCATING`. Office dispatch decision (the *initiating* half), no request body | confirmed |
| `POST /containers/:id/confirm-relocation` | `container:manage` (standalone only) | `RELOCATING → ACTIVE` with the new `address`/`lat`/`lng` | confirmed, same source. A linked relocation `POINT` Service reaches the same transition through `POST /services/:id/complete`, which takes `containerLocation` in its own body — the new coordinates are supplied on the Service-completion call itself, not a second request |
| `POST /containers/:id/remove` | `container:manage` | `DAMAGED → REMOVED`; terminal state, no further transitions. An `ACTIVE` container must first be reported damaged | **confirmed** in the transition implementation, endpoint catalogue, and controller operation description. Only the Swagger 409 response description still incorrectly names `ACTIVE` as eligible; tracked in [Backend #241](https://github.com/hllous/Backend-M6-DAPS2/issues/241) |
| `POST /evidence` (`ownerType=CONTAINER`) | `container:report` | Evidence (photo/note) on `report-overflow`, `report-damage`, `remove`, and standalone `complete-repair` | **confirmed** — the hypothesized `POST /containers/:id/evidence` doesn't exist; the generic endpoint does, with `CONTAINER` as a valid owner type. Attached to the container, not to the individual transition, so the UI has to keep its own ordering/labelling if it wants to say *which* report a photo belongs to. `start-repair` and `relocate` (the initiating call) stay bare — they're dispatch decisions to act, not records of a finding or a result |
| `POST /green-points` | `greenPoint:manage` | Create — `code`, `name`, `zoneId`, `wasteTypes[]`, `address`/`lat`/`lng` | confirmed route, [endpoints.md](docs/backend-context/api/endpoints.md); capability name is hypothesis |
| `GET /green-points` | — (any authenticated actor) | List — paginated, filterable (`active`, `zoneId`, `wasteType`, `search`) | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md) |
| `GET /green-points/:id` | — | Detail, with accepted waste types | confirmed |
| `PATCH /green-points/:id` | `greenPoint:manage` | Update. `wasteTypes[]` **fully replaces** the accepted set (composite key, not an ordered list — same full-replace posture as Route's stop-sequence `PUT`) | confirmed, `green-points.service.ts` |
| `DELETE /green-points/:id` | `greenPoint:manage` | Logical delete (`active = false`) | confirmed |

**Container-targeted Service completion:** when a linked `POINT` Service closes with `POST /services/:id/complete`, Backend transitions the target Container in the same database transaction — the frontend never fires a second call for `empty`, `complete-repair`, or `confirm-relocation` when the transition was reached through a Service. This only fires when the Service reaches `COMPLETED`; a `PARTIALLY_COMPLETED` Service leaves the Container untouched (verified: `resolveContainerOutcome` returns `null` unless `target === ServiceStatus.COMPLETED`). The three `container:manage` transition endpoints above remain for the standalone case — an Office action taken with no Service scheduled.

**Structural note:** `GreenPoint` has no state machine and no report/transition endpoints of its own — emptying and upkeep are scheduled as ordinary `Service`s (`mode = POINT`, `targetRef` = the Green Point), same as `GreenSpace`. Only `Container` carries real lifecycle state, and its Service-completion path is now confirmed atomic (see above).

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
| — (client-side only) | — | "Request intervention" action on a high-risk survey, pre-filling `interventionType` from `suggestedIntervention` and `treeIds` from the tree | **gap identified** — `TreeSurvey.suggestedIntervention` is a bare enum hint, no FK to any `TreeIntervention` it leads to: the frontend supplies a guided action with no backend-tracked relationship. `justification` on the resulting intervention is pre-filled with a free-text reference to the source survey's date/id so the link survives as a readable trail |
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
| — (client-side only) | — | One guided "Schedule" action bundling `Service` creation and `assign-service` | **gap identified (by design)** — the backend has no combined endpoint; the frontend's single UI action issues `POST /services` (`targetType=TREE`, `targetId` = the first of `treeIds[]`, since a `Service` takes exactly one target) followed by `assign-service` as a second call — a genuine "one crew action, two API calls" bridge, unlike Container's Service-completion path (see Worked example: Containers and Green Points), which Backend now handles atomically. When `treeIds[]` has more than one tree, every tree is still shown on the intervention's and the Service's Related panel |
| — (client-side only) | — | Evidence (photo/note) on survey creation and on `authorize`/`reject` | **gap identified** — the generic `POST /evidence` shipped, but its `ownerType` set is `SERVICE`/`ZONE_RESULT`/`INSPECTION`/`CONTAINER` only: a tree, a survey and an intervention are all invalid owners, so there is no way to attach a photo to any of them. Fully optional here — unlike Service, this workflow has no exception-outcome concept that would make evidence mandatory on some path — so the frontend simply doesn't offer it, rather than routing it somewhere it doesn't belong. Adding `TREE_SURVEY`/`TREE_INTERVENTION` to the enum is the natural fix if the need becomes real |

**Structural note:** `TreeSurvey` has no `serviceId` — unlike `EnvironmentalInspection`, which is Service-linked, a survey can never be tied to a scheduled Service. It's ambient, same shape as Container's `report-overflow`/`report-damage`, not like a Service-driven inspection outcome.

## Worked example: Environmental Reports, Inspections and Violation Notices

Drawn from [Define the Environmental Control case-file workflow](https://github.com/hllous/Frontend-M6-DAPS2/issues/68). `EnvironmentalReport` is the internal eleven-state case file. `EnvironmentalInspection` is executed through a linked POINT `Service`; `ViolationNotice` is an immutable administrative act issued by Office after an inspection finds a violation. Capability names below are frontend mapping hypotheses until M1 publishes the claims contract and M6 confirms its authorization names.

### EnvironmentalReport

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /environmental-reports` | `environmentalReport:create` | Open a report in `RECEIVED`. M2-origin intake carries `ticketId` and `reporterSnapshot`; an own-initiative detection carries operational location and report details. | confirmed route and initial state, [endpoints.md](docs/backend-context/api/endpoints.md); exact create DTO constraints are not fully exposed in the mirror |
| `GET /environmental-reports` | `environmentalReport:view` | Paginated list, filterable by `status`, `reportType`, `priority`, `ticketId`, and `search`. Office sees the case queue; Field receives only assigned operational context. | confirmed filters, [endpoints.md](docs/backend-context/api/endpoints.md); actor scoping is a frontend/backend authorization hypothesis |
| `GET /environmental-reports/:id` | `environmentalReport:view` | Tier 2 case-file detail: `id`, `reportType`, `address`/`lat`/`lng`, `description`, `ticketId`, `status`, `priority`, `deadlineAt`, `createdAt`, and `updatedAt`. `lat`/`lng` are `number \| null`: ticket-originated reports can have no coordinates, so the UI must treat `address` as the only guaranteed location signal. List and detail expose `description`, `escalated`, and `citizenResponse`; the latter two are M2-owned integration data, not frontend mutations. Operator-entered `description` is optional, capped at 2000 characters, may contain personal data, and is excluded from portal responses and events. `reporterSnapshot` is stored but not exposed. | REST shape checked against Backend `30d49ea1d56f735a124ae9260cafefff095e07b6`; `lat`/`lng` nullability confirmed via [issue #191](https://github.com/hllous/Frontend-M6-DAPS2/issues/191) (M2 v1.6 / Backend #128); frontend relationship schemas still need reconciliation with published OpenAPI |
| `POST /environmental-reports/:id/start-review` | `environmentalReport:review` | `RECEIVED -> UNDER_REVIEW`. Explicit Office action. | confirmed route and transition; capability name is hypothesis |
| `POST /environmental-reports/:id/forward` | `environmentalReport:review` | `UNDER_REVIEW -> FORWARDED`; if `ticketId` exists, the M2 projection is `RETURNED`, not `REJECTED`. | confirmed route and transition |
| `POST /environmental-reports/:id/dismiss` | `environmentalReport:review` | `UNDER_REVIEW -> DISMISSED`; if `ticketId` exists, the M2 projection is `REJECTED`. | confirmed route and transition |
| `POST /environmental-reports/:id/close` | `environmentalReport:close` | Manual close for terminal workflow paths such as `FORWARDED`, `DISMISSED`, `NO_VIOLATION`, or `SANCTIONED`. | confirmed route; exact close preconditions and request body are not documented in the mirror |
| - (system-driven) | - | `NOTICE_ISSUED -> CLOSED` after `deadlineAt` and `SANCTION_DEADLINE_DAYS`. No frontend CTA or mutation is exposed. | confirmed design; automatic transition has no endpoint |

The frontend preserves all eleven backend statuses and groups them only for presentation. For an existing report, `ESCALATION_CHANGED`, `INFORMATION_PROVIDED`, and `PRIORITY_CHANGED` are accepted even when the report is `CLOSED`; they update the corresponding data without changing lifecycle state. `REOPENED` changes `CLOSED` back to `UNDER_REVIEW` after a fresh read. `SANCTIONED` is terminal and never reopens. Priority is immutable through REST; M2 is the source of late priority changes. `updatedAt` provides row-level freshness only: do not promise `updatedBy`, field-level audit history, or a client-side audit log. This follows [Backend issue #104](https://github.com/hllous/Backend-M6-DAPS2/issues/104) and the current mirrored backend contract.

### EnvironmentalInspection and ViolationNotice

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /environmental-reports/:reportId/inspections` | `environmentalInspection:schedule` | Schedule one inspection and move the report to `INSPECTION_SCHEDULED`. The guided frontend flow then creates/assigns its linked POINT `Service`; the backend does not expose one atomic schedule-and-assign operation. The checklist is versioned at scheduling time. | confirmed route and Service relationship, [endpoints.md](docs/backend-context/api/endpoints.md); exact schedule DTO is a gap |
| `GET /environmental-reports/:reportId/inspections` | `environmentalInspection:view` | List the report's inspections, including historical inspections kept when a reinspection is created. | confirmed route; pagination and exact list shape follow the standard unless Swagger says otherwise |
| `GET /environmental-inspections/:id` | `environmentalInspection:view` | Detail with linked `reportId`, `serviceId`, `inspectedAt`, checklist snapshot, findings, outcome, and next step. `inspectorId` is internal Tier 2 data. | confirmed route and entity fields; exact checklist response nesting is a gap |
| `POST /environmental-inspections/:id/complete` | `environmentalInspection:execute` | Crew Leader submits the assigned inspection result. `NO_VIOLATION` requires a complete checklist and conclusion; `VIOLATION_FOUND` requires findings, `violationType`, `severity`, `suggestedAction`, and evidence; `INCONCLUSIVE` requires an explanation and evidence. | confirmed workflow and outcome semantics from the decision; exact complete DTO is not fully documented |
| `POST /environmental-inspections/:id/violation-notice` | `violationNotice:issue` | Office issues a notice only for `VIOLATION_FOUND`. Request carries `establishmentId`, `violationType`, `severity`, and non-binding `suggestedAction`; `noticeNumber`, `issuedAt`, `priorNoticeCount`, and the immutable record are server-owned. | confirmed route, precondition, immutability, and establishment rule; exact DTO ownership is a response/request-shape gap |
| `GET /environmental-inspections/:id/violation-notice` | `violationNotice:view` | Read the single notice emitted for the inspection. A second notice for the same inspection returns 409. | confirmed route and uniqueness rule |
| `POST /evidence` (`ownerType=INSPECTION`) | `environmentalInspection:execute` | Upload one independently retryable file after the inspection exists. Evidence is attached to the inspection, not to a checklist item, `ViolationNotice`, or `VIOLATION_NOTICE` owner. | confirmed; generic upload contract above |
| - (event-driven read model) | `sanctionOutcome:view` | Display read-only `SanctionOutcome` (`violationNoticeId`, `decision`, `decidedAt`, `externalRef`, optional `dismissalReason`) from M4 outcomes. M6 never creates or edits it. | confirmed entity boundary; no frontend-facing REST endpoint is listed |

`checklist[]`, `findings`, and `inspectorId` remain internal to M6 and are not forwarded to M2. A `VIOLATION_FOUND` report without an `establishmentId` may record a **Non-forwarded notice**, explicitly show that M4 was not contacted, and close locally. Correcting a notice means a new inspection and new notice; no PATCH or DELETE exists. Before issuing a notice, the frontend uploads inspection evidence; M4 receives those attachments in `environmentalViolationDetected.evidence[]` as `{ url, mimeType }`. The attachments are not owned by `ViolationNotice`.

## Worked example: Repair Requests and Street Closure Requests

Drawn from [Define the outbound infrastructure referral workflows](https://github.com/hllous/Frontend-M6-DAPS2/issues/66) and [ADR-0007: Explicit external referrals and Office reconciliation](docs/adr/0007-explicit-external-referrals-and-office-reconciliation.md). These resources are M6's durable referral records, not transports to M3/M7. Source context is canonical and navigable; it is not copied as a second authoritative record.

### RepairRequest -> M3

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /repair-requests` | `repairRequest:create` | Office creates a referral, and Field may create one from assigned work, using a `Service` or `EnvironmentalInspection` source with `damageType`, `address`, `severity`, explicit `publicSafetyRisk`, and the polymorphic source (`detectedInType=SERVICE\|INSPECTION`, `detectedInId`). The `containerDamaged` path remains separate. | confirmed route and domain fields, [endpoints.md](docs/backend-context/api/endpoints.md), [derivaciones.md](docs/backend-context/entidades/derivaciones.md); exact source DTO names are a gap |
| `GET /repair-requests` | `repairRequest:view` | Paginated list, filterable by `status`, `damageType`, `severity`, and `detectedInId`. | confirmed filters; capability/scoping is hypothesis |
| `GET /repair-requests/:id` | `repairRequest:view` | Detail with source context and `workOrderId` when M3 has supplied it. | confirmed route and purpose |
| `POST /repair-requests/:id/start` | `repairRequest:reconcile` | Move `REQUESTED -> IN_PROGRESS`. Normally read-only event reconciliation from `workOrderScheduled`; Office may invoke this endpoint only as a reviewed manual recovery action with the applicable M3 reference. | confirmed route/transition; exact recovery DTO is a gap |
| `POST /repair-requests/:id/close` | `repairRequest:reconcile` | Move `IN_PROGRESS -> CLOSED`. Normally read-only event reconciliation from `workOrderCompleted`; Office may invoke it only after external confirmation. | confirmed route/transition; exact recovery DTO is a gap |

`publicSafetyRisk` is independent of `severity` and is required by the M3-facing contract. The frontend never derives it. A failed create with no record is an unsent referral; a created record with no external response remains pending and may become stale. M3 correlation requires its response to return our request id as `sourceRequestId`; otherwise the referral remains an integration exception rather than being matched by address.

### StreetClosureRequest -> M7

| Endpoint | Capability | Purpose | Status |
|---|---|---|---|
| `POST /street-closure-requests` | `streetClosureRequest:create` | Office creates a referral from a `Service` or authorized `TreeIntervention` with `reason`, `sourceType=SERVICE\|TREE_INTERVENTION`, `sourceId`, `closureType`, requested window, and at least one structured `affectedSections[]` item (`streetName`, `fromCross`, `toCross`). The outgoing integration record carries `sourceModule = M6`. | confirmed route, source boundary, and non-empty-section rule, [endpoints.md](docs/backend-context/api/endpoints.md); exact wire names for the section collection are a gap |
| `GET /street-closure-requests` | `streetClosureRequest:view` | Paginated list, filterable by `status` and `sourceId`. | confirmed filters; capability/scoping is hypothesis |
| `GET /street-closure-requests/:id` | `streetClosureRequest:view` | Detail with source context, requested window, sections, and `closureId` when M7 has supplied it. | confirmed route and purpose |
| `POST /street-closure-requests/:id/approve` | `streetClosureRequest:reconcile` | Move `REQUESTED -> APPROVED`, recording M7's `closureId`. Normally read-only event reconciliation; Office can use it only as reviewed manual recovery. | confirmed route/transition; exact recovery DTO is a gap |
| `POST /street-closure-requests/:id/reject` | `streetClosureRequest:reconcile` | Move `REQUESTED -> REJECTED`. Rejection requires an Office decision to reschedule or cancel the dependent work; the endpoint does not itself choose that outcome. | confirmed route/transition; exact reason/DTO is a gap |
| `POST /street-closure-requests/:id/end` | `streetClosureRequest:reconcile` | Move `APPROVED -> ENDED`, releasing the dependency on the linked Service. | confirmed route/transition; exact recovery DTO is a gap |

A pending closure blocks the entire linked Service, including partial ROUTE execution. Late, out-of-order, duplicate, or uncorrelated M7 responses never reopen or overwrite a Service. M7 responses must correlate with `closureRequestId` and `requestingModule`; a missing correlation remains visible for Office reconciliation.

## Worked example: Indicators

Drawn from [Prototype the operational indicator dashboards](https://github.com/hllous/Frontend-M6-DAPS2/issues/65) and [Set measurable performance, observability, and release gates](https://github.com/hllous/Frontend-M6-DAPS2/issues/64). Indicators are read-only dashboard data. The approved UI keeps all four families visible in the summary band, uses a global `Actualizado` marker, exposes exact data through chart detail plus a secondary table action, and moves to task-focused tabs below 760px.

| Endpoint | Capability | Query | Confirmed result semantics | Status |
|---|---|---|---|---|
| `GET /indicators/coverage` | `indicator:view` | `from`, `to`; optional `zoneId`, `serviceTypeId` | Attended objectives over scheduled objectives, broken down by zone and service type. The unit is the `(service, zone)` pair; `CANCELLED` Services are excluded from non-compliance. | confirmed route, filters, and semantics; exact response property names are a gap |
| `GET /indicators/compliance` | `indicator:view` | `from`, `to`; optional `zoneId`, `serviceTypeId` | On-time versus delayed completion and ranking of unattended zones with reasons. On-time uses the last `ZoneResult.recordedAt` against `Service.scheduledDate`. | confirmed route, filters, and semantics; exact response schema is a gap |
| `GET /indicators/incidents` | `indicator:view` | `from`, `to` | Container overflow/damage by zone, tree risk by level, and reports by type/status with mean resolution time. Inventory/tree values are current snapshots; only reports are period-filtered. | confirmed route and semantics; exact response schema is a gap |
| `GET /indicators/waste` | `indicator:view` | `from`, `to` | Kilograms and cubic meters by waste type and destination, plus percentage diverted from landfill. | confirmed route and semantics; exact response schema is a gap |

`from` and `to` default to the last 30 days when omitted. The frontend owns `IndicatorQuery` and one adapter method per family (`getCoverage`, `getCompliance`, `getIncidents`, `getWaste`), validates each response with Zod, and keeps the accessible data-table schema independent from chart rendering. The read-only mirror does not include complete DTO schemas, but the pinned OpenAPI document publishes them. Reconcile the frontend's nested series, ranking, target, freshness, and empty-result schemas against that source; until then those frontend shapes remain unverified, not unpublished Backend contracts.

## Remaining contract gaps for these resources

| Area | Gap and frontend posture |
|---|---|
| EnvironmentalReport | REST has no priority mutation and no `updatedBy`/field-level audit history. Accept the reconciled M2 late-update rules above; do not expose post-creation priority editing or automatic reopening without a fresh report read. |
| EnvironmentalInspection / ViolationNotice | Exact schedule, completion, notice request, checklist, relationship-expansion, and response DTO shapes are absent from the read-only endpoint summary but published in the pinned OpenAPI document. Reconcile the frontend Zod schemas and fixtures against that source; keep only unreconciled frontend fields marked as hypotheses. |
| M4 establishment lookup | `establishmentId` is mandatory to forward a notice, but the M4 search contract is unpublished. Keep notice issuance gated by a typed replaceable establishment-directory adapter. |
| M3/M7 referrals | `sourceRequestId`/`closureRequestId` correlation and external event timing remain integration dependencies. Manual endpoints are recovery tools, never evidence that M6 made the external decision. |
| M3/M7 referral staleness | **Frontend hypothesis:** a non-terminal RepairRequest (`REQUESTED`/`IN_PROGRESS`) or StreetClosureRequest (`REQUESTED`/`APPROVED`) is shown as stale after 72 hours since `updatedAt` (falling back to `createdAt`). This is an operational warning only; it creates no status and triggers no retry or transition. The window is a tunable placeholder until M3/M7 publish expected-response timing. |
| Indicators | Endpoint/filter/semantic contracts and response schemas are published in the pinned OpenAPI document; the current frontend schemas still need reconciliation. Keep unverified frontend fields explicit, and normalize through the Zod-validated indicator adapter and fixtures rather than hand-coding chart assumptions into components. |
| Evidence to M2 | M6 upload and the M4 `{ url, mimeType }` projection are confirmed. M2 remains explicitly pending: its event still expects `{ attachmentId, fileName, contentType, url, sizeBytes }`, and the visible-to-citizen attachment policy is unresolved. |

## Frontend implementation and acceptance requirements

The main adapters and Office/Field workflows described here are implemented in `src/lib/`, `src/app/api/`, and `src/app/app/`. The rules below are the integration contract and regression criteria for those workflows; keep them aligned with Backend and the corresponding tests under `src/` and `e2e/`.

### Service workflow

- The current frontend shows Office a cancellation action for `SCHEDULED`, `RESCHEDULED`, and `SUSPENDED`; Backend accepts the same transitions.
- Cancellation requires a non-empty reason and submits it in the backend request body.
- `RESCHEDULED → CANCELLED` is supported directly without confirming a replacement date. Backend issue #114 is **COMPLETED**; earlier frontend documentation claims of a mismatch were stale. Backend's internal cancellation JSDoc still omits `RESCHEDULED`, tracked in [Backend #241](https://github.com/hllous/Backend-M6-DAPS2/issues/241); the transition and API operation description are correct.
- Direct `IN_PROGRESS → CANCELLED` is rejected; suspension is required first.

### EnvironmentalReport workflow

- After a fresh read, `CLOSED` is potentially reopenable. `REOPENED` renders as active case work (`UNDER_REVIEW`) again.
- Late `ESCALATION_CHANGED`, `INFORMATION_PROVIDED`, and `PRIORITY_CHANGED` data is displayed, including on a `CLOSED` report, without inventing a new frontend mutation or changing lifecycle state.
- `SANCTIONED` remains terminal. No priority editor, `updatedBy` field, or field-level audit-history UI is added.

### Evidence workflow

- Drafts and upload-progress rows retain the user-selected filename locally. After success, display Backend's sanitized `filename` from the response; the storage object key is a UUID, but the response name is not.
- The browser checks selected file types and size before upload. Backend additionally validates magic bytes against the declared type and strips Exif/XMP/comments from JPEG, PNG, and WebP when their structure is understood. PDFs pass unchanged, unexpected image structures are stored unchanged, and malware scanning is not implemented. Frontend checks remain defense in depth.
- Inspection evidence is uploaded before issuing a violation notice. Each upload attempt has one idempotency key, and retrying that attempt reuses the same key. Failed uploads retain their local draft.
- Evidence owners are limited to `SERVICE`, `ZONE_RESULT`, `INSPECTION`, and `CONTAINER`; the frontend never creates a `VIOLATION_NOTICE` evidence owner.

### Required contract and workflow coverage

The shared fixtures/handlers and adapter tests cover or should preserve:

- cancellation from `SCHEDULED`, `RESCHEDULED`, and `SUSPENDED`, including reason preservation;
- rejection of direct cancellation from `IN_PROGRESS`;
- reopening a `CLOSED` report from `REOPENED`, accepting late non-state-changing M2 updates, and keeping `SANCTIONED` closed;
- local filenames for draft/progress rows and Backend-returned sanitized filenames after success;
- client-side type/size UX checks and the Backend's authoritative magic-byte/image metadata handling, while preserving the PDF, parser-fallback, and malware-scan exclusions from issue #90;
- retrying one evidence upload with the same idempotency key and preserving the draft through upload/network failures;
- inspection evidence appearing in the M4 event contract as `{ url, mimeType }`, with no `VIOLATION_NOTICE` owner.

## Release dependencies

Backend issue #90 is closed as **NOT_PLANNED**, not as a declaration that all requested controls shipped. Its comments and the pinned implementation give these distinct statuses:

- **Implemented:** actual file type is checked against magic bytes; the 10 MB cap is enforced; Exif, XMP, and comments are stripped from understood JPEG, PNG, and WebP files.
- **Not implemented:** PDF metadata cleanup (PDFs are accepted unchanged), cleanup for image structures the parser does not understand (those bytes are stored unchanged), and malware scanning (no external service is contracted). Since the frontend also accepts PDFs, decide whether these exclusions are acceptable before production sign-off; client-side file filtering alone cannot make this authoritative.
- **Deferred:** Backend explicitly left Tier-2 read/write auditing outside the current TPO delivery. No audit trail is available, so the frontend must not promise who viewed a record or expose audit history. Reconfirm the requirement under the security/release decisions before general availability.
- **Not applicable to current endpoints:** there is no bulk/file export endpoint. Aggregate indicators are read APIs, not record exports. Backend's comment sets explicit field projection as the future export pattern; do not treat an absent export route as an implemented export allowlist.

Backend issue #114 is closed as **COMPLETED**: the transition, endpoint summary, Swagger description, and frontend all support `RESCHEDULED → CANCELLED` with a required reason; direct cancellation from `IN_PROGRESS` remains rejected. No cancellation contract mismatch remains in the current source.

## Backend API outside the frontend contract surface

These resources exist in Backend and are mirrored in [`docs/backend-context/api/endpoints.md`](docs/backend-context/api/endpoints.md), but the current internal frontend does not consume them.

| Tag | What it covers | Worth knowing before the ticket opens |
|---|---|---|
| `citizen-portal` | `/public/reports/:ticketId`, `/public/services`, `/public/green-points`, `/public/zones` | The **only** unauthenticated endpoints in the module. Every response is an explicit projection; `/public/reports/:ticketId` returns 404 whether or not the ticket exists, and collapses the 11 case-file states into seven citizen-facing stages |
| `events` | Inbound event ingestion | Backend-to-backend, not a frontend surface |
