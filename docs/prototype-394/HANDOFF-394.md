# Handoff: Issue #394 Services workspace

Updated 2026-10-14 after the product owner chose D and requested three column-editor concepts.

## Worktrees and saved work

- Production: `D:/Uade/2C2026/Desarrollo de Aplicaciones 2/TPO/Frontend-M6-DAPS2/.codex/worktrees/b4-services-a11y`, branch `fix/394-design-a11y`.
- The previously uncommitted production implementation is saved in WIP commit `579cdae` (`wip: save services mobile and period work`). This commit contains 11 implementation/test files. Nothing was pushed. `HANDOFF-394.md`, `review-394/`, and `public/mockServiceWorker.js` were not staged.
- Prototype: `D:/Uade/2C2026/Desarrollo de Aplicaciones 2/TPO/Frontend-M6-DAPS2/.orca/worktrees/Frontend-M6-DAPS2/prototype-394-services-workspace-motion`, branch `hllous/prototype-394-services-workspace-motion`. Commits: `7bdb8ca` (A-C motion comparison), `d5cba50` (D-F motion comparison), and `7b160d2` (WIP D + g/h/i foundation). The generated `public/mockServiceWorker.js` and `review-394-animations/` remain unstaged.
- Port 4314 is still listening (PID 88736). It serves the existing A-F motion prototype, not the new g/h/i column-editor concepts. Keep it running and reuse that port.

## Product-owner decisions and status

### Original Services workspace decisions

- Keep the variant-B interaction: selecting a table row pans to that service's map marker; the preview belongs over/in the table area, never over the map. This base behavior and the original map/table requirements are implemented on the production branch.
- The original acceptance items for one ordinal source, row/marker number correlation, accessible desktop resizing, stable table geometry, row text-selection prevention, in-place map selection/filter/sort updates, calmer no-refit behavior, ascending/descending sort cycle with `aria-sort`, and no unnecessary workspace remount/refetch were implemented and covered before the latest mobile WIP commit. Do not add prototype query handling to production. The planned refit behavior is the calmer option: do not reset a map the user has panned when filters/sort change.
- Still not implemented in production: the newly chosen D motion and the PO's refinements below. The current D-F prototype is reference material and must be updated to the new rules before presenting g/h/i.

### Chosen D motion and refinements

1. D is the motion base: **not yet ported** to production; prototype code now has the D-style overlay motion and adaptive panel sizing, but it is not yet visually re-verified against the latest rules.
2. Row emphasis: prototype CSS now keeps the selected row normal and grays out the other rows; **not yet visually re-verified** against the latest PO rules.
3. Column order must be `#`, `Servicio`, `Estado`, `Zona`, then remaining columns, on desktop and mobile compact rows. **Not yet applied**.
4. Prototype code measures the detail pane and the `#`, `Servicio`, and `Estado` columns before shrinking the map frame; otherwise the preview overlays the trailing table area. The code is present but **not yet visually re-verified**.

### New column editor: prototype and get one PO choice

Build three visibly distinct, keyboard-accessible, Spanish, shadcn-based options behind `?variant=g|h|i` on the prototype branch only. A draft `services-column-editor.tsx` now contains shared preference handling and G/H/I controls, and the workspace has variant URL/switcher wiring; the editor is **not integrated into the table, typechecked, or visually verified**, and no g/h/i recordings or PO ask exist. Reconcile the draft API during integration. All options must reorder columns, resize widths, hide/show columns, persist per user in localStorage with try/catch, and make `#` and `Servicio` non-hideable. Then record a webm for each and send one blocking Orca `ask` with the three signed-out URLs, a neutral one-line description per option, and video paths. Suggested concepts from the PO:

- G: drag headers to reorder, drag header edges to resize, and a `Columnas` checkbox popover.
- H: a `Columnas` panel/sheet with a keyboard-accessible sortable checklist and width presets; no in-header dragging.
- I: an alternative such as a header context menu with keyboard-accessible move-left/right, hide, and reset-width actions.

After the PO chooses, implement that option on production; do not ship `?variant` code.

### Mobile M1-M7 and Periodo B1

