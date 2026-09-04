# Type-scale and density prototype

Fourth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Resolution

Approved on 2026-09-03: **B · Adaptativa equilibrada**. **C · Cómoda universal** was explicitly rejected as too spacious. The selected scale and control sizes are recorded in `DESIGN.md`.

## Decision isolated

Choose the type-scale and density posture. The approved **Azul institucional** palette and **Inter** family, content, component shapes, status colors, and layout structure remain constant.

- `A · Compacta operativa`: 14 px desktop body, 36 px controls, 36–40 px table rows; mobile preserves 44 px touch controls.
- `B · Adaptativa equilibrada`: 16 px reading text, 14 px dense table text, 40 px desktop controls, 48 px field controls.
- `C · Cómoda universal`: 16 px throughout, 44 px desktop controls, 48–52 px rows and wider spacing.

## Run

```bash
npm run prototype:density
```

Open `http://localhost:3003/?density=B`. Use the floating arrows or keyboard left/right arrows.

## What to decide

Judge how quickly Office can scan and act without making Field text or targets cramped. Do not judge colors, typeface, radius, elevation, or navigation structure in this prototype.
