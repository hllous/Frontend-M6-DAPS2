# Typography reconsideration prototype

Fifteenth focused iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Why this decision reopened

The earlier Inter approval was reopened by the user on 2026-09-03 because its ubiquity weakens the product's visual identity. The original seven-family comparison remains unchanged as historical evidence. This narrower round compares three purposeful replacements inside the now-approved M6 palette, type scale, density, spacing, geometry, navigation, and status system.

## Resolution

Approved by the user on 2026-09-03: **A · Archivo**. It supersedes the earlier Inter decision and becomes M6's single production interface family. Archivo was chosen for its locally resonant civic character and sturdy operational voice without sacrificing readability or density.

Rendered verification covered 1440×1000 desktop and 390×844 mobile layouts, actual weights 400/500/600/700, long Spanish service and address strings, identifiers, tabular numerals, font fallback, and a 200%-equivalent responsive path. All three candidates remained usable; Archivo provided the strongest product fit. IBM Plex Sans was the most technical and slightly more space-efficient, while Atkinson Hyperlegible Next offered the strongest character differentiation with the greatest mobile wrapping cost.

## Decision isolated

Choose the single production UI family. Only `font-family` changes:

- `A · Archivo`: compact grotesk from Buenos Aires foundry Omnibus-Type; locally resonant, efficient in operational tables, and distinctive without becoming expressive. **Approved.**
- `B · IBM Plex Sans`: engineered, precise, and strong around identifiers and tabular data; carries a more technical operations-room character.
- `C · Atkinson Hyperlegible Next`: accessibility-led character differentiation and excellent small-text recognition; widest option, so dense tables and long Spanish labels need the most care.

## Run

```bash
npm run prototype:typography-reconsideration
```

Open `http://localhost:3014/?type=A`. Use the floating arrows or keyboard left/right arrows.

## Comparison criteria

The decision considered Spanish readability, scan speed, long-place-name fit, identifier and numeral clarity, civic/operational character, and whether the family feels recognizably M6 without calling attention to itself. The already-approved sizes, weights, spacing, colors, radii, and layout remained fixed.

Google Fonts is used only to make this throwaway comparison easy to run. The approved production family will be self-hosted with only the required weights and a stable system fallback stack.
