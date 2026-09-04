# Mobile navigation prototype

Seventh focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Decision isolated

Choose how Field and narrow-screen users move between modules. The approved palette, Inter family, adaptive-balanced density, soft shadow-free surfaces, content, and desktop foldable sidebar remain fixed.

- `A · Cinco accesos`: all five modules appear in a persistent bottom bar.
- `B · Menú superior`: all modules live behind a header menu.
- `C · Tareas + Más`: three frequent destinations and a More entry appear in the bottom bar; secondary modules live in a sheet. **Approved 2026-09-03.**

## Run

```bash
npm run prototype:mobile-navigation
```

Open `http://localhost:3006/?mobile=C`. Use the floating arrows or keyboard left/right arrows. In B, open the header menu; in C, select `Más`.

## What to decide

Judge one-handed reach, discoverability, room for future modules, and access to frequent field tasks. Do not judge the already-approved visual foundation or desktop shell.

## Resolution

The user approved option C. The persistent mobile bar contains Inicio, Servicios, Mapa, and Más; Más opens the complete module list in a bottom sheet.
