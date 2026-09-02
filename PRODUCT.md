# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Office** actors plan, schedule, assign, monitor, and administer Environment, Hygiene and Urban Services operations through information-dense desktop workflows.
- **Field** actors execute assigned Services from focused mobile and tablet workflows. Crew Leaders can perform state-changing actions; Crew Members have read-only access to their Crew's assigned Service.

Office and Field are mutually exclusive actor kinds. Visible actions are gated by Capabilities rather than hardcoded actor-name checks.

## Product Purpose

Provide one internal application for planning, assigning, monitoring, and field-executing municipal Environment, Hygiene and Urban Services operations. Success means Office and Field can carry a Service from scheduling through completion without losing operational context, geographic context, evidence, or responsibility boundaries.

## Positioning

M6 joins office planning and field execution around the same capability-gated Service lifecycle, treating location as a primary operational dimension while keeping map interactions synchronized with accessible table or list alternatives.

## Operating Context

- Office works with dense operational views across Services, zones, Crews, vehicles, inventories, environmental cases, and related records.
- Field works on assigned Services under variable connectivity and may need to preserve local drafts for explicit manual resubmission.
- A Service is either a ROUTE across zones or a POINT at one inventory item or location.
- Map-first exploration must preserve equivalent access through synchronized tables or lists.
- Desktop may prioritize density; mobile and tablet workflows must stay focused on the current field job.

## Capabilities and Constraints

- The frontend is online-first. It protects work through resilient drafts, retryable uploads, visible synchronization state, and explicit loss prevention; it does not assume full offline synchronization.
- Backend endpoints are not published yet. The frontend uses contract hypotheses, Zod schemas, fixtures, Mock Service Worker, and replaceable typed adapters until Backend/OpenAPI becomes authoritative.
- M1 owns users and organizations and issues the JWT. M6 must not create competing identity or Organization concepts.
- The browser talks only to the Next.js BFF; the M1 JWT does not reach browser JavaScript. M6 Backend remains the sole authorization authority.
- Frontend Capabilities are optimistic and UI-only. Every privileged operation must still be authorized by M6 Backend.
- WCAG 2.2 AA is required, including keyboard and screen-reader access to map-backed workflows.
- This Wayfinder effort produces planning decisions and throwaway prototypes, not production application code.

## Brand Commitments

The user has pinned a palette and typeface as binding (not open to the direction roll):

- **Navy** `#0F2C59` (light `#163D75`) as the primary institutional color — dark surfaces, headings, primary buttons, navbar.
- **Coral** `#D63031` (light `#E74C3C`) as the accent only — CTAs, alerts, urgent/destructive emphasis. Never a second base color.
- Ground `#FAFAFA`, card surface `#FFFFFF` with a `border-neutral-200` border, text `#1A1A1A` primary / `#525252` secondary.
- Typeface: Inter (400/500/600/700/800), `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` fallback.

A first batch of component references (dashboards, sidebars, breadcrumbs, steppers, status badges, alerts, loaders, charts — mostly sourced from 21st.dev) is catalogued with borrow/avoid notes and a mapping to M6 concepts at `docs/design/inspiration/README.md`. These are inspiration to recompose, not components to copy verbatim. Icon library is still undecided; several candidate sources are named in that catalog.

## Evidence on Hand

- Canonical frontend vocabulary: `CONTEXT.md`.
- Decision records: `docs/adr/`.
- Frontend-facing backend domain mirror: `docs/backend-context/`.
- Contract hypotheses: `CONTRACTS.md`.
- UI inspiration catalog (palette, type, component references): `docs/design/inspiration/README.md`.
- No approved visual identity, production UI, or validated component system exists yet — the palette/type above are pinned, but DESIGN.md itself is not yet written.

## Product Principles

1. Keep Office planning and Field execution joined by the same Service lifecycle without blurring their capability boundaries.
2. Make location operationally primary while preserving a synchronized, accessible non-map path.
3. Prefer explicit state, responsibility, synchronization, and conflict handling over hidden automation.
4. Preserve user work under unreliable connectivity without claiming unsupported offline behavior.
5. Treat frontend contracts as replaceable hypotheses until authoritative Backend contracts are published.

## Accessibility & Inclusion

The product must meet WCAG 2.2 AA. Every map-first workflow requires a synchronized table or list alternative, complete keyboard operation, usable focus management, and screen-reader-readable status and selection feedback.
