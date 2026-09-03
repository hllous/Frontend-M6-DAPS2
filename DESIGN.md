# M6 Design System

> Status: decision record for “Decide the visual system and DESIGN.md standard.” Every decision in that scope has been resolved through a prototype comparison and explicit approval; only approved choices are normative. Later changes belong to their own issue and decision-log entry.

## Decision log

- **2026-09-03 — Palette:** **A · Azul institucional** was approved. It carries civic identity, navigation, and primary-action hierarchy; coral is reserved for exceptional emphasis.
- **2026-09-03 — Typeface (superseded):** **C · Inter** was initially approved after comparison with Source Sans 3, IBM Plex Sans, Public Sans, Archivo, Atkinson Hyperlegible Next, and Barlow. It was later superseded by the focused Archivo decision below.
- **2026-09-03 — Type scale and density:** **B · Adaptativa equilibrada** was approved. Office uses compact data presentation without shrinking general reading text; Field uses larger touch controls. **C · Cómoda universal** was explicitly rejected as too spacious.
- **2026-09-03 — Radius and elevation:** The revised **C · Suave sin sombras** was approved. Controls use 12 px radii, panels and overlays use 16 px radii, and content surfaces rely on borders instead of shadows.
- **2026-09-03 — Desktop navigation:** The revised **A · Sidebar plegable** was approved. It opens as a 220 px labeled sidebar and can be collapsed by the user into a 72 px icon rail.
- **2026-09-03 — Mobile navigation:** **C · Tareas + Más** was approved. The bottom bar keeps Inicio, Servicios, and Mapa visible, while secondary and future modules live under Más.
- **2026-09-03 — Operational statuses:** **A · Etiqueta semántica** was approved. Statuses use a soft semantic fill, a distinct icon, and a visible Spanish label; color never carries meaning alone.
- **2026-09-03 — Route map markers:** The revised **A · Pin numerado** was approved. Route stops use numbered location pins; selecting one opens an anchored information card and synchronizes the corresponding list row.
- **2026-09-03 — Mobile map/list workspace:** **B · Mapa + bandeja** was approved. The map remains visible while the synchronized service list occupies a resizable bottom sheet.
- **2026-09-03 — Basemap emphasis:** **B · Ambiental contextual** was approved. The operational map keeps visible green-space and land-use context beneath the primary service layer.
- **2026-09-03 — Marker clustering:** **A · Agrupar y acercar** was approved. Broad zooms use count clusters; activating a cluster changes zoom to reveal the approved numbered pins.
- **2026-09-03 — Operational charts:** **A · Barras directas** was approved as the default for rapid categorical comparison, paired with **C · Tabla visual** as the detailed accessible data view. Grouped columns are reserved for comparisons between two meaningful series.
- **2026-09-03 — Full spacing scale:** **B · Ritmo operativo fino** was approved. It preserves the established 10 px table-cell and 14 px panel spacing while providing disciplined fine-grained component steps and larger layout intervals.
- **2026-09-03 — Typography reconsideration:** **A · Archivo** was approved after a focused, browser-verified comparison with IBM Plex Sans and Atkinson Hyperlegible Next. Archivo supersedes Inter as the production family because it gives M6 a locally resonant civic voice while preserving operational readability and density.
- **2026-09-03 — Component anatomy and interaction states:** **A · Campos explícitos** was approved. Fields keep their label, control, helper or error text together, with a stable action hierarchy and explicit feedback states. **B · Filas operativas** was explicitly rejected.
- **2026-09-03 — Motion and reduced motion:** **B · Continuidad espacial** was approved. Visible, eased travel explains the relationship between a selected service and its detail surface. **C · Casi instantánea** was explicitly rejected; A remains an acceptable restrained reference but is not normative.
- **2026-09-03 — Accessibility target:** **WCAG 2.2 Level AA** was adopted as the conformance target after a scope review found accessibility rules present but scattered and no stated level. The approved palette was then measured against it. Measurement found `#CBD5DF` at 1.49:1 on Surface, below the 3:1 non-text threshold; because the approved *Suave sin sombras* geometry relies on borders instead of shadows, `--color-border-strong` `#70849A` was added for the boundaries of interactive controls. A second pass with the full-strength design detector found `--color-text-secondary` on the institutional navy at 2.06:1, a combination the first measurement had missed; `--color-on-institutional` and `--color-on-institutional-secondary` were added for dark institutional surfaces. Recorded from measurement and scope review rather than a prototype comparison.
- **2026-09-03 — Colour token names and semantic palette:** Colour values were given `--color-*` token names to match the existing `--space-*` convention, and the semantic status palette — previously described only as living "in the comparison prototype" — was brought into this document. Recorded as a gap closure rather than a new visual decision; no approved value changed.
- **2026-09-03 — Layout breakpoints:** Two named breakpoints were recorded: `--bp-field` `760px`, ratified from consistent use across the prototype series, and `--bp-office-wide` `1024px`, chosen rather than ratified because the prototypes' intermediate widths were content-driven and carried no single value. Recorded as a gap closure; open to revision on evidence from the first real Office layouts.
- **2026-09-03 — Do/don't examples:** **D · Par canónico y lista de verificación** was approved. Each of the seven risk areas carries exactly one rendered do/don't pair plus a review checklist. **A · Reglas con contraejemplo** was explicitly rejected as leaving visual interpretation to whoever implements. **C · Catálogo revisable por área** was rejected because doubling the rendered material concentrates maintenance cost on the least settled areas.
- **2026-09-03 — Spanish UX writing:** **B · Institucional clara** was approved. Interface language uses a formal, respectful Spanish register with precise administrative terminology, explicit actions, and actionable state messages.

