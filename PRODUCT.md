# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Office personnel supervise, schedule, assign, authorize, and audit municipal operations from information-dense desktop workflows.
- Field personnel execute assigned work from focused mobile and tablet workflows, often outdoors and under variable connectivity.

## Product Purpose

M6 supports the Municipality's internal Environment, Hygiene, and Urban Services operation. It brings service planning, field execution, territorial context, urban inventory, and environmental control into one capability-gated application.

## Positioning

The application joins operational records to their territorial context: map-first workflows always retain a synchronized, accessible table or list alternative.

## Operating Context

The product is online-first. Field work must preserve drafts, expose synchronization state, and make retries explicit without pretending that unsupported offline synchronization exists. Office workflows favor scanability and density; field workflows favor a clear current task and safe evidence capture.

## Capabilities and Constraints

- M1 owns users, organizations, and JWT issuance; M6 must not introduce competing identity concepts.
- Backend endpoints are not yet complete. Frontend contracts remain explicit hypotheses behind typed, replaceable adapters until OpenAPI becomes authoritative.
- Product terminology follows `CONTEXT.md` and `docs/backend-context/`.
- The application information architecture and core Service workflow are recorded in the Wayfinder map and its linked decisions.
- Spanish is the product language.

## Evidence on Hand

- Validated map/table workspace prototype: `prototype/map-table-workspace`.
- Validated complex operational-form prototype: `prototype/complex-operational-form`.
- Civic operations and accessibility research: `docs/011-research-geospatial-platform` and `docs/013-research-civic-visual-accessibility`.
- No production brand assets or approved municipal seal are present; future design work must not fabricate them.

## Product Principles

- Preserve operational truth and make system freshness visible.
- Keep location and its accessible non-map equivalent synchronized.
- Give every screen one obvious primary action.
- Let desktop be dense while keeping field interactions focused.
- Prevent data loss and make recovery paths explicit.

## Accessibility & Inclusion

WCAG 2.2 AA is the minimum. Keyboard access, visible focus, readable text, sufficient contrast, and status cues that do not depend on color are required.
