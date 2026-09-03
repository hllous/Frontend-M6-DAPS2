# Operational-chart prototype

Thirteenth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose the default presentation for comparing weekly service completion by zone. Values, date range, filters, shell, palette, type, density, and surface treatment remain fixed.

- `A · Barras directas`: horizontal bars put the zone labels and exact values beside the marks, with no separate legend.
- `B · Columnas de tablero`: vertical columns use axes, grid lines, and a compact legend in a conventional dashboard composition.
- `C · Tabla visual`: a sortable-looking table keeps exact values primary and uses restrained inline bars for comparison.

## Run

```bash
npm run prototype:charts
```

Open `http://localhost:3012/?chart=A`. Use the floating arrows or keyboard left/right arrows.

## What to decide

Judge comparison speed, exact-value lookup, accessibility without color, and usefulness on narrow screens. Do not judge the already approved shell or visual tokens.

The static prototype uses HTML/CSS. Production chart composition should use the project’s shadcn Chart wrapper and its Recharts foundation.
