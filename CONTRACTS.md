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
| `POST /services` | `service:schedule` | Create — generic `PLANNED`/`MANUAL` form, or linked-create prefilled from a `TICKET`/`INSPECTION`/`WEATHER_ALERT` reference | hypothesis |
| `GET /services` | — (scoped by actor per #8) | List — paginated, filterable (status, crewId, vehicleId, dateRange, mode), sortable | hypothesis |
| `GET /services/:id` | — (scoped by actor per #8) | Detail | hypothesis |
| `POST /services/:id/assign` | `service:assign` | Attach crew + vehicle to an already-scheduled Service; accepts `overrideNote` when double-booked | hypothesis |
| `POST /services/:id/start` | Crew Leader of the assigned crew | Only the assigned crew; allowed outside window (flagged, not blocked) | hypothesis |
| `POST /services/:id/zones/:zoneId/result` | Crew Leader of the assigned crew | ROUTE mode only — record one zone's outcome; any order | hypothesis |
| `POST /services/:id/complete` | Crew Leader of the assigned crew | POINT mode only — single outcome on the Service record itself (status/reason/notes/evidence) | hypothesis |
| `POST /services/:id/suspend` | Crew Leader of the assigned crew | Reuses `NotServicedReason`; evidence required | hypothesis |
| `POST /services/:id/resume` | Crew Leader of the assigned crew | Field self-resume for transient causes | hypothesis |
| `POST /services/:id/cancel` | `service:cancel` | Office-only; only reachable from `SUSPENDED` | hypothesis |
| `POST /services/:id/reschedule` | `service:reschedule` | Office-only; preserves the existing `zoneIds` snapshot verbatim | hypothesis |
| `POST /services/:id/delayed-notice` | Crew Leader of the assigned crew | Field-raised badge (note + revised ETA); not a status change | hypothesis |
| `POST /services/:id/evidence` | Crew Leader of the assigned crew | Upload one evidence file, returns a reference | hypothesis |

The ROUTE-mode completion rollup (all zones `SERVICED` → `COMPLETED`, any other mix → `PARTIALLY_COMPLETED`) is computed server-side and reflected in the Service's status after each zone-result call — the frontend never computes it locally.

Other resources (containers, trees, green spaces, environmental reports/inspections, crews, vehicles) follow the same pattern above but aren't drafted here — each gets its contract detail when its own domain-area ticket graduates from the map's fog.
