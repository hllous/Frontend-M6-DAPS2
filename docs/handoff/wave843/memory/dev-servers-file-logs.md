---
name: dev-servers-file-logs
description: "Dev servers started inside a worker's terminal freeze once that worker is released; the coordinator must start review servers with logs written to a file"
metadata:
  node_type: memory
  type: project
  originSessionId: 02e5c841-118a-4d00-aeb7-778e0837614b
  modified: 2026-10-29T00:59:44.170Z
---

On Windows, a `next dev` started inside an Orca worker terminal freezes once the worker is released and its terminal closes. The port stays open but no request gets an answer. This happened on 4612, 3101, 3103, 3104 and 3106 on 2026-10-21.

**Why:** The PO repeatedly got dead localhost links ("why are we always debugging localhosts that do not work?").
**How to apply:**
- The coordinator starts every review server itself, with logs redirected to a file, as a background task: `M6_AUTH_MODE=mock NEXT_PUBLIC_DISABLE_MSW=true pnpm exec next dev -p <port> > .orca/tmp/review/dev-<port>.log 2>&1`. Without those two flags, MSW in the browser intercepts requests before Playwright route interception or fault injection, which breaks e2e and delayed-loading checks (docs/agents/e2e-local-debugging.md). This happened on 2026-10-28 and every server had to be restarted.
- Worker specs say: "server already running, do not kill or restart it; stop any server you start before worker_done".
- Mock fixtures live in the dev server's memory, and the Servicios e2e specs that change data (assign, cancel, complete) leave them changed. A second full e2e run on the same server fails on stale state. Since #784 (2026-10-31) a worker resets its own server's mock data with `POST /api/mock/reset` (mock mode only; see docs/agents/e2e-local-debugging.md) instead of asking the coordinator for a restart.
- After releasing a worker, probe its PR's port.
- Before giving the PO a link, open it in a real browser.
- See [[interaction-checks]].
