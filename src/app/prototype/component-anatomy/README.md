# Component anatomy and interaction-state prototype

Sixteenth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

> Four variants of a representative service-assignment workflow, switchable via `?components=`, on a throwaway prototype route.

## Feedback checkpoint

The user rejected **B · Filas operativas**, considered **A · Campos explícitos** good, and preferred the task-block structure in **C · Secciones guiadas**. Variant D was added to test that synthesis.

## Resolution

**A · Campos explícitos** was approved by the user on 2026-09-03. B remains explicitly rejected; C and D remain comparison history rather than normative component anatomy.

## Decision isolated

Choose the project-wide anatomy for fields, validation, progress, feedback, and action hierarchy. Archivo, the approved palette, type scale, density, spacing, 12/16 px radii, border-defined surfaces, navigation, and Spanish operational content remain fixed.

- `A · Campos explícitos`: conventional `FieldGroup` anatomy with label, control, helper/error beneath the control, and a stable footer action hierarchy. It balances Office scanability with Field clarity and maps directly to shadcn/Base UI composition. **Approved.**
- `B · Filas operativas`: label, control, and state occupy three aligned columns. It exposes state fastest and is the densest Office option, but requires a larger structural change on mobile. **Rejected by the user.**
- `C · Secciones guiadas`: the form is divided into task sections with persistent guidance and a readiness summary before the actions. It is safest for infrequent Field work, but consumes more vertical space in routine Office flows.
- `D · Bloques explícitos`: keeps C's task-based grouping while using A's direct label/control/helper/error anatomy and stable action footer. It removes the persistent readiness layer to remain compact for routine Office work.

All variants include real normal, focus, empty, disabled, invalid, loading, toast, and destructive-confirmation paths. The destructive action uses a titled alert dialog; routine save feedback uses a non-blocking status toast.

## Run

```bash
npm run prototype:components
```

Open `http://localhost:3015/?components=A`. Use the floating arrows or keyboard left/right arrows when a form control is not focused.

## What to decide

Compare scan speed, the relationship between labels and controls, how quickly errors and disabled reasons are understood, action hierarchy, recovery clarity, and whether the same anatomy remains natural on desktop and narrow Field widths. Do not re-evaluate the approved visual foundations.
