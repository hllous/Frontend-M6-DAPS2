# Civic operations visual and accessibility precedents

Research for [Research civic operations visual and accessibility precedents](https://github.com/hllous/Frontend-M6-DAPS2/issues/13), conducted 2026-09-01.

## Question

Which high-trust public-sector, field-operations, data-dense, map-centric, and accessibility references should inform M6 visual direction, interaction patterns, status semantics, responsive behavior, and Spanish UX writing without copying a generic admin template?

## Recommendation

Design M6 as a calm, task-led civic operations workspace with two related modes:

- a data-dense desktop workspace for planning, monitoring, comparison, and dispatch; and
- a focused mobile workspace for field tasks, evidence capture, status changes, and navigation.

Use the Government of the City of Buenos Aires' Obelisco system as the strongest **contextual precedent** for civic tone, Spanish-language conventions, legibility, focus treatment, and semantic color. Do not adopt Obelisco wholesale and do not visually clone a public information website: M6 is an internal, map-centric operations product and needs purpose-built information density, synchronized map/table interaction, and operational status models. Use WCAG 2.2 AA as the minimum conformance target and treat the accessible table/list as a first-class way to perform work, not a degraded afterthought.

This research intentionally does **not** choose the final palette, typeface, spacing scale, or component appearance. Those belong in the later visual-design and prototype decisions.

## Evidence and implications

| Precedent | Primary-source finding | Implication for M6 |
| --- | --- | --- |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | WCAG 2.2 is a W3C Recommendation intended to be testable using automated testing and human evaluation. AA requirements relevant to M6 include reflow at 320 CSS px, 3:1 non-text contrast for meaningful UI and graphics, keyboard operation, text-described errors, an alternative to dragging, and a minimum pointer-target size or sufficient spacing. | Make WCAG 2.2 AA a design acceptance gate, with manual keyboard, zoom/reflow, touch, screen-reader, color-vision, and outdoor-lighting checks in addition to automation. Drag-and-drop, map gestures, charts, and dense tables all need equivalent controls. |
| [Obelisco typography](https://gcba.github.io/Obelisco-V2/components/typography) | GCBA prioritizes legible, semantically structured, consistent typography; sets 16 px as its default body size; preserves scaling; discourages text over images; and uses a restrained weight hierarchy. | Investigate a highly legible self-hosted sans family and a restrained type scale. Keep body text at least 16 px by default, left aligned, scalable, and semantically structured. Do not imitate a marketing-page display hierarchy in dense operational views. |
| [Obelisco color](https://gcba.github.io/Obelisco-V2/components/colors) | GCBA defines colors by semantic purpose, tests combinations against WCAG 2.2, moderates color use, and separates base, text, interaction, and functional tokens. | Build semantic design tokens rather than assigning raw colors in screens. Reserve saturation for selection, urgency, exceptions, and action. Every operational state must also have a textual label and, where useful, an icon or shape. |
| [Obelisco clear communication](https://gcba.github.io/estandares/contenido/comunicar-con-claridad/) and [button guidance](https://gcba.github.io/Obelisco-V2/components/button) | GCBA recommends short paragraphs, active present-tense Spanish, direct language, and concise action labels that begin with a verb; its component guidance recommends a single primary action per page. | Write internal Spanish that is direct and task-based. Prefer labels such as `Asignar cuadrilla`, `Registrar evidencia`, and `Reprogramar servicio`; avoid vague labels such as `Aceptar`, `Gestionar`, `Más` or unexplained acronyms. A later content decision must settle institutional voice (`vos`, infinitive, or neutral imperative) because the public-facing GCBA choice of `vos` may not fit an internal multi-municipality product. |
| [Obelisco tables](https://gcba.github.io/Obelisco-V2/components/table) and [USWDS tables](https://designsystem.digital.gov/components/table/) | Both government systems use semantic tables and responsive scroll regions. They recommend concise headers, consistent column formatting, few columns where possible, right-aligned comparable numbers, explicit sorting state, and keyboard-accessible overflow. USWDS cautions that dense compact rows fit numerical data better than text-heavy content. | Treat tables as decision surfaces rather than decorative grids. Provide captions/context, semantic headers, announced sort changes, visible focus, stable formats, column prioritization, and saved URL state. Prototype horizontal scroll versus row-detail/list transformations with real M6 data; do not force one mobile table pattern onto every workflow. |
| [GOV.UK map accessibility](https://brand.design-system.service.gov.uk/data/maps/) | GOV.UK says map differences must not rely on color alone and recommends patterns, shapes, labels, and sufficient contrast, including for use in varied lighting. | Pair marker/layer color with shape, icon, label, or line style. Provide a synchronized table/list that exposes the same records and actions, plus non-gesture zoom, filter, selection, and reset controls. Test the chosen base map and overlays in sunlight-like low-contrast conditions. |
| [USWDS data visualizations](https://designsystem.digital.gov/components/data-visualizations/) | USWDS recommends simple, familiar visualizations with a focused message. It notes that underlying data alone does not communicate the narrative conveyed by a visualization, so plain-text trends or summaries are also needed. | Each Chart.js view needs a clear question, textual takeaway, accessible data table, and consistent units—not a dashboard tile added merely because data exists. Use charts for comparison, trend, distribution, or exceptions; use key-value text for single facts. |
| [ONS chart text](https://service-manual.ons.gov.uk/data-visualisation/guidance/chart-text) | The UK Office for National Statistics treats chart text as part of the visualization, recommends concise active sentence-case titles, and requires chart alternatives to identify both chart type and main trend. | Titles should state the operational insight (`Aumentaron los servicios vencidos esta semana`), not merely the metric (`Servicios`). Provide concise alternative text and a nearby source/updated-at timestamp where freshness affects decisions. |
| [NHS status tags](https://service-manual.nhs.uk/design-system/components/tag) | NHS guidance uses tags only to communicate useful status, recommends adjectives rather than action verbs, starts with the smallest viable status set, and never relies on color alone. | Separate domain status from severity and from interactivity. Use compact labels such as `Planificado`, `En curso`, `Bloqueado`, and `Completado`; do not make a status chip look clickable unless it is a control. Avoid proliferating colors for every backend enum value. |

## Design constraints for later `DESIGN.md`

The visual-design ticket should turn the following constraints into tokens, examples, and do/don't guidance.

### Product character

- Trustworthy, calm, precise, and recognizably civic without becoming ceremonial.
- Information-dense where comparison matters, spacious where a field operator must complete one task safely.
- A restrained neutral canvas with semantic accents; no wall of saturated cards, ornamental gradients, glass effects, or dashboard-template decoration.
- Map, table, status, timestamps, and provenance carry more visual weight than vanity metrics.

### Information hierarchy

- Lead each screen with the task, current scope, and freshness/status context.
- Use progressive disclosure: summary first, row/marker detail second, infrequent metadata last.
- Keep one primary action per task context. Place destructive or irreversible actions apart and name their consequence.
- Distinguish **entity state** (`En curso`), **severity/attention** (`Crítico`), **sync state** (`Pendiente de envío`), and **UI interaction state** (`Seleccionado`) in language and tokens.

### Map and table relationship

- Desktop should explore a synchronized split-view hypothesis: selection and filters update both map and table without losing the user's context.
- Mobile should explore an explicit `Mapa` / `Lista` switch rather than shrinking the split view. Preserve filters, selection, viewport intent, and pending edits across the switch.
- All records and core actions exposed by the map must be discoverable through the list/table. Coordinates and geographic relationships may require a concise text description rather than a literal one-to-one visual translation.
- Clusters, routes, areas, and markers require redundant encodings. Never communicate status or layer identity only through hue.

### Responsive and field behavior

- Design for touch, keyboard, mouse, zoom, and screen readers from the same task model.
- Target at least WCAG's 24 by 24 CSS px AA minimum; prefer approximately 44 by 44 CSS px for primary field controls, consistent with WCAG's enhanced target guidance.
- Reflow ordinary content at 320 CSS px without two-dimensional scrolling. Treat genuinely spatial maps and tabular comparisons as scoped exceptions while providing accessible alternatives.
- Avoid sticky toolbars, sheets, or map overlays that obscure keyboard focus or the active record.
- Never require drag-and-drop, pinch, hover, or precise map-marker targeting to complete a workflow.
- Make save, upload, retry, conflict, and synchronization states persistent and textual so unstable connectivity never looks like successful completion.

### Typography, color, motion, and charts

- Evaluate the actual font with Argentine Spanish, long place names, dates, identifiers, table numerals, and low-end mobile rendering before choosing it.
- Use semantic tokens and verify text contrast at AA minimum, non-text/graphic contrast at 3:1, and all focus states. Outdoor field use justifies aiming above minimum contrast for primary information.
- Use motion only to explain spatial or state continuity. Respect `prefers-reduced-motion`; never make animation the sole indication of change or block task completion.
- Make chart color sequences distinguishable under common color-vision deficiencies, directly label series where practical, keep legends and units consistent, and always add a textual takeaway plus accessible table.

### Spanish UX writing

- Use sentence case, active voice, present tense, familiar domain terms, short paragraphs, and visible units.
- Name actions with a specific verb and object. Name passive statuses with adjectives or participles so they do not appear actionable.
- Error copy must identify what failed, preserve entered work, and state how to recover.
- Display dates, times, timezone, units, and relative-time meanings unambiguously. Do not rely on `hoy` or `hace 2 horas` without an exact value where audits or dispatch decisions depend on it.
- Establish a controlled vocabulary mapping backend terms to operator-facing Spanish; do not expose enum codes or English library language.

## Prototype hypotheses

Test these with representative M6 tasks and realistic data before finalizing the visual standard:

1. **Planning split view:** can a supervisor find unassigned services, compare them in a compact table, inspect geographic context, select several records, and assign a crew without losing filters?
2. **Field task view:** can a worker identify the next job, understand location and priority, record evidence, recover from a failed upload, and finish one-handed on a narrow screen?
3. **Map alternative:** can a keyboard or screen-reader user locate the same record, understand its relevant geography, and perform the same core action from the table/list?
4. **Status comprehension:** can users distinguish operational progress, urgency, synchronization, and selection without being taught the colors?
5. **Dense-table reflow:** at 200% zoom and 320 CSS px, which columns remain essential, which become row detail, and when does a focusable horizontal table remain more usable than stacked cards?
6. **Chart comprehension:** can users state the intended operational takeaway from each chart, and obtain the exact values without interpreting color or hover-only tooltips?

Measure task completion, time on task, critical errors, recovery success, status comprehension, and confidence. Include keyboard-only, screen-reader, zoom/reflow, reduced-motion, touch, color-vision simulation, and bright/low-quality-screen scenarios.

## What not to copy

- Do not adopt Obelisco's exact brand palette or public-site page templates before establishing M6's institutional ownership and internal-product needs.
- Do not copy a generic admin dashboard's sidebar-plus-card grid as the information architecture.
- Do not treat the map as a visual hero that pushes filters, records, actions, or accessible alternatives out of reach.
- Do not turn every metric into a chart or every state into a differently colored badge.
- Do not compress desktop density into tiny mobile controls; prioritize field tasks and progressively disclose secondary information.

## Decision produced by this research

The later visual-design work should begin from **Obelisco-informed, WCAG 2.2 AA civic operations design**, not from an off-the-shelf admin aesthetic. Its key interaction prototype is a synchronized map/table desktop workspace paired with a focused map/list mobile workflow. Final visual tokens, typography, component styling, and Spanish institutional voice remain decisions for that later work.

