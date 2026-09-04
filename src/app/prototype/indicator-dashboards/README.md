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

Open `http://localhost:3018/?study=filter-context&choice=A`.

- `A · Barra explícita`: period and family remain visible as global selects.
- `B · Período + banda`: the global bar keeps only period; the approved family band owns family selection.
- `C · Panel de alcance`: period and family stack together beside their date and freshness context.

The approved family band, balanced focus row, chart geometry, and operational-record table remain identical. Only the composition of period, family, and context changes.
