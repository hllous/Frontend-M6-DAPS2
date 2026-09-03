# Desktop navigation-shell prototype

Sixth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose how Office users move between the product's main modules on desktop. The approved palette, Inter family, adaptive-balanced density, soft shadow-free surfaces, content, and mobile navigation remain fixed.

- `A · Sidebar plegable`: 220 px sidebar with icons and labels by default; the user can collapse it into a 72 px icon rail. **Approved 2026-09-03.**
- `B · Rail compacta`: persistent 72 px icon rail; labels depend on tooltips or expansion.
- `C · Barra modular`: horizontal module navigation above the workspace.

## Run

```bash
npm run prototype:navigation
```

Open `http://localhost:3005/?shell=A`. Use the floating arrows or keyboard left/right arrows.

## What to decide

Judge module discoverability, workspace width, scalability, and sustained-use efficiency. Do not judge color, typography, density, surface geometry, or the map/list layout in this prototype.

## Resolution

The user approved revised option A: a labeled 220 px sidebar by default, with an explicit user-controlled collapse action that turns it into a 72 px icon rail.