## Approved foundation

### Color family

Use the approved **A · Azul institucional** palette as the visual foundation. Keep operational status colors semantically independent so blue branding does not blur success, warning, danger, or informational meaning.

| Token | Value | Role | Intended use |
| --- | --- | --- | --- |
| `--color-institutional` | `#12315B` | Institutional | Navigation and civic identity |
| `--color-action` | `#1D4F82` | Primary action | Primary controls and selected emphasis |
| `--color-accent` | `#C34F3D` | Exceptional accent | Sparse alerts and exceptional map emphasis |
| `--color-canvas` | `#F4F7FA` | Canvas | Application background |
| `--color-surface` | `#FFFFFF` | Surface | Primary content surfaces |
| `--color-surface-subtle` | `#EAF0F5` | Subtle surface | Grouped controls and table headers |
| `--color-text` | `#172337` | Primary text | Main copy and labels |
| `--color-text-secondary` | `#536174` | Secondary text | Supporting copy and metadata |
| `--color-border` | `#CBD5DF` | Border | Dividers and panel edges only |
| `--color-border-strong` | `#70849A` | Strong border | Boundaries of interactive controls |
| `--color-focus` | `#2377BD` | Focus | Keyboard focus indicator |
| `--color-on-institutional` | `#FFFFFF` | Text on dark | Primary text on institutional or action fills |
| `--color-on-institutional-secondary` | `#B7C6D8` | Secondary text on dark | Supporting text on institutional or action fills |

Semantic colors carry operational meaning and are independent of the institutional blue. Each family has a text tone, a soft fill, and a boundary tone:

| Family | Text | Fill | Boundary | Applied to |
| --- | --- | --- | --- | --- |
| Info | `--color-info` `#1C4F74` | `--color-info-fill` `#DFECF6` | `--color-info-line` `#A8C7DD` | `Programado`, `En curso` |
| Success | `--color-success` `#1D6247` | `--color-success-fill` `#DEEFE7` | `--color-success-line` `#9CC6B1` | `Completado` |
| Warning | `--color-warning` `#7B480E` | `--color-warning-fill` `#F8E8CF` | `--color-warning-line` `#DFBD88` | `Suspendido`, `A reprogramar`, `Parcial`, Delayed notice |
| Danger | `--color-danger` `#9F2F27` | `--color-danger-fill` `#F8E5E2` | `--color-danger-line` `#DDB0AB` | `Cancelado`, destructive confirmation |

