# UI components — detail

Skeleton lives in `AGENTS.md` (shadcn-first). This guide holds the rules that only matter when you touch overlays or the lint suppressions.

## Shared overlay paint rule

Applies to dialogs, sheets, drawers, popovers, dropdowns and tooltips:

- Keep translucent flat backdrops static, without backdrop blur.
- Animate panels with opacity and transform/translate only, and popups with opacity only.
- Keep shadows static.
- Scope `will-change` to an active transition.
- Disable overlay motion independently for reduced-motion users and detected software renderers.
- Keep resize work event-driven and out of per-frame layout loops.

## Suppression ownership

`eslint-suppressions.json` entries for raw tables belong to [#520](https://github.com/hllous/Frontend-M6-DAPS2/issues/520), and entries for loading states (skeletons) to [#525](https://github.com/hllous/Frontend-M6-DAPS2/issues/525). Leave them to those tickets rather than fixing them in unrelated work.
