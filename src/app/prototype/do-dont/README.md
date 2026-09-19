# Do/don't examples prototype

Nineteenth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

> Three formats for the do/don't examples that will close the standard, switchable via `?examples=`, applied to the same seven high-risk areas.

## Decision isolated

Choose how `DESIGN.md` turns its already-approved rules into verifiable examples: how concrete, how many, and at what maintenance cost. Every approved foundation — palette, Archivo typography, density, spacing, radius/elevation, navigation, statuses, map, charts, component anatomy, motion, and the Institucional clara voice — stays fixed. Only the format of the examples changes.

- `A · Reglas con contraejemplo`: each rule gains one `Hacer` line and one `Evitar` line, in prose, inside its existing section. 21 text pairs, no rendered material. **Rejected** as leaving the visual interpretation to whoever implements.
- `B · Pares visuales por área de riesgo`: one canonical rendered pair per risk area, each naming the rule it governs and why the wrong version fails. 7 rendered pairs; the remaining rules stay in prose.
- `C · Catálogo revisable por área`: every rendered pair per area plus a PR review checklist. 14 rendered pairs and 7 checklists.
- `D · Par canónico y lista de verificación`: B's example count combined with C's checklists. 7 rendered pairs and 7 checklists. **Approved.**

The seven risk areas are fixed across all three formats: form anatomy and errors, action hierarchy and destructive confirmations, operational statuses, Office/Field responsive behavior, map and chart presentation, motion and reduced motion, and the Spanish institutional voice.

Each format states its own coverage gap explicitly, so the cost of the format is visible rather than implied.

## Resolution

**D · Par canónico y lista de verificación** was approved by the user on 2026-09-03, after A was explicitly rejected and B and C were compared directly. D was introduced during that comparison rather than being one of the three original alternatives: it takes B's example count — the number of rendered pieces the project can realistically keep accurate — and C's checklists, which are text tied to rules and therefore do not go stale when a component changes.

The deciding consideration was that `DESIGN.md` is a Markdown file, so a rendered pair has to become an image, a code block, or a link to a separate page. C's 14 pairs double the amount of visual material that must be regenerated after every token or component change, and it concentrates that cost on the map and chart areas, which are the least settled part of the codebase.

A, B, and C remain in the prototype as comparison history rather than normative guidance.

## Run

```bash
npm run prototype:do-dont
```

```
http://localhost:3018/?examples=A
```

```
http://localhost:3018/?examples=B
```

```
http://localhost:3018/?examples=C
```

```
http://localhost:3018/?examples=D
```

Use the area tabs to move between the seven risk areas; the floating arrows (or the left/right arrow keys) switch format. In `Movimiento`, the rendered examples are interactive: selecting a service opens the detail panel so the approved 280 ms travel can be compared against the rejected bouncy, looping alternative.

## What to decide

Judge whether the examples are specific enough to guide implementation without turning `DESIGN.md` into an exhaustive component catalog. Useful questions: does the format prevent the mistakes that would actually reach a PR? Does it stay accurate when a component changes? Can a reviewer point at it during review? Choose the format that should govern every future example, not the individual examples themselves.