- Use the token name, not the literal value, in application code. A value that appears in a component without a token is a defect.
- Do not introduce a colour outside these tables. A new operational meaning needs a decision-log entry, not a new hex value in a component.
- Semantic families never substitute for the institutional blue in navigation or primary actions, and the institutional blue never carries status meaning.

### Typography family

Use **Archivo** throughout the application interface. It is the single production family and supersedes the earlier Inter decision. Self-host the normal variable font or only the required upright weights (`400`, `500`, `600`, and `700`) rather than depending on a third-party font request.

```css
font-family: "Archivo", system-ui, -apple-system, "Segoe UI", sans-serif;
```

Use tabular numerals for times, dates, identifiers, quantities, and comparable table values.

### Type scale and density

Use the approved **Adaptativa equilibrada** posture:

| Role | Desktop | Mobile/Field | Weight |
| --- | --- | --- | --- |
| Page title | 28/34 px | 26/32 px | 700 |
| Section title | 20/28 px | 19/26 px | 700 |
| Reading/body text | 16/24 px | 16/24 px | 400 |
| Dense table text | 14/20 px | Transform to list/detail | 400–600 |
| Label/button text | 14/20 px | 14/20 px | 600 |
| Metadata/helper text | 12/16 px | 12/16 px | 400–500 |

- Default desktop controls are 40 px high; Field and mobile task controls are 48 px high.
- Use 24 px page-level gaps and gutters on desktop, 16 px on mobile, and 14 px internal panel padding as starting values.
- Default data-table cells use 10 px vertical padding. Do not apply the rejected comfortable variant's 48–52 px rows universally.
- Preserve text zoom and browser scaling; never reduce mobile body text to recover space.

### Spacing scale

Use the approved **Ritmo operativo fino** scale. Fine steps serve dense controls and data; larger jumps organize regions and pages.

| Token | Value | Typical role |
| --- | --- | --- |
| `--space-4` | `4px` | Icon/text and tightly related inline gaps |
| `--space-6` | `6px` | Label/helper and badge internals |
| `--space-8` | `8px` | Compact control groups |
| `--space-10` | `10px` | Dense table-cell vertical padding |
| `--space-12` | `12px` | Standard control groups |
| `--space-14` | `14px` | Default panel internals |
| `--space-16` | `16px` | Mobile gutters and ordinary content groups |
| `--space-20` | `20px` | Subsection separation |
| `--space-24` | `24px` | Desktop page gutters and primary section gaps |
| `--space-32` | `32px` | Major region separation |
| `--space-40` | `40px` | Large task transitions |
| `--space-48` | `48px` | Page-section separation |
| `--space-64` | `64px` | Exceptional top-level separation |

- Use the smallest token that makes two elements read as separate; proximity must continue to communicate grouping.
- Prefer `gap` in flex and grid layouts over child margins. Do not create one-off values between tokens.
- Spacing does not alter the approved 40 px desktop and 48 px Field control heights.
- Larger tokens are not a license to reproduce the rejected universally comfortable density; data-heavy Office surfaces remain compact.

### Layout and breakpoints

The system has two named layout breakpoints. They mark the change of operating posture, not device categories:

| Token | Value | Boundary |
| --- | --- | --- |
| `--bp-field` | `760px` | Below this width the interface takes the Field posture |
| `--bp-office-wide` | `1024px` | At or above this width Office may show the sidebar and a secondary panel at once |

- Below `--bp-field`, apply the Field posture as a whole: bottom navigation replaces the sidebar, task controls become 48 px, dense tables transform into lists or detail views, and gutters drop to 16 px. Do not apply parts of this posture independently.
- Between the two breakpoints, keep the Office shell but allow the sidebar to collapse to its 72 px rail and secondary panels to stack below primary content.
- At or above `--bp-office-wide`, the full Office composition is available. It is a ceiling for layout, not a licence for wider line lengths; keep reading measures bounded.
- Component-local breakpoints are permitted and expected. Choose them where the component's own content breaks, not from a device list, and keep them local to that component rather than promoting them to the two names above.
- Only these two values are normative. Intermediate widths used inside the comparison prototypes were content-driven and carry no authority.
- Never switch posture on user-agent sniffing or on a touch-capability test. Width is the only signal; a touch screen at Office width remains Office.

