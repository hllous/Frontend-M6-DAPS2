# Design examples

Normative do/don't examples for the M6 design standard. The rules live in [`DESIGN.md`](../../../DESIGN.md); this directory makes them verifiable.

`index.html` is a self-contained page — no build step, no dependencies. Open it directly in a browser.

It carries one canonical do/don't pair and one PR review checklist for each of the seven risk areas, in the approved `Par canónico y lista de verificación` format:

1. Form anatomy and errors
2. Action hierarchy and destructive confirmations
3. Operational statuses
4. Office/Field responsive behavior
5. Map and chart presentation
6. Motion and reduced motion
7. Spanish UX writing

## Rules for changing this page

- `DESIGN.md` is normative. When the page and the standard disagree, the standard wins and the example is corrected.
- Change an example in the same commit as the rule it illustrates.
- Keep exactly one pair per area. Adding a second means revisiting the approved format, not editing this page.
- After editing, the page must report zero anti-patterns:

```bash
node .claude/skills/impeccable/scripts/detect.mjs docs/design/examples/index.html
```

The comparison prototype that produced this decision is at `src/app/prototype/do-dont/`. It is throwaway history and carries no authority.
