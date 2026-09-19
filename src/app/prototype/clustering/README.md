# Marker-clustering prototype

Twelfth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose how dense groups of services behave at broad map zoom. The approved environmental basemap, numbered pins, selection card, palette, and shell remain fixed.

- `A · Agrupar y acercar`: count clusters summarize density; activating one zooms in and reveals numbered pins.
- `B · Agrupar y listar`: activating a count cluster opens a local service list without changing the map zoom.
- `C · Sin agrupación`: every service remains a numbered pin, with small offsets where locations overlap.

## Run

```bash
npm run prototype:clustering
```

Open `http://localhost:3011/?clustering=A`. Use the floating arrows or keyboard left/right arrows. Activate the central cluster to compare its behavior.

## What to decide

Judge broad-area scanning, access to exact services, map continuity, and visual clutter. Do not judge the already approved basemap or marker anatomy.

## Verdict

Approved on 2026-09-03: **A · Agrupar y acercar**. Count clusters preserve broad-area readability, and activation zooms progressively until the approved numbered pins are available.