### Radius and elevation

Use the approved **Suave sin sombras** geometry:

| Surface | Radius | Boundary treatment |
| --- | --- | --- |
| Controls | `12px` | Fill, or `1px solid var(--color-border-strong)` according to hierarchy |
| Panels/cards | `16px` | `1px solid var(--color-border)`; no resting shadow |
| Popovers/overlays | `16px` | `1px solid var(--color-border)`; no elevation shadow |

- Use `--color-border-strong` wherever the boundary is what identifies an interactive control — text inputs, selects, textareas, and bordered buttons. Use `--color-border` for dividers, table rules, and panel edges, which are decorative and carry no state. This distinction is a conformance requirement, not a stylistic preference; see **Accessibility**.
- Use borders, background contrast, and spacing to communicate grouping and depth.
- Do not add decorative drop shadows to cards, panels, menus, or popovers.
- Pill geometry remains appropriate for compact statuses and tags; it is not the default for buttons or containers.

### Desktop navigation

Use the approved **Sidebar plegable** app shell for Office-sized viewports:

- Default to a persistent 220 px sidebar with both icons and visible module labels.
- Provide an explicit collapse control at the bottom of the sidebar.
- Collapse to a 72 px icon rail without changing the user's current module or workspace state.
- Every rail icon requires an accessible name and a visible tooltip on hover or keyboard focus.
- Keep the active module visually distinct in both modes.
- Treat the expanded or collapsed preference as a user setting; do not repeatedly reset it during navigation.

### Mobile navigation

Use the approved **Tareas + Más** pattern for Field and narrow-screen navigation:

- Keep four bottom-bar destinations: `Inicio`, `Servicios`, `Mapa`, and `Más`.
- Use `Más` to open a bottom sheet containing the complete module list, including `Inventario` and `Control ambiental`.
- Preserve the active destination indicator when the current module also appears in the complete list.
- Keep each bottom target at least 48 px high and provide both an icon and a visible Spanish label.
- Allow new or lower-frequency modules to enter the complete list without expanding the persistent bar.

### Component anatomy and interaction states

Use the approved **Campos explícitos** anatomy as the default for forms and task inputs:

- Compose related inputs as a `FieldGroup`; each `Field` keeps its persistent label, control, helper text, and validation message together.
- Keep required markers in the label. Place specific error text directly below its control, set `aria-invalid` on that control, and expose the relationship with `aria-describedby`.
- Use the approved 40 px desktop and 48 px Field control heights, 12 px control radius, visible boundaries, and a 3 px keyboard focus ring.
- Explain disabled or read-only states in nearby text whenever the reason is not self-evident. Reduced opacity alone is insufficient.
- Keep one primary action per task surface. Secondary actions use the bordered hierarchy; destructive actions remain visually separated and require a titled confirmation dialog only when their effect is irreversible.
- Show progress in the initiating action without changing its width or losing its label. Use non-blocking status feedback for routine completion and blocking dialogs only when a decision is required.
- Support empty, hover, active, focus, invalid, disabled, read-only, loading, success, and destructive-confirmation states without relying on color alone.
- Task sections may organize genuinely multi-stage workflows, but they do not replace the approved field anatomy or become a decorative container around routine forms.

In production, align this anatomy with the project-owned shadcn/Base UI compositions (`FieldGroup`, `Field`, `Button`, `Spinner`, toast, and `AlertDialog`) rather than creating parallel primitives.

### Motion and reduced motion

Use the approved **Continuidad espacial** system to explain state changes and relationships between operational surfaces:

- Acknowledge direct control feedback in about `150ms`, routine state changes in about `280ms`, and panel or layout continuity in up to `420ms`.
- Use `cubic-bezier(0.16, 1, 0.3, 1)` for spatial transitions so movement arrives decisively without bouncing.
- Give movement a concrete origin and destination: a selected service may shift subtly toward the detail surface while that surface enters from the corresponding edge.
- Preserve state and selection throughout a transition. Motion must never delay input, hide essential content, or replay merely because a component re-rendered.
- Keep routine confirmations brief and local to the initiating action. Do not choreograph whole-page entrances or add decorative looping motion.
- Honor `prefers-reduced-motion: reduce`. Remove spatial travel, scaling, parallax, and non-essential repetition; preserve immediate color, boundary, text, and opacity changes so the outcome remains equally clear.
- Loading indicators may continue at a calmer rate when motion is necessary to communicate ongoing work. Prefer determinate progress whenever the application knows it.

