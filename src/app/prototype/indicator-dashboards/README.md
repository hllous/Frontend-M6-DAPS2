# Operational indicator dashboard prototype

Throwaway prototype for [Prototype the operational indicator dashboards](https://github.com/hllous/Frontend-M6-DAPS2/issues/65).

## Question

Four dashboard compositions, switchable through `?variant=`, on the new prototype-only Tableros surface. Which composition best helps an Office actor move from a cross-domain signal to an actionable operational record without turning Mi trabajo into a dashboard?

## Variants

- `A · Pulso temporal`: period-first timeline with a synchronized signal inspector.
- `B · Brechas contra objetivo`: target-first exception board with ranked gaps.
- `C · Libro comparativo`: dense family ledger with one selected drill-down.
- `D · Brecha con contexto`: recommended hybrid; target-first hierarchy from B, temporal context from A, and the compact cross-family scan from C.

Every variant uses the same four backend indicator families, filters, freshness language, target semantics, accessible table companions, state simulation, and record links. All values are illustrative.

## Run

```bash
npm run prototype:indicator-dashboards
```

Open `http://localhost:3018/?variant=A`. Use the floating arrows or keyboard left/right arrows to compare variants. Use the `Estado de datos` control to inspect loading, no-results, and error recovery states.

This code is intentionally throwaway and must not be promoted directly to production.

## Iterative restart

The approved composite D is preserved at `?variant=D`. The restarted issue now validates one dashboard decision at a time while D's downstream content stays fixed.

### Decision 1 — family summary and selection

Approved: `A · Banda horizontal`. The four families remain simultaneously visible and selectable without imposing a priority order.

Open `http://localhost:3018/?study=family-summary&choice=A`.

- `A · Banda horizontal`: four equal-width signals in one scannable band.
- `B · Cola priorizada`: exceptions ordered by operational urgency.
- `C · Tabla compacta`: one semantic row per family for dense comparison.

Only the family-summary component changes. The selected coverage trend, territorial ranking, filters, records, and shell remain identical.

### Decision 2 — selected-family focus

Approved: `A · Equilibrio paralelo`. Trend and territorial ranking share the first detail row; neither becomes a preliminary gate to the underlying records.

Open `http://localhost:3018/?study=focus-layout&choice=A`.

- `A · Equilibrio paralelo`: trend and territorial ranking share the first detail row.
- `B · Tendencia en secuencia`: the full-width trend precedes a horizontal territorial ranking.
- `C · Territorio primero`: territorial ranking dominates the row and the trend becomes compact context.

The approved horizontal family band and the operational-record table remain identical. Only the hierarchy between trend and territorial ranking changes.

### Decision 3 — dashboard scope controls

Approved: `A · Barra explícita`. Period and family remain visible as global selects, even though the horizontal band also selects the family detail; explicit scope wins over removing the apparent duplication.

Open `http://localhost:3018/?study=filter-context&choice=A`.

- `A · Barra explícita`: period and family remain visible as global selects.
- `B · Período + banda`: the global bar keeps only period; the approved family band owns family selection.
- `C · Panel de alcance`: period and family stack together beside their date and freshness context.

The approved family band, balanced focus row, chart geometry, and operational-record table remain identical. Only the composition of period, family, and context changes.

### Decision 4 — freshness and target semantics

Approved: `A · Estado global`. The page keeps one compact “Actualizado hoy, 10:42” status for the complete dashboard and leaves each target inline in the family band. This is a global last-updated marker, not a formal data-cut timestamp or a per-family traceability statement.

Open `http://localhost:3018/?study=data-semantics&choice=A`.

- `A · Estado global`: one compact freshness badge serves the complete dashboard; targets remain inline in the family band.
- `B · Frescura por familia`: each family signal exposes its own data cut beside its target.
- `C · Trazabilidad seleccionada`: the selected family gets a dedicated row for data cut, observed period, target validity, and calculation unit.

The accepted global status remains deliberately compact; exact cut, unit, and target-validity metadata are not promoted into a dedicated row.

### Decision 5 — signal-to-record path

Approved: `A · Detalle en contexto`. Selecting Zona Sur keeps the actor in the dashboard, filters the accessible table below the ranking, and preserves the explanation chain from signal to a specific operational record. Record management remains in the Services surface.

Open `http://localhost:3018/?study=signal-to-record&choice=A`.

- `A · Detalle en contexto`: selecting Zona Sur filters and anchors the accessible record table below the ranking.
- `B · Panel lateral`: the persistent button below the territorial ranking opens, closes, and reopens a preview while the dashboard remains behind it.
- `C · Salto a Servicios`: selecting Zona Sur sends the actor directly to the operational Services list with period, family, result, and zone preserved.

The losing variants remain in the throwaway prototype as primary evidence for the decision.

### Decision 6 — accessible table companion

Pending validation. Each visualization now exposes the same exact values through a semantic table; only the table's presentation and relationship to its chart changes.

Open `http://localhost:3018/?study=table-companion&choice=A`.

- `A · Pares adyacentes`: each chart keeps its complete table immediately below and always visible.
- `B · Bandeja común`: both tables share one full-width data tray after the chart row.
- `C · Alternar en contexto`: each panel switches independently between chart and table in the same position.

The approved family band, balanced focus, explicit scope controls, global freshness semantics, and in-context path to Zona Sur records remain fixed. The operational-record table is also preserved and is not treated as a substitute for the chart data tables.
