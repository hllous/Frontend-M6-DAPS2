# Browser diagnostics — detail

Skeleton lives in `AGENTS.md`. [`visual-verification.md`](visual-verification.md) covers looking at a change with `playwright-cli`; this guide covers measuring and diagnosing what a screenshot cannot show, with the `chrome-devtools` CLI (package `chrome-devtools-mcp`) and its `chrome-devtools-cli` skill. Load that skill for the command reference; `chrome-devtools <command> --help` is the source of truth for flags.

## Pick the tool

| Question | Tool |
| --- | --- |
| Does it look right at 1440x900 and 390x844? | `playwright-cli` ([visual verification](visual-verification.md)) |
| Why is it slow or janky (dialog opening, scrolling, typing)? | `chrome-devtools` performance trace |
| Does the page shift or load slowly? Accessibility, best practices? | `chrome-devtools lighthouse_audit` |
| Does memory grow across navigation or open/close cycles? | `chrome-devtools` heap snapshots |
| What threw, with source maps, at the moment it failed? | `chrome-devtools` console and `evaluate_script` |

Run the app as in [visual verification](visual-verification.md#run-the-app) and point the CLI at `http://127.0.0.1:<port>`.

## Setup on a new machine

```bash
npm i chrome-devtools-mcp@latest -g
npx skills add chromedevtools/chrome-devtools-mcp@chrome-devtools-cli -g -y
```

The background server starts on the first command and reads a global config file, `%LOCALAPPDATA%\Google\cd4a\config.json` on Windows (`~/.config/cd4a/config.json` elsewhere). Create it with these values:

```json
{
  "executablePath": "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "isolated": true,
  "performanceCrux": false,
  "usageStatistics": false,
  "allowUnrestrictedPaths": false
}
```

- `executablePath`: Chrome is not installed on the dev machine; Edge is. Drop the key where Chrome stable is installed.
- `isolated`: a temporary profile per run, so parallel workers do not share browser state.
- `performanceCrux` and `usageStatistics` off: by default the CLI sends traced URLs to Google's CrUX API and usage statistics to Google.
- `allowUnrestrictedPaths` off: file-saving commands write only to the OS temp directory.
- Write paths with forward slashes; a single backslash makes the file invalid JSON and the server refuses to start.

`chrome-devtools status` shows whether the server is running; `chrome-devtools stop` ends it when you finish.

## Measure performance

1. Throttle the CPU to approximate a slow machine: `emulate <pageId> --cpuThrottlingRate 4`. Each `emulate` call replaces the previous settings, so pass them all at once.
2. To reproduce a browser without hardware acceleration, restart the server with `chrome-devtools start --chromeArg=--disable-gpu`; the config file still applies.
3. Trace the interaction: `performance_start_trace`, perform it (open the dialog, scroll the list), `performance_stop_trace`. Read the reported insights with `performance_analyze_insight` and change only what they show is expensive.
4. Save traces with `--filePath` under the OS temp directory, then copy the ones you cite into the worktree's `.playwright-cli/` (git-ignored) and list them in the PR.
5. Measure before (`origin/develop`) and after (your branch) the same way, and report both numbers. Timings from a dev server under `next dev` are relative evidence, not absolute ones.

## Other diagnostics

- **Lighthouse:** `lighthouse_audit <pageId> --mode navigation` for load, layout shift and accessibility; `--mode snapshot` audits the current state of the page (an open dialog). Accessibility findings complement, not replace, the `@axe-core/playwright` checks in the e2e suite.
- **Memory:** restart with `--memoryDebugging=true`, take a heap snapshot, repeat the interaction a few times, take another and compare them. Steady growth across identical cycles is the leak signal.
- **Runtime errors:** read the console after reproducing the failure; a 404 usually means a wrong URL, as in [visual verification](visual-verification.md#console).
