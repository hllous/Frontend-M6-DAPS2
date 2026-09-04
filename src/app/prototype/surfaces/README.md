# Radius and elevation prototype

Fifth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose the surface geometry and depth treatment. The approved palette, Inter family, adaptive-balanced density, spacing, content, and layout remain constant.

- `A · Estructural nítida`: 4 px controls, 8 px panels, borders at rest, shadows only for overlays.
- `B · Cívica equilibrada`: 8 px controls, 12 px panels, border-first surfaces, restrained lift for selected/floating content.
- `C · Suave sin sombras`: 12 px controls and 16 px panels, with standard borders and no shadows. **Approved 2026-09-03.**

## Run

```bash
npm run prototype:surfaces
```

Open `http://localhost:3004/?surface=C`. Use the floating arrows or keyboard left/right arrows.

## What to decide

Judge operational clarity, perceived trust, hierarchy, and whether the interface feels too rigid or too consumer-oriented. Do not judge color, typography, density, or layout in this prototype.

## Resolution

The user approved revised option C: soft geometry without shadows. The final rule uses 12 px control radii, 16 px panel/overlay radii, standard borders, and no content-surface shadows.
