---
name: po-preview-before-ui-merge
description: Show the PO a UI change (dev-server link + screenshots) and get an OK before merging; dashboard/Tableros always
metadata:
  type: feedback
---

On 2026-11-04 the PO said "before merging the dashboard ui, you shall show it to me." Even with "merge it yourself" in effect, a PR that visibly changes a screen (Tableros #849 phase 2, #861–#865, above all) is merged only after the PO has looked at it and said OK.

**Why:** the PO judges UI by trying it. In the same wave they rejected the "Conexiones con otras áreas" copy only after seeing it live, and approved #857 and #858 only after trying them on the worker's dev server.

**How to apply:** when a UI worker reports green CI, keep its dev server running and send the PO the `http://localhost:<port>/<route>` link, the profile to log in with, what to try, and the screenshot paths. Merge after the OK (see [[pr-merge-by-user]]). Copy-only or test-only PRs can merge directly.
