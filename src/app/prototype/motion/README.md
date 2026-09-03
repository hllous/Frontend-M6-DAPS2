# Motion and reduced-motion prototype

Seventeenth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

> Three timing and continuity systems, switchable via `?motion=`, on the same approved service workflow.

## Decision isolated

Choose how M6 communicates feedback, state change, and spatial continuity, including the meaningful alternative when reduced motion is requested. Archivo, palette, density, spacing, navigation, and the approved **A · Campos explícitos** component anatomy remain fixed.

- `A · Respuesta contenida`: fast feedback, short state transitions, and restrained panel continuity. Reduced motion removes travel while preserving immediate color and opacity feedback. The user considered it good, but it is not the selected standard.
- `B · Continuidad espacial`: more visible travel and longer transitions make the relationship between the selected service and its detail panel clearest, at the cost of a more animated operational feel. **Approved.**
- `C · Casi instantánea`: relies mostly on immediate color and opacity changes. It is fastest and calmest, but weakens spatial continuity when panels and map/list surfaces change. **Explicitly rejected.**

All three expose the same actions: select another service, open and close details, confirm an assignment, and manually simulate reduced motion. The real `prefers-reduced-motion` media query uses the same reduced path.

## Resolution

**B · Continuidad espacial** was approved by the user on 2026-09-03. A remains a good comparison reference; C is explicitly rejected.

## Run

```bash
npm run prototype:motion
```

Open `http://localhost:3016/?motion=B`. Use the floating arrows or keyboard left/right arrows outside form controls.

## What to decide

Compare whether feedback feels immediate, whether the detail panel's origin remains understandable, whether any motion delays repeated work, and whether the reduced-motion path still communicates every state change. Do not re-evaluate the approved visual foundations or component anatomy.