The current mobile pass is complete in the WIP commit. The previous dispatch used the M1-M7 shorthand; this handoff records the seven behaviors covered in the code/tests:

- M1: responsive workspace and shell fill a 390px viewport without document-level vertical overflow.
- M2: map remains mounted and visible behind the mobile service-list drawer.
- M3: accessible three-snap list drawer supports peek, half, and full states.
- M4: mobile Services does not switch between Lista/Mapa tabs; the map remains available behind the drawer.
- M5: drawer/list expansion controls are responsive and keyboard operable.
- M6: selecting a service opens a full-workspace preview with its own scroll area.
- M7: preview close/focus restoration, drawer semantics, and inert background are handled; existing non-Services inventory map remains two-state.

B1 (Periodo): selecting an explicit period refreshes the workspace in place, preserving the map/table DOM and scroll and avoiding an unnecessary count fetch. **Implemented and covered by `services-workspace-period.test.tsx`.**

## #394 checklist outside the newly chosen interaction

The existing production branch also carries the prior fixes for the issue's planning-dialog/accessibility items: FormControl use, error associations, stable pending submit labels/widths, DESIGN tokens/palette, visible file-input focus, RESCHEDULED primary-action cleanup, focus restoration, landmark/live-region cleanup, and workspace style/breakpoint issues. The remaining work is the D refinements and column editor described above, followed by the final full acceptance pass and PO review.

## Relevant code and evidence

Production paths:

- Workspace/layout, selection and period refresh: `src/components/services/services-workspace.tsx`, `src/components/services/services-workspace.module.css`.
- Mobile drawer: `src/components/map/inventory-map-drawer.tsx`, `src/components/map/inventory-map-drawer.module.css` and `src/components/map/inventory-map-drawer.test.tsx`.
- Preview: `src/components/services/service-preview.tsx`.
- Period tests: `src/components/services/services-workspace-period.test.tsx`.
- Browser coverage: `e2e/services.spec.ts`, `e2e/accessibility.spec.ts`.
- Desktop/mobile screenshots: `review-394/` (untracked evidence; do not stage by default).
- Latest D baseline screenshots: `review-394/d-before-desktop-closed.png`, `d-before-desktop-selected.png`, `d-before-mobile-closed.png`, and `d-before-mobile-selected.png`. These are pre-fix evidence only; after screenshots still need capture and manual inspection.
- Motion prototype recordings/screenshots/checks: `review-394-animations/` in the prototype worktree, including `variant-a.webm` through `variant-f.webm`, open/closed PNGs, `verification.json`, and recording/reduced-motion scripts. These are for the earlier D-F round, not the pending g/h/i comparison.

## Checks already run

On the production branch before the latest WIP commit: `npm run typecheck` passed; ESLint with `.agents/**` and `.claude/**` ignored passed (0 errors, 3 pre-existing `window.location.assign()` warnings); full Vitest passed (167 files, 1,614 tests); Services and accessibility Playwright passed (29 tests) on a freshly restarted server; `git diff --check` passed; the Impeccable detector returned `[]`. These checks validate the pre-D-refinement implementation, not future D/editor changes.

On the A-F prototype before its latest commit: typecheck passed; lint passed (0 errors, 2 pre-existing warnings); `src/proxy.test.ts` passed (3 tests); Playwright recordings for A-F completed; reduced-motion check reported 0s computed transitions and no page errors. A-F had older layout behavior and needs the new D refinements before g/h/i are presented.

## Exact next step

The current D + g/h/i prototype foundation is checkpointed on `hllous/prototype-394-services-workspace-motion`; no tests were run for this partial handoff, and port 4314 must stay running. Next, inspect `services-column-editor.tsx`, reconcile its exported API with the table integration, wire G/H/I into `services-table.tsx`, apply the default column order on desktop/mobile, finish D refinements 1-4, and capture/inspect post-change desktop and mobile screenshots while logged in as `office-duty-queue`. Verify the signed-out `http://127.0.0.1:4314/app?destination=services&variant=g` (and `h`, `i`) redirect preserves each variant, record all three webm options, then send one blocking Orca ask and wait for the PO's choice. Port D plus the chosen editor to production, run typecheck, lint, full Vitest, Services desktop + 390px e2e, accessibility e2e, and Impeccable. Keep port 4314 running on the final production branch and send the final signed-out review ask with exact URL, login scenario, 4-6 things to try, and screenshots. Wait for approval before push/PR. PR targets `develop`, and its first body line must be `Issue: #394`; use the `pr` skill, wait for CI, and fix failures.