### Spanish UX writing

Use the approved **Institucional clara** voice throughout Office and Field interfaces:

- Address the user with a consistent formal register. Prefer clear formal imperatives such as `Seleccione`, `Verifique`, and `Confirme`; do not mix them with voseo within the same product flow.
- Name actions with a specific verb and object, such as `Registrar servicio`, `Consultar recorrido`, or `Confirmar cancelación`. Avoid generic labels such as `Aceptar`, `Enviar`, `Sí`, or `No` when the outcome is not self-evident.
- Preserve domain terminology consistently. Use `servicio`, `cuadrilla`, `asignación`, `recorrido`, and `turno` for those concepts rather than varying words for style.
- Keep routine instructions concise even within the formal register. Add administrative context only when it changes the decision, consequence, eligibility, or recovery path.
- Validation messages state what needs attention and the valid next step. When useful and known, include the relevant constraint; never blame the user or invent a cause.
- Empty states distinguish no data, no filtered results, missing permission, and loading failure. State what happened and provide the next useful action.
- Destructive confirmations name the affected object and consequence. Repeat the specific destructive action on the confirmation button and offer a clearly named safe alternative.
- Success messages confirm the completed outcome and mention its next operational consequence only when that information affects the user's work.
- Use sentence case, complete translatable messages, and visible labels that align with accessible names. Do not rely on punctuation, color, or iconography to convey tone or meaning.
- Prefer role-based, gender-inclusive wording such as `persona supervisora` when referring to an unknown individual.

### Operational statuses

Use the approved **Etiqueta semántica** treatment in tables, lists, cards, and detail views: a compact pill with soft semantic background, status-specific icon, and visible text label.

| Backend value | Spanish label | Semantic family | Icon concept |
| --- | --- | --- | --- |
| `SCHEDULED` | Programado | Info | Clock |
| `IN_PROGRESS` | En curso | Active/info | Play |
| `SUSPENDED` | Suspendido | Warning | Pause |
| `RESCHEDULED` | A reprogramar | Warning | Calendar/change |
| `COMPLETED` | Completado | Success | Check |
| `PARTIALLY_COMPLETED` | Parcial | Warning | Alert |
| `CANCELLED` | Cancelado | Danger | Cancel |

- `DELAYED` is not a `ServiceStatus`; present it as a separate warning notice while preserving the underlying `SCHEDULED` or `IN_PROGRESS` badge.
- Crew assignment is service metadata, not a status.
- Always expose the full text label to assistive technology. Do not rely on color, icon, or position alone.
- Use tabular data and detail layouts that reserve enough width for `A reprogramar`, the longest standard label.

### Route map markers

Use the approved **Pin numerado** pattern for ordered route stops:

- Use the familiar location-pin silhouette with the route-order number inside.
- Use institutional blue for the default marker and a clearly separated coral outline for the current selection.
- Selecting a pin opens an anchored information card with location, service type, operational status, time window, and a route to the full service detail.
- Keep the information card border-defined and shadow-free, consistent with the approved surface system.
- Synchronize map and list selection bidirectionally; selecting either representation highlights the other without losing filters or map position.
- Give every marker an accessible name that includes its order and location. The number must remain legible at supported map zoom levels.

### Mobile map/list workspace

Use the approved **Mapa + bandeja** composition on narrow Field viewports:

- Keep the map as the persistent spatial context and place the synchronized service list in a bottom sheet above it.
- Support at least collapsed/peek, half-height, and expanded sheet positions.
- Provide explicit expand and collapse controls with accessible names; dragging may supplement these controls but must not be the only mechanism.
- Keep the sheet handle visually available when dragging is supported, with a sufficiently large gesture target around it.
- Preserve selected service, map position, filters, and list scroll position across sheet changes.
- Ensure the sheet never covers the task-focused mobile navigation or critical map attribution and controls.
- When the on-screen keyboard opens, move focused form fields into view and allow the sheet to expand without trapping content.

