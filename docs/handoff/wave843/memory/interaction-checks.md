---
name: interaction-checks
description: "Workers and coordinator must exercise UI interactions like a user (real mouse/touch), not just screenshots or locator.click on inner buttons"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 02e5c841-118a-4d00-aeb7-778e0837614b
  modified: 2026-10-30T19:39:15.339Z
---

Every UI fix must be verified by driving the interaction the way a person does: `page.mouse.click(x, y)` on the visible target, real touch via CDP for drag, plus keyboard. Screenshots alone are not proof. e2e for a clickable row must click a plain cell, not the stretched inner button.

**Why:** On 2026-10-21 the PO found catalog rows in #660/#662 unclickable even though CI and screenshots were green. The e2e clicked the inner button directly, which hid the bug. The PO asked: "They should run playwright checks as feedback loops."
**How to apply:** Put this rule in each worker spec (it is in `.orca/tmp/critique/fix-common.md` step 3). Before telling the PO a PR is ready, the coordinator runs one real-input check per PR on its port. playwright-cli needs `--browser msedge` on this machine because Playwright's Chrome is missing. Playwright hides scrollbars by default (`--hide-scrollbars`), which hides layout shift caused by a classic Windows scrollbar appearing or disappearing. For drift checks, launch with `ignoreDefaultArgs: ['--hide-scrollbars']` (script: `.orca/tmp/coord/drift.cjs`). Dev servers left by earlier sessions or released workers often hang: probe with `curl -m 15 /login` and restart before giving the PO a link. See [[orca-single-waiter]].

2026-10-30: the PO found the "Tipo de residuo" dropdown on `/consulta/puntos-verdes` (#765) opening under the Leaflet map. The worker's screenshots and my review only showed the dropdown closed. Worker specs (`.orca/tmp/impl-wave6/common.md`, real-input step) now require opening every dropdown, popover and dialog, screenshotting it open and clicking an option, especially near a map. The coordinator's own check must open them too. A Leaflet map wrapper needs `isolation: isolate`, as the other maps in the app have.