## Current checkpoint — latest handoff (2026-10-14)

This section supersedes the earlier “not integrated” and “Exact next step” status above. The latest D refinements and G/H/I draft are integrated in the prototype worktree and committed as a WIP checkpoint; the prototype remains unapproved and is not ported to production.

- D: adaptive map/table panel sizing measures the detail pane plus `#`, `Servicio`, and `Estado` columns before shrinking the map; the preview rail stays over the table. Leaflet resize invalidation waits until the panel transition settles. Selected rows remain normal while unselected rows are grayed. The default order is `#`, `Servicio`, `Estado`, `Zona`, then remaining columns, including mobile compact rows.
- G/H/I: editor is now integrated into the table: G uses header drag/resize plus a `Columnas` popover, H uses a `Columnas` sheet, and I uses per-header context menus. Reorder/visibility/width preferences are per user and variant in guarded localStorage; `#` and `Servicio` are fixed. These concepts still need interactive and visual verification, recordings, and the PO choice.
- Verification: prototype `npm run typecheck` exited 0. `git diff --check` passed before the checkpoint. No post-change Playwright screenshots, recordings, lint, Vitest, or e2e have been run. Existing `review-394/` images are before-only baseline evidence; inspect new screenshots at 1440×900 and 390×844 while logged in as `office-duty-queue`.
- Port 4314 remains running (previously PID 88736) and is serving the prototype worktree. Keep it alive.
- Context was used mostly by reading the handoff/spec/coordination material and reviewing the five-file UI implementation/diff; a few baseline screenshots were inspected. No large test logs were read.
- Exact next step: capture and inspect the two post-change viewport sizes; test G/H/I interactions and signed-out redirect preservation for `?variant=g|h|i`; record one webm per option; send one blocking Orca ask with signed-out URLs, neutral descriptions, and video paths. After the PO picks, implement only that editor option plus D on production; then run the requested complete verification and final review ask. No PR or CI exists yet.

## PO review of G/H/I (2026-10-14)

PO decision on the column editor: NONE of G/H/I.
1. Column editing should feel like Excel: resize columns, drag columns to reorder, enable/disable columns. NO icons at all (no 6-dot drag handles, no other icons): direct drag only.
2. Build 3 new options: option 1 = shadcn Data Table (column visibility + resizing + drag reorder); options 2 and 3 = two other approaches of the worker's choice. The column on/off control must sit OUTSIDE the table/map frame, e.g. next to the "Periodo" filter.
3. Gray-out of non-selected rows is too strong: use a lighter gray or a light tint, subtle.
4. The middle map/table resize handle must ALWAYS persist the user's chosen split. Today clicking a row resets it. It must not (including when the details pane opens or closes).
5. When the handle is dragged to maximize the table, a white empty section appears. The table must fill all available space.
6. "Periodo" reloads the page; it must not (verify on the production branch, where B1 was implemented, and in whatever the PO reviews).
7. Feedback loop: verify every point with Playwright before asking the PO.

## PO review of round 2 (2026-10-14)

It is Ok, but there are still some bugs
- column marker for expansion are not centered
- when details pop, gray out area is not available, it does not appear
- Columnas should be instead "Datos", always on columns should not appear in selection, button should be right, not next to "periodo", selection should be like data table in shadcn, use the cli and or skill.
- Dragging the column should drag the "block" of that column, for visual feedback
- There are duplicate texts, remember that duplication or unnecessary information is bad? here the case is duplication, on top of periodo and below "Servicios Urbanos / Buscar servicio, zona o cuadrilla...". "No hay servicios para mostrar en este periodo." in table is fine.
Remember that agent should use playwright for feedback loop, and can spawn subagents if needed

## TanStack dependency approval (2026-10-14)

PO approved @tanstack/react-table for #394 (2026-10-14); production port must add it.

## Checkpoint 4f

