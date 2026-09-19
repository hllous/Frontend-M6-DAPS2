# Palette-only prototype

Second, narrower iteration for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Resolution

Approved on 2026-09-03: **A · Azul institucional**. The prototype remains as the primary comparison source; later design steps must not reopen the palette family without an explicit reason.

## Decision isolated

Choose one **palette family**. The HTML structure, content, typeface, spacing, density, radii, component shapes, status presentation, responsive behavior, and map geometry are shared by all three variants. Only semantic color variables change.

- `A · Azul institucional`: cool navy/blue with restrained coral exceptions.
- `B · Verde territorial`: forest green with earth accents and warm neutrals.
- `C · Petróleo operativo`: slate/petrol with teal actions and amber exceptions.

This controlled comparison intentionally overrides the usual UI-prototype preference for structurally different variants: changing structure would contaminate the palette decision the user asked to isolate.

## Run on its independent port

```bash
npm run prototype:palette
```

Open `http://localhost:3001/?palette=A`. It can run alongside the original Next.js prototype on port 3000 because this prototype uses a small independent static server.

Use the floating arrows or the keyboard left/right arrows to switch palettes. The selected key remains in the URL.

## What to decide

Judge only which color family best supports trust, outdoor/office legibility, civic identity, status comprehension, and calm sustained use. Exact shades and contrast tuning belong to the next iteration after a family wins.

Do not judge or choose navigation, layout, typography, density, radii, badge shape, or map structure from this prototype.
