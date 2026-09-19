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
- After editing, open the page in a browser at a width above 760 px and again at or below it. Controls must measure 40 px in the first case and 48 px in the second, and neither view may scroll the body horizontally. This check is required, because a file-level review cannot see a missing media query.

An automated design-lint pass is a useful supplement where that tooling is available locally, but it lives under `.claude/skills/`, which this repository does not vendor. Do not treat it as a gate.

The comparison prototype that produced this decision is at `src/app/prototype/do-dont/`. It is throwaway history and carries no authority.