### Basemap emphasis

Use the approved **Ambiental contextual** treatment beneath operational overlays:

- Give parks, green space, and land-use areas a visible but muted green hierarchy so field users can orient themselves from environmental context.
- Keep roads, neighborhood labels, water, and administrative boundaries legible without competing with numbered service pins, selection, statuses, or alerts.
- Preserve institutional blue and exceptional coral for operational UI; do not reuse them as broad basemap fills.
- Validate the final tile provider/style at representative zoom levels, in sunlight-oriented mobile use, and with dense operational overlays.
- Do not encode operational status in the basemap. The base remains geographic context only.

### Marker clustering

Use the approved **Agrupar y acercar** behavior when service markers would overlap:

- At broad zoom levels, replace overlapping markers with count clusters that state how many services they contain.
- Activating a cluster zooms the map to reveal smaller clusters or the approved numbered pins; it does not open a competing service list over the map.
- Keep clusters visually related to institutional-blue markers while making their count and larger hit target immediately distinguishable from a single stop.
- Give each cluster an accessible name that includes its service count and activation result, such as `27 servicios; acercar para verlos`.
- Recalculate clusters after zoom, pan, filtering, or data refresh without discarding the selected service.
- When the closest supported zoom still contains coincident locations, provide an accessible secondary way to choose among those services.

### Operational charts

Choose chart forms according to the operational question rather than applying one chart type universally:

- Use direct horizontal bars as the default when people need to rank categories, compare percentages, or find lagging zones quickly. Keep category labels and exact values adjacent to their marks.
- Pair every summary visualization with a detailed, accessible data view that exposes the underlying values in a semantic table. The table is a companion view, not a visually hidden substitute.
- Use grouped columns only when two meaningful series share a baseline and comparing both series is the task. Do not manufacture a duplicate series merely to make a dashboard look conventional.
- Use line or area charts for change over ordered time, never for unordered categories. Area fill communicates magnitude and must not obscure exact values or uncertainty.
- Keep chart color subordinate to data meaning: institutional blue carries the primary series; semantic colors retain their approved status meanings; coral marks exceptional thresholds or selections rather than ordinary decoration.
- Show units, date range, data freshness, and relevant targets in text. Tooltips supplement persistent labels and cannot be the only way to retrieve a value.
- Preserve the current filters and selected datum when switching between visualization and table. On narrow screens, prefer readable transformation or the table companion over horizontal chart scrolling.
- Production charts should compose the project-owned shadcn Chart wrapper and Recharts foundation, using M6 semantic tokens and component rules rather than copying gallery examples verbatim.

### Accessibility

**Conformance target: WCAG 2.2 Level AA.** This is the level the interface must meet, not an aspiration. A change that would drop a surface below AA is a defect regardless of how it looks.

#### Contrast

The approved palette was measured against the AA thresholds — 4.5:1 for normal text, 3:1 for large text and for non-text elements under SC 1.4.11. Measured values for the combinations the system actually produces:

| Combination | Ratio | Required |
| --- | --- | --- |
| Primary text on Surface / Canvas / Subtle | 15.77 / 14.66 / 13.72 : 1 | 4.5 |
| Secondary text on Surface / Canvas / Subtle | 6.31 / 5.87 / 5.49 : 1 | 4.5 |
| White on Institutional / Primary action / Accent | 12.99 / 8.42 / 4.66 : 1 | 4.5 |
| Secondary text on dark, on Institutional / Primary action | 7.48 / 4.85 : 1 | 4.5 |
| Focus ring on Surface / Canvas | 4.72 / 4.39 : 1 | 3 |
| Strong border on Surface / Canvas / Subtle | 3.85 / 3.58 / 3.35 : 1 | 3 |
| Semantic text on its own fill (info / success / warning / danger) | 7.22 / 6.09 / 6.28 / 5.94 : 1 | 4.5 |
| Semantic text on Surface (info / success / warning / danger) | 7.22 / 7.27 / 7.57 / 5.94 : 1 | 4.5 |

