---
name: no-extra-promotions
description: "if a release promotion issue's PRs are already merged, just close it — never open a new promotion for later commits"
metadata:
  node_type: memory
  type: feedback
  originSessionId: b92ea188-862b-4379-b0b7-724c002dac90
  modified: 2026-10-28T22:43:16.972Z
---

If a promotion issue (develop → test → main) turns out to be already done, i.e. its PRs are merged, only close the issue. Don't open a new promotion issue or PRs for commits that landed later.

**Why:** On 2026-10-28 #716 was already promoted (#717/#718). I opened #725/#726/#727 to promote the newer commits, and the user had me undo it.
**How to apply:** Promote only when the user explicitly asks for a new promotion. When a promotion step is already done, report that and stop.
