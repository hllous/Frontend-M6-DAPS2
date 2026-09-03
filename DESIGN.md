# M6 Design System

> Status: evolving decision record for “Decide the visual system and DESIGN.md standard.” Only explicitly approved choices are normative.

## Decision log

- **2026-09-03 — Palette:** **A · Azul institucional** was approved. It carries civic identity, navigation, and primary-action hierarchy; coral is reserved for exceptional emphasis.
- **2026-09-03 — Typeface:** **C · Inter** was approved after comparison with Source Sans 3, IBM Plex Sans, Public Sans, Archivo, Atkinson Hyperlegible Next, and Barlow.
- **2026-09-03 — Type scale and density:** **B · Adaptativa equilibrada** was approved. Office uses compact data presentation without shrinking general reading text; Field uses larger touch controls. **C · Cómoda universal** was explicitly rejected as too spacious.
- **2026-09-03 — Radius and elevation:** The revised **C · Suave sin sombras** was approved. Controls use 12 px radii, panels and overlays use 16 px radii, and content surfaces rely on borders instead of shadows.
- **2026-09-03 — Desktop navigation:** The revised **A · Sidebar plegable** was approved. It opens as a 220 px labeled sidebar and can be collapsed by the user into a 72 px icon rail.
- **2026-09-03 — Mobile navigation:** **C · Tareas + Más** was approved. The bottom bar keeps Inicio, Servicios, and Mapa visible, while secondary and future modules live under Más.
- **2026-09-03 — Operational statuses:** **A · Etiqueta semántica** was approved. Statuses use a soft semantic fill, a distinct icon, and a visible Spanish label; color never carries meaning alone.
- **2026-09-03 — Route map markers:** The revised **A · Pin numerado** was approved. Route stops use numbered location pins; selecting one opens an anchored information card and synchronizes the corresponding list row.
- **2026-09-03 — Mobile map/list workspace:** **B · Mapa + bandeja** was approved. The map remains visible while the synchronized service list occupies a resizable bottom sheet.
- **2026-09-03 — Basemap emphasis:** **B · Ambiental contextual** was approved. The operational map keeps visible green-space and land-use context beneath the primary service layer.
- **2026-09-03 — Marker clustering:** **A · Agrupar y acercar** was approved. Broad zooms use count clusters; activating a cluster changes zoom to reveal the approved numbered pins.

## Approved foundation

### Color family

Use the approved **A · Azul institucional** palette as the visual foundation. Keep operational status colors semantically independent so blue branding does not blur success, warning, danger, or informational meaning.

| Role | Token value | Intended use |
| --- | --- | --- |
| Institutional | `#12315B` | Navigation and civic identity |
| Primary action | `#1D4F82` | Primary controls and selected emphasis |
| Exceptional accent | `#C34F3D` | Sparse alerts and exceptional map emphasis |
| Canvas | `#F4F7FA` | Application background |
| Surface | `#FFFFFF` | Primary content surfaces |
| Subtle surface | `#EAF0F5` | Grouped controls and table headers |
| Primary text | `#172337` | Main copy and labels |
| Secondary text | `#536174` | Supporting copy and metadata |
| Border | `#CBD5DF` | Dividers and control boundaries |
| Focus | `#2377BD` | Keyboard focus indicator |

The comparison prototype contains the approved accessible status and map-support colors. Their final semantic naming and application remain pending until the dedicated status and map decisions.

### Typography family

Use **Inter** throughout the application interface. Self-host it in production rather than depending on a third-party font request.

```css
font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
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

### Radius and elevation

Use the approved **Suave sin sombras** geometry:

| Surface | Radius | Boundary treatment |
| --- | --- | --- |
| Controls | `12px` | Fill or 1 px border according to hierarchy |
| Panels/cards | `16px` | `1px solid #CBD5DF`; no resting shadow |
| Popovers/overlays | `16px` | `1px solid #CBD5DF`; no elevation shadow |

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

## Pending decisions

- Full spacing scale
- Component anatomy and interaction states
- Chart styling
- Motion and reduced-motion behavior
- Spanish UX-writing guidance
- Do/don't examples