- White on the exceptional accent passes at 4.66:1 with little margin. Do not use the accent behind text smaller than the 14 px label size, and do not darken text against it instead of re-measuring.
- `--color-border` at 1.49:1 on Surface is below the non-text threshold and must never be the boundary that identifies an interactive control. This is why `--color-border-strong` exists. Dividers, table rules, and panel edges may keep `--color-border`, because they convey grouping that spacing and background already carry.
- Status pill fills sit near 1.2:1 against Surface and their boundary tones near 1.8:1. This is acceptable because a status pill is not an interactive control and its meaning is carried by a text label measured above, not by its fill. If a status pill ever becomes an interactive filter control, it must adopt `--color-border-strong`.
- Never place `--color-text-secondary` on the institutional navy or on the primary action fill. It measures 2.06:1 on navy, far below the threshold. Dark institutional surfaces take `--color-on-institutional` and `--color-on-institutional-secondary`, which are the only two text tones approved for them. Do not reach for a translucent white such as `#FFFFFFBD` instead; opacity over a fill produces an unmeasured colour.
- Re-measure whenever a colour value changes. Do not reason about contrast by eye.

#### Perception

- Never let colour be the only carrier of meaning. Every status, validation result, chart series, and map marker also carries text, an icon, a number, or a position.
- Keep the 3 px keyboard focus indicator visible on every focusable element, with 2 px offset, and never remove it without an equally visible replacement.
- Preserve browser text zoom and page scaling. Content must remain reachable at 200 % zoom without horizontal scrolling of the page body.
- Honour `prefers-reduced-motion: reduce` as specified under **Motion and reduced motion**. Removing motion must never remove the feedback the motion carried.

#### Operation

- Keep Field and mobile task controls at 48 px minimum. Office controls at 40 px remain acceptable for pointer input at Office widths.
- Make every interaction reachable by keyboard in a logical order, including map markers, cluster activation, and bottom-sheet expansion. A drag gesture may supplement an explicit control but never replaces it.
- Give every icon-only control an accessible name. An icon without a name is a defect, not a compact variant.
- Do not trap focus outside a deliberate modal, and return focus to the initiating control when a dialog or sheet closes.

#### Structure and language

- Associate every control with a persistent visible label, and link helper and error text through `aria-describedby` with `aria-invalid` on the control itself.
- Announce asynchronous outcomes through a live region so a non-visual user learns the result of an action that produced no navigation.
- Pair every chart with the accessible data table specified under **Operational charts**. The table is a companion view, not a visually hidden substitute.
- Keep visible label text and accessible name in agreement, in the formal Spanish register specified under **Spanish UX writing**.

### Do/don't examples

Use the approved **Par canónico y lista de verificación** format to make the rules above verifiable:

- Cover exactly seven risk areas: form anatomy and errors, action hierarchy and destructive confirmations, operational statuses, Office/Field responsive behavior, map and chart presentation, motion and reduced motion, and Spanish UX writing.
- Give each area exactly one rendered do/don't pair. The pair shows the mistake that costs the most in that area, not a generic aesthetic preference. Adding a second pair to an area requires retiring another or revisiting this decision.
- Name the governing rule on every pair and state why the incorrect version fails. A pair without a stated reason is decoration.
- Give each area a review checklist. Checklists are text tied to rules, so they cover the rules that have no rendered pair and stay accurate when a component changes.
- Keep the rule prose normative. The pair and the checklist are aids for applying a rule, not separate rules; when they disagree with the section above, the section wins and the example is corrected.
- Do not grow this into a component catalog. Component-level documentation belongs with the project-owned shadcn/Base UI compositions.

The canonical pairs live at [`docs/design/examples/index.html`](docs/design/examples/index.html). Open that file directly in a browser; it is self-contained, needs no build step, and carries all seven pairs and all seven checklists on one page. It is versioned with this document, so a change to a rule and a change to its example arrive in the same commit.

The comparison prototype at `src/app/prototype/do-dont/` (`npm run prototype:do-dont`) shows the rejected formats A, B, and C alongside the approved D. It is throwaway history and carries no authority; the examples page is the normative asset.

