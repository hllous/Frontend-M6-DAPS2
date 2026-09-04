# Operational-status prototype

Eighth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose how operational statuses are represented in data-dense lists. The approved visual foundation, navigation, density, content, and semantic status colors remain fixed. Every option includes a visible text label and never depends on color alone.

- `A · Etiqueta semántica`: soft-color badge with an icon and text. **Approved 2026-09-03.**
- `B · Ícono destacado`: soft-color icon tile followed by uncontained status text.
- `C · Punto + texto`: compact colored dot followed by status text.

## Run

```bash
npm run prototype:statuses
```

Open `http://localhost:3007/?status=A`. Use the floating arrows or keyboard left/right arrows.

## What to decide

Judge scan speed, accessibility, density, and whether the status treatment competes with the service information. Do not judge the already-approved color family, typography, geometry, or navigation.

## Resolution

The user approved option A. The implementation examples were then aligned with the mirrored backend domain: `DELAYED` is a separate warning rather than a service state, and crew assignment is metadata. The standard status treatment combines soft semantic color, a distinct icon, and visible Spanish text.
