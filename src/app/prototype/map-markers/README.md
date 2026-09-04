# Map-marker prototype

Ninth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose how service locations and route order appear on the operational map. The approved system, basemap, map/list split, status badges, and content remain fixed.

- `A · Pin numerado`: familiar location pin with route-order number, a distinct selected state, and an anchored information card on selection. **Approved 2026-09-03.**
- `B · Círculo compacto`: smaller numbered circle that exposes more map around each point.
- `C · Etiqueta persistente`: compact marker plus an always-visible service label.

## Run

```bash
npm run prototype:map-markers
```

Open `http://localhost:3008/?marker=A`. Use the floating arrows or keyboard left/right arrows.

## What to decide

Judge location precision, route-order recognition, selected-state clarity, and clutter. Do not judge the fixed basemap colors or broader map/list layout.

## Resolution

The user approved revised option A. Selecting a numbered route pin opens a shadow-free anchored information card and synchronizes the selected list row.