| Risk area | Canonical pair | Governing rule |
| --- | --- | --- |
| Form anatomy and errors | Field with a validation error: label, control, helper, and error together with `aria-invalid` and `aria-describedby`, against a placeholder-as-label field with a generic banner above the form | The label, helper, and error accompany the control |
| Action hierarchy | Service action bar with one filled primary and a separated destructive action, against three filled buttons labelled `Aceptar`, `Enviar`, and `Eliminar` | One primary action per task surface |
| Operational statuses | Status column with soft semantic fill, icon, and Spanish label, against colour-only dots and the raw `IN_PROGRESS` value | Status combines semantic fill, icon, and Spanish label |
| Office/Field responsive | Narrow-screen service list transformed into cards with 48 px controls, against the same table kept with horizontal scroll and 11 px text | The dense table transforms rather than compresses |
| Map and chart presentation | Ranked horizontal bars with adjacent exact values and a companion table, against a donut with a decorative palette and tooltip-only values | The chart form answers the operational question |
| Motion and reduced motion | Detail panel arriving in 280 ms with the approved easing, against a 900 ms bouncing panel beside a looping indicator | Motion explains a spatial relationship |
| Spanish UX writing | Formal validation message stating the constraint and next step, against a voseo message that blames the user and offers generic buttons | The error states the problem and the valid next step |

#### Review checklists

**Form anatomy and errors**

- Does every control have a visible label in addition to any placeholder?
- Does the control boundary use `--color-border-strong` rather than the decorative `--color-border`?
- Is the error message below its control and referenced by `aria-describedby`?
- Do the disabled and read-only states carry a visible textual reason?
- Is the required condition readable without relying on colour?

**Action hierarchy and destructive confirmations**

- Is there exactly one filled primary action on the surface?
- Is each label a specific verb plus object, understandable out of context?
- Is the destructive action visually separated from the confirming action?
- Does the safe alternative have its own name instead of a generic `Cancelar`?
- Does progress appear in the initiating action without changing its width or losing its label?

**Operational statuses**

- Does the badge carry an icon and a Spanish label rather than colour alone?
- Does the label match the approved `ServiceStatus` table exactly?
- Are conditions that are not statuses — a Delayed notice, a crew assignment — shown separately from the badge?
- Does the accessible name include the full status text?
- Does the layout reserve width for `A reprogramar`, the longest label?

**Office/Field responsive behavior**

- Does the narrow view transform the table instead of scrolling it horizontally?
- Do touch controls reach 48 px in height?
- Does reading text stay at 16 px on Field?
- Do the bottom sheet and the on-screen keyboard leave navigation and critical controls reachable?
- Does the layout tolerate browser text zoom without clipping or overlap?

**Map and chart presentation**

- Does the chosen chart form answer the question rather than follow visual habit?
- Is there a companion table exposing the exact values?
- Are units, date range, and data freshness stated in text rather than only in tooltips?
- Do markers keep their route-order number and an accessible name?
- Does chart colour stay subordinate to meaning, leaving semantic colours their status meaning?

**Motion and reduced motion**

- Does the transition have a concrete origin and destination rather than only a fade?
- Do durations respect the 150 / 280 / 420 ms bands for their kind of change?
- Is there no looping motion and no whole-page entrance?
- Under `prefers-reduced-motion`, does the outcome remain equally clear through colour, border, icon, and text?
- Is selection and state preserved across the transition?

**Spanish UX writing**

- Is the formal register consistent across labels, helpers, errors, and confirmations?
- Is each action named with a specific verb and object?
- Do domain terms match `servicio`, `cuadrilla`, `asignación`, `recorrido`, and `turno`?
- Does the empty state distinguish its cause and offer the next useful action?
- Does the destructive confirmation name the affected object and its consequence?

#### Keeping the examples true

- Change the example in the same commit as the rule it illustrates. An example that contradicts its rule is worse than no example.
- The examples page uses the same token values as production. When a token changes, open the page and confirm the pair still demonstrates its rule.
- Run the design detector over the page after editing it: `node .claude/skills/impeccable/scripts/detect.mjs docs/design/examples/index.html`. The page is expected to report zero anti-patterns, because it is the reference for the standard.
