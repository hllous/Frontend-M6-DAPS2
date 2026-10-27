# Visual verification — detail

Skeleton lives in `AGENTS.md`. Green unit and e2e tests do not prove a UI works: look at the page. Do this for every UI change before asking for review, and again after each fix.

Deterministic assertions belong in `@playwright/test` (`pnpm test:e2e`). This guide is for looking at the running app with `playwright-cli`, which is installed per user, not per project:

```bash
npm install -g @playwright/cli@latest
npx skills add microsoft/playwright-cli@playwright-cli -g -y
```

The skill documents every command. Only the parts that are specific to this repo are below. To measure what a screenshot cannot show (slowness, memory, Lighthouse audits), see [`browser-diagnostics.md`](browser-diagnostics.md).

## Run the app

Start the mock-backed server on a free port (see [`e2e-local-debugging.md`](e2e-local-debugging.md) for the env vars and for killing the server on Windows):

```bash
M6_AUTH_MODE=mock NEXT_PUBLIC_DISABLE_MSW=true pnpm dev --port <port>
```

## Open the browser with Edge

On this Windows setup Chrome is not installed and the CLI's default Chromium download is missing, so a bare `playwright-cli open` fails with "Chromium distribution 'chrome' is not found". Edge works:

```bash
playwright-cli -s=<name> open http://127.0.0.1:<port>/login --browser=msedge
```

Use a distinct `-s=<name>` per worker so parallel sessions do not collide, and `playwright-cli -s=<name> close` when done.

## Log in through the form

Read the snapshot, pick a scenario, then click "Ingresar al sistema". The page lands on `/app`. Use element refs from the snapshot (`e12`, `e14`), which change between pages.

## Check both viewports

```bash
playwright-cli -s=<name> resize 1440 900
playwright-cli -s=<name> screenshot --filename=.playwright-cli/desktop.png
playwright-cli -s=<name> resize 390 844
playwright-cli -s=<name> screenshot --filename=.playwright-cli/mobile.png
```

Open the images and inspect them yourself. List their paths in the review request. `.playwright-cli/` is git-ignored, so they stay uncommitted.

## Wait for the dev server to compile

`next dev` compiles a route on its first visit. A screenshot taken right after navigating shows skeleton boxes and a "Compiling…" badge, not the page. Run `snapshot` (or `find "<text you expect>"`) first and screenshot only once the real content is there; if it is not, wait a few seconds and `reload`.

## Dev-only artifacts

The Next.js dev badge (the round "N" in the bottom-left corner) overlaps the first tab of the mobile bottom navigation. It does not exist in a production build: do not report it as a layout bug.

## Console

`playwright-cli -s=<name> console error` lists console errors for the current page. A 404 there usually means the URL you typed does not exist, not that the app is broken: check the route first.
