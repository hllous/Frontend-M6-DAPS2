# Spacing-scale prototype

Fourteenth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Resolution

Approved on 2026-09-03: **B · Ritmo operativo fino**. It preserves the already-approved 10 px dense-table and 14 px panel values while providing a controlled scale for component and page composition.

## Decision isolated

Choose the full spacing scale that connects the already-approved desktop/Field density to components and page composition. Palette, typography, control heights, radii, navigation, content, and behavior remain fixed.

- `A · Múltiplos estrictos`: a short 4 px scale (`4, 8, 12, 16, 24, 32, 48, 64`) that is easy to remember, but rounds the approved 10 px table padding and 14 px panel padding.
- `B · Ritmo operativo fino`: a deliberate fine-grained scale (`4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64`) that preserves the approved dense-table and panel values while keeping larger layout steps disciplined. **Recommended.**
- `C · Escala amplia`: a roomier scale (`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`) with more separation between regions, at the cost of showing less operational content at once.

## Run

```bash
npm run prototype:spacing
```

Open `http://localhost:3013/?spacing=A`. Use the floating arrows or keyboard left/right arrows.

## What to decide

Compare grouping clarity, scan continuity, how much useful information remains visible, and whether the same rhythm feels intentional on desktop and narrow Field widths. Do not re-evaluate the already-approved font sizes, control heights, radii, colors, or navigation structure.