- Direction: converged on the single shadcn Data Table option with TanStack; column options 2 and 3 and their switcher were removed.
- Prototype branch: hllous/prototype-394-services-workspace-motion at commit 15d9909; no push; production implementation was not changed.
- Editing: direct header drag reorders the full column block; edge drag and keyboard resize work; Datos toggles optional columns outside the map/table frame.
- Persistence: guarded localStorage is scoped per user; # and Servicio stay fixed; signed-out destination returns to the default option after login.
- Visuals: selected row uses the normal surface and other rows use a subtle tint; closed preview clears selection and keeps the subtle tint on remaining rows.
- Workspace: split stayed at 30/70 through row select, details open/close, and reload; table filled 98.2 percent of the pane at maximum share.
- Periodo: selection updates without a document reload and shows one table empty-state message.
- Verification: Playwright passed at 1440x900 and 390x844; 47 focused Vitest tests passed; TypeScript and ESLint passed.
- Evidence: review-394-animations/round2-single-option.webm plus uncommitted screenshots and JSON; PO was offline, so no blocking ask was sent.

## PO review of round 3 (2026-10-15)

Converged prototype reviewed at ef68d8e. Better, but corrections required (single version, no variants):
1. Rename the "Datos" button/menu to "Categorias" (UI copy with accent: "Categorías").
2. Column drag must show a live preview of the resulting table: the other columns shift into place while dragging. No floating/pop-up column ghost.
3. Sort ("ordenar por") does not work and the header filters cannot be clicked. Fix both, and verify EVERY interactive control end to end before any PO review.
4. Estado filter: its options must show the same status colors as the Estado badges in the table.
5. Orchestrator pre-check findings to fix too: the non-selected-row tint is invisible with details open at 1440x900 (keep it subtle but perceivable); the Estado badge truncates ("Programad") when details are open.
Workers may spawn subagents and must use feedback loops (Playwright, Vitest) before asking the PO.

## Checkpoint round 3 (2026-10-15)

- Convergence: one shadcn/TanStack column editor remains; the button/menu now says `Categorías`.
- Changes: header drag previews the whole table in place with animated column movement; `#` and `Servicio` stay fixed. Delayed pointer capture and a reserved resize edge let sorting and filters work alongside resizing. Sorting cycles ascending, descending, then clear. Estado filter choices reuse the table's status badges, non-selected rows use the canvas tint, and Estado labels stay on one line. The mobile table uses its compact service/status/zone columns.
- Verification: the round 3 Playwright walkthrough passed at 1440x900 and 390x844 with no page errors. It checked all five sortable columns in all three states; zone, status, crew, and schedule filters; every Categorías toggle; pointer and keyboard reorder; desktop pointer and keyboard resize; row selection and details open/close; split resizing and persistence; Periodo without document reload; search; and mobile Lista/Mapa. The 40 focused Services workspace Vitest tests and `npm run typecheck` passed. ESLint exited 0 with two existing warnings outside the Services workspace.
- Evidence: `review-394-animations/round3-single-verification.json` lists control results. The walkthrough recording is `review-394-animations/round3-single-option.webm`; screenshots include `round3-live-drag-preview-1440.png`, `round3-details-open-1440.png`, `round3-workspace-390.png`, and `round3-mobile-map-390.png` in `review-394-animations/`.
- Runtime: `npm run dev -- --port 4314` remains running for PO review.

## PO review of round 4 (2026-10-15)

