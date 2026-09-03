# Design-system prototype — iteration 1

Throwaway comparison surface for [Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12).

## Question

Which visual character should the M6 internal operations product develop before its durable palette, typography, density, component states, and `DESIGN.md` rules are specified?

This iteration deliberately does **not** decide the answer. It holds the validated M6 concepts constant—task-led Spanish copy, operational statuses, a synchronized service queue and map, one clear primary action—and makes three candidate worlds tangible:

- `A · Cívico nítido`: cool civic blue, compact sidebar shell, restrained curves, dense table-first work.
- `B · Territorio vivo`: vegetation and earth accents, warmer canvas, editorial headings, map-first situational framing.
- `C · Sala de señales`: high-contrast slate and teal, squared controls, persistent freshness context, three-pane command-room density.

The Navy/Coral/Inter values from earlier prototypes remain input, not an approved brand commitment. Variant A is their closest descendant; B and C test credible departures.

## Run

```bash
npm run dev
```

Open `http://localhost:3000/prototype/design-system?variant=A`. Use the floating arrows or the keyboard left/right arrows to move through `A`, `B`, and `C`. The switcher is hidden in production builds.

## Evaluation checkpoint

Review the variants at desktop and narrow mobile widths, then answer:

1. Which overall character feels right for an internal Argentine municipal operations product?
2. Which direction gives Office enough density without making Field use feel cold or cramped?
3. Which pieces should be mixed—for example A's shell, B's palette, or C's freshness/status treatment?

Do not finalize `DESIGN.md` until this direction checkpoint is resolved. The next iteration should narrow the chosen world into exact accessible color roles and typography, not redesign the application structure.

## Tool fit

- **Impeccable** is useful here for deterministic anti-pattern checks, bounded visual QA, accessibility, hierarchy, and refinement. It should critique a chosen direction rather than invent product truth. Its full critique workflow requires an available browser and independent assessments.
- **shadcn/ui** is already configured for Next.js, React Server Components, Tailwind CSS v4, Base UI, Lucide, semantic CSS variables, and the `base-nova` style. Keep it as an owned component-source foundation. Do not re-run initialization or adopt a preset until the visual direction is approved; doing so would prematurely overwrite tokens and component styling.
- **Google DESIGN.md / Stitch guidance** is a useful interoperable minimum for semantic visual descriptions and exportable tokens. The project-level `DESIGN.md` must extend that structure with M6-specific operational status semantics, map/chart rules, desktop/field density, responsive behavior, motion, WCAG 2.2 AA requirements, Spanish UX writing, and do/don't examples.

## Verification from this iteration

- `npm run lint`
- `npm run build`
- Impeccable deterministic scan of this route: no findings

Browser screenshot inspection was unavailable in the authoring session and remains part of the human checkpoint.
