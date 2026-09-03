# Mobile map/list workspace prototype

Tenth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose how the synchronized service list and map share a narrow Field viewport. The approved visual system, task-focused mobile navigation, numbered markers, status badges, and content remain fixed.

- `A · Vista enfocada`: a segmented control switches between full-width list and map views.
- `B · Mapa + bandeja`: the map remains visible behind a persistent partial-height list sheet. **Approved 2026-09-03.**
- `C · Flujo apilado`: map and list are placed sequentially in one scrolling page.

## Run

```bash
npm run prototype:mobile-workspace
```

Open `http://localhost:3009/?workspace=A`. Use the top comparison arrows or keyboard left/right arrows. In A, switch between Lista and Mapa.

## What to decide

Judge field focus, map context, scroll and gesture complexity, and access to service details. Do not judge the already-approved navigation or visual foundation.

## Resolution

The user approved option B. The production pattern must provide explicit accessible controls for its collapsed, half-height, and expanded positions; dragging is supplementary rather than required.