Round 3 (679da2c) reviewed. Still bugs, single version, no variants:
1. Column drag is buggy: often columns cannot be moved, and when they do move they swap back and forth repeatedly (oscillation). Reorder must be stable: a column changes place once per crossed midpoint, never flickers.
2. Servicio must be movable too (supersedes "# and Servicio stay fixed"; only # stays fixed).
3. Resize: the grabbed line does not match where the user drops it. The resize line must follow the cursor horizontally, 1:1, at every pane size.
4. Layout across sizes: use `impeccable` adapt to make the table/editor behave at different viewport and pane sizes (likely root cause of 1 and 3).
5. Fixed row height: when filters leave too few rows to fill the table, rows must keep their normal height and leave empty space below; rows must never stretch.
Out of this ticket (PO, for the orchestrator): skeleton loaders with shadcn wherever something loads (separate issue, alongside #520 TanStack).

## Checkpoint round 4

- Changes in progress on the prototype branch: drag targets use one stable midpoint snapshot with 6 px hysteresis; starting a drag clears any active FLIP transforms before measuring. Only `#` is fixed, including `Servicio`; keyboard movement follows the visible column order. The resize handle uses the measured marker position and width-to-pixel slope, and the table disables column width transitions while resizing. Removing table fill height classes keeps filtered rows at their normal height.
- Round 4 walkthrough passed at 1440x900 and 390x844 with no browser errors. It recorded 382/63/97/145 incremental desktop drag steps, tested Servicio in both directions, and checked pointer-to-marker tracking at both split positions and with details open; worst measured error was 1.97 px. Filtered row heights matched their own unfiltered baselines for one or two rows; desktop left 451 px below the rows and mobile left 16 px in its shorter drawer.
- Checks passed: `npm run typecheck`; `npx eslint . --ignore-pattern '.agents/**' --ignore-pattern '.claude/**'` (0 errors, 2 existing warnings); focused Services Vitest (14 files, 127 tests); `git diff --check`. Manual inspection covered mid-drag, mid-resize, details-open, mobile resize, and filtered-row screenshots. Walkthrough evidence: `review-394-animations/round4-single-option.webm` and `review-394-animations/round4-single-verification.json`.
- Impeccable adapt review: active drag now cancels animated transforms before collecting layout positions, dense resize hit areas remain touch-sized, and resize disables the 420 ms column-width transition. The detector still reports the existing variant-A preview-collapse `transition: width 420ms` at `services-workspace.module.css:129`; preserve this preview animation, and it is suppressed while resizing.
- Remaining: verify that maximizing the table keeps its pane filled with the normal table surface below the fixed-height rows; complete markdown/link checks after this note; run the final acceptance pass, update this checkpoint, commit and push only the intended files, and confirm port 4314 remains live.

### Final verification (2026-10-15)

This update supersedes the interim remaining checklist above. All five PO round 4 items are implemented and verified on `hllous/prototype-394-services-workspace-motion`; no dependency was added.

- Drag root cause and fix: FLIP transforms made `getBoundingClientRect()` return animated header positions when another drag began. The handler now clears active transforms before taking stable header midpoints, uses a 6 px hysteresis band, advances one target per crossed midpoint, and listens for pointer movement/up/cancel on `window`. `Servicio` moves in either direction; `#` is the only fixed column. Script assertions record each step, forbid A-B-A movement, compare the live body order with the preview, and require the drop to equal the final preview.
- Resize root cause and fix: a 420 ms CSS width transition delayed the edge while resizing. The handle now uses the measured marker position and local width-to-pixel slope; column transitions are disabled during the gesture. The line stayed within 1.97 px of the pointer at all tested steps and release points (desktop, both split positions, details open, and mobile). The dense handle keeps a 44 px touch target.
- Fixed rows and pane fill: filtered desktop and mobile rows matched each service's unfiltered height. At maximum split the table filled 98.17% of the pane width; its scroll surface filled the 820 x 630 pane, the surface and table backgrounds matched, and two rows left 494.7 px below them. The 390 x 844 drawer kept 16 px below two rows without stretching.
- Round 4 walkthrough: PASS, 15 control groups, no browser errors. It covered sort states for each sortable column, every header filter and Categorias toggle, Estado colors, keyboard editing, row selection/details, both split positions and persistence, Periodo without reload, search, tint, mobile Lista/Mapa, and per-user preferences. Stepwise drag paths included 382, 63, 97, 145 desktop steps and 171 mobile steps; Servicio moved both ways on desktop.
- Check results: `npm run typecheck` PASS; `npx eslint . --ignore-pattern '.agents/**' --ignore-pattern '.claude/**'` PASS with 0 errors and 2 existing warnings in `foundation-demo.tsx` and `session-client.ts`; `npx vitest run src/components/services` PASS (14 files, 127 tests); `npx --yes markdownlint-cli2@0.23.3` PASS (0 issues); `lychee --config lychee.toml '*.md' 'docs/**/*.md' '.github/*.md'` PASS (140 OK, 0 errors, 74 excluded); `git diff --check` PASS; `node --check docs/prototype-394/record-round4-single.mjs` PASS.
- Impeccable adapt was applied to compact and variable pane sizes. The detector reports one existing variant-A preview-collapse `transition: width 420ms` at `services-workspace.module.css:129`; it remains for the preview animation and is disabled during resize.
- Evidence: `review-394-animations/round4-single-option.webm`; step frames `round4-mid-drag-1440.png`, `round4-mid-resize-1440.png`, `round4-details-open-mid-drag-1440.png`, `round4-mid-resize-details-open-1440.png`, `round4-mobile-mid-drag-390.png`, `round4-mid-resize-390.png`; filtered rows `round4-filtered-rows-1440.png` and `round4-filtered-rows-390.png`; the JSON lists all walkthrough screenshots and measurements at `review-394-animations/round4-single-verification.json`.
- Runtime: port 4314 is still served by PID 17692 from this worktree. Commits `b8ae87f` and `c0678e9` are pushed to this branch; no PR was created. `public/mockServiceWorker.js` remains untouched by these commits, and `review-394-animations/` remains untracked evidence.

## Orchestrator pre-check of round 4 (2026-10-15, before PO review)

Pass: stepwise slow and fast header drags reorder with zero A-B-A flips, Servicio is movable, # stays fixed; one-row search keeps row height (62 -> 61.5 px) and the table area still fills the pane.
Fail, item 3 (resize must follow the cursor 1:1):
- At 1440x900 default split, map open, widening Estado follows the pointer for only +18 px, then the column stops while the pointer keeps moving (50+ px gap). Narrowing Zona stops after 8 px. Cause: all columns sit near their minimum widths, so the fixed-width table has no room to redistribute.
- The resize marker's center sits about 11 px left of the real column boundary (th right edge); round 2 asked for centered markers.
Expected (PO round 1: "feel like Excel"): resizing never stalls before a sane per-column minimum; widening pushes the following columns right and the table pane scrolls horizontally when columns exceed its width (no squeezing of other columns, no clamp at the pane width). The marker is centered on the column line. The marker and the column edge track the pointer within 2 px on every step until the column's own minimum is reached.

## Checkpoint round 4b

- State: commit `cca67ad` contains the resize implementation and adapted browser harness. Port 4314 is running from this worktree (npm PID 17248; listener PID 28132). Review folders remain untracked.
- Reproduced before the fix with the saved a32c4a3 table: at 1440x900/default split, Estado +80 px drifted 41.89 px (15/20 steps over 2 px), Zona -60 px drifted 33.23 px (15/15 over 2 px), and the marker was 1 px off center. Details-open peak drift was 59 px; horizontal scroll was only 572 px against a 571 px pane. Full trace: `review-394-animations/round4b-before-trace.json`.
- After pixel sizing, the same 175 steps across default, details-open, both split positions, and 390x844 stayed within 1 px for the edge and marker, with zero steps over 2 px. The default table scrolls to 1028 px in a 571 px pane; `#` is sticky at a 0 px offset. Trace: `review-394-animations/round4b-trace.json`.
- The code commit uses persisted pixel column widths, a pane-filling table with a trailing filler, a resize-time width floor to prevent scroll anchoring from moving the active edge, and a sticky `#` column. `npm run typecheck` passes. The full recorded walkthrough returned exit 0, but its mobile service-selection expansion assertion still needs to be restored; do not treat that walkthrough as final acceptance yet.
- Next: confirm the drawer is at `half` immediately before selecting a service, then assert the selection moves it to `full` using the drawer's actual `data-snap` and visible handle position (the old whole-drawer height comparison is not a valid snap signal). If it does not move, report that as a possible regression. Then inspect `round4b-mid-resize-1440.png`, `round4b-horizontal-scroll-1440.png`, and `round4b-mobile-390.png`; rerun the full walkthrough, ESLint, focused Services Vitest, script syntax, Markdown lint/link checks; commit the checkpoint and any follow-up, push this branch, and leave the server on port 4314 running.
