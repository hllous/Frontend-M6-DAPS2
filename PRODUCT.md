# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Office personnel supervise, schedule, assign, authorize, and audit municipal operations from information-dense desktop workflows.
- Field personnel execute assigned work from focused mobile and tablet workflows, often outdoors and under variable connectivity.

## Product Purpose

M6 supports the Municipality's internal Environment, Hygiene, and Urban Services operation. The frontend brings service planning, field execution, territorial context, urban inventory, and environmental control into one application for Office and Field personnel.

## Positioning

The application joins operational records to their territorial context: map-first workflows always retain a synchronized, accessible table or list alternative.

## Operating Context

The product is online-first. Field forms preserve local drafts and make manual retry explicit; they do not silently synchronize an offline queue. Office workflows favor scanability and density; field workflows favor a clear current task and safe evidence capture.

## Capabilities and Constraints

- M1 owns users, organizations, and JWT issuance; M6 must not introduce competing identity concepts.
- Backend's seven implementation phases are complete. The current API snapshot is `Backend-M6-DAPS2` `develop` commit `30d49ea1d56f735a124ae9260cafefff095e07b6` (checked 2026-10-01): 134 OpenAPI operations in 23 Swagger tags. `CONTRACTS.md` distinguishes confirmed backend behavior from frontend reconciliation work and external hypotheses.
- The frontend has implemented the main Office and Field workflows, typed adapters, Zod validation, and a same-origin Next.js BFF. Local scenarios use mock mode; backend integration uses a server-side development JWT. Real M1 authentication is not available until M1 publishes a verifiable token contract.
- Backend authenticates protected requests but currently applies no role restrictions to domain endpoints. Frontend capability checks shape the UI and are not an authorization boundary. Backend now checks evidence magic bytes, enforces a 10 MB limit, and removes metadata from understood JPEG/PNG/WebP files; PDF cleanup and malware scanning are absent, Tier-2 auditing was deferred outside the current TPO delivery, and there is no export endpoint. Backend issue #90 closed as `NOT_PLANNED`; its closure does not mean these exclusions were implemented. See [ADR-0006](docs/adr/0006-frontend-security-controls-are-defense-in-depth-only.md) for the separate release decisions.
- Product terminology follows `CONTEXT.md` and `docs/backend-context/`.
- The application information architecture and core Service workflow are recorded in the Wayfinder map and its linked decisions.
- Spanish is the product language.

## Evidence on Hand

- The current user-facing implementation lives under `src/app/app/`, with BFF handlers under `src/app/api/` and typed adapters under `src/lib/`.
- Browser journeys and accessibility checks are maintained in `e2e/`; their presence documents coverage, not a test run for this documentation update.
- The throwaway visual explorations that led to the design standard are archived in git under the tag `archive/visual-system-prototypes`; only `src/app/prototype/shell-examples/` remains, as the shell's stable review surface. The approved visual and interaction rules are in `DESIGN.md`; examples are indexed in `docs/design/examples/`.
- The Wayfinder issue map records the original product decisions. Current domain vocabulary and durable technical decisions live in `CONTEXT.md` and `docs/adr/`.
- No approved municipal seal or production brand asset is maintained in this repository; future design work must not fabricate one.
- Implementation status and the remaining release gates are recorded in `ROADMAP.md`.

## Product Principles

- Preserve operational truth and make system freshness visible.
- Keep location and its accessible non-map equivalent synchronized.
- Give every screen one obvious primary action.
- Let desktop be dense while keeping field interactions focused.
- Prevent data loss and make recovery paths explicit.

## Accessibility & Inclusion

WCAG 2.2 AA is the minimum. Keyboard access, visible focus, readable text, sufficient contrast, and status cues that do not depend on color are required.
