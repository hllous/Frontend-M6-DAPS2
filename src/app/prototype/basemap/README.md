# Basemap-style prototype

Eleventh focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose the visual emphasis of the operational basemap beneath the approved numbered pins. Marker anatomy, selection, information card, map/list layout, shell, and data remain fixed.

- `A · Cívico sobrio`: quiet neutral land, restrained green spaces, legible roads and neighborhood labels.
- `B · Ambiental contextual`: stronger green land-use areas and more visible natural context.
- `C · Monocromo operativo`: grayscale geography that maximizes contrast with operational overlays.

## Run

```bash
npm run prototype:basemap
```

Open `http://localhost:3010/?basemap=A`. Use the floating arrows or keyboard left/right arrows.

## What to decide

Judge geographic comprehension, visual competition with markers, civic character, and sustained-use comfort. Do not judge marker style or layout.

## Verdict

Approved on 2026-09-03: **B · Ambiental contextual**. The stronger green-space and land-use context improves territorial orientation while the approved numbered pins remain the operational foreground.
