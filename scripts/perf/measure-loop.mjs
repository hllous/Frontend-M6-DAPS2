#!/usr/bin/env node
// Times every step of the development loop N times and writes raw JSON.
// Usage: node scripts/perf/measure-loop.mjs --out docs/perf/baseline-<date>.json [--runs 3] [--port 4311] [--steps a,b]
// Docs: docs/agents/measuring-the-loop.md
import { spawn, spawnSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readArg } from "./cli-args.mjs";
import { parsePlaywrightOutput, parseVitestOutput } from "./result-parsers.mjs";
import { isDescendantOf, killPid, killTree, listeningPids, processParents } from "../dev/server-process.mjs";
import { DEV_SERVER_ENV } from "../dev/server-config.mjs";

const ALL_STEPS = [
  "worktree-setup",
  "dev-server-ready",
  "typecheck-cold",
  "typecheck-warm",
  "lint-cold",
  "lint-warm",
  "verify",
  "serial-checks",
  "vitest-full",
  "e2e-focused",
  "e2e-full",
  "build",
];
const FOCUSED_SPECS = ["e2e/services.spec.ts", "e2e/accessibility.spec.ts"];
const DEV_ENV = { M6_AUTH_MODE: "mock", NEXT_PUBLIC_DISABLE_MSW: "true" };
const SERIAL_CHECKS = [
  { name: "typecheck", command: "npm run typecheck" },
  { name: "lint", command: "npm run lint" },
  { name: "vitest", command: "npm run verify:tests" },
];
const isWin = process.platform === "win32";

const runs = Number(readArg(process.argv, "runs", "3"));
const port = Number(readArg(process.argv, "port", "4311"));
const out = readArg(process.argv, "out");
const steps = readArg(process.argv, "steps", ALL_STEPS.join(",")).split(",");
const root = process.cwd();
if (!Number.isSafeInteger(runs) || runs < 3) throw new Error("--runs must be an integer of at least 3");
if (!out) throw new Error("--out <file.json> is required");
for (const s of steps) {
  if (!ALL_STEPS.includes(s)) throw new Error(`unknown step ${s}; valid: ${ALL_STEPS.join(", ")}`);
}

const git = (args) => execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
const meta = {
  commit: git("rev-parse HEAD"),
  branch: git("rev-parse --abbrev-ref HEAD"),
  date: new Date().toISOString(),
  machine: {
    os: `${os.type()} ${os.release()}`,
    cpuCores: os.cpus().length,
    cpuModel: os.cpus()[0]?.model,
    node: process.version,
  },
};
const results = [];

function record(step, run, seconds, extra = {}) {
  const row = {
    step,
    run,
    seconds: Number(seconds.toFixed(2)),
    commit: meta.commit,
    date: new Date().toISOString(),
    machine: meta.machine,
    ...extra,
  };
  results.push(row);
  console.log(`${step} run ${run}: ${row.seconds}s exit=${extra.exitCode ?? "-"} ${extra.detail ?? ""}`);
  writeFileSync(out, JSON.stringify({ meta, results }, null, 2) + "\n");
}

function timed(command, { env = {}, cwd = root } = {}) {
  const t0 = process.hrtime.bigint();
  const r = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    env: { ...process.env, ...env },
    maxBuffer: 1 << 28,
  });
  const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
  return {
    seconds,
    exitCode: r.status,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    output: `${r.stdout ?? ""}\n${r.stderr ?? ""}`,
  };
}

function parseCommandJson(output, label) {
  const jsonLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reverse()
    .find((line) => line.startsWith("{") && line.endsWith("}"));
  if (!jsonLine) throw new Error(`${label} command did not print a JSON object`);
  return JSON.parse(jsonLine);
}

function timedCommandRunner(step, command, prepare = () => {}) {
  return (run) => {
    prepare();
    const result = timed(command);
    record(step, run, result.seconds, { exitCode: result.exitCode });
  };
}

async function stopDevServer(child, portOwnerPid) {
  const parents = processParents();
  const owners = new Set([
    portOwnerPid,
    ...listeningPids(port).filter((pid) => isDescendantOf(pid, child.pid, parents)),
  ].filter(Number.isInteger));
  for (const pid of owners) killPid(pid);
  killTree(child.pid);

  const deadline = Date.now() + 5_000;
  for (;;) {
    const remaining = listeningPids(port);
    if (!remaining.length) return;
    if (Date.now() > deadline) {
      throw new Error(`port ${port} is still in use after stopping spawned server; pid(s): ${remaining.join(", ")}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function startDevServer() {
  const existingPids = listeningPids(port);
  if (existingPids.length) throw new Error(`port ${port} is already in use by pid(s) ${existingPids.join(", ")}`);
  rmSync(path.join(root, ".next"), { recursive: true, force: true });
  const t0 = process.hrtime.bigint();
  const child = spawn(`npx next dev --port ${port}`, {
    cwd: root,
    shell: true,
    env: { ...process.env, ...DEV_SERVER_ENV },
    stdio: "ignore",
    detached: !isWin,
  });
  const deadline = Date.now() + 300_000;
  try {
    for (;;) {
      if (child.exitCode !== null) throw new Error(`dev server process exited before readiness with code ${child.exitCode}`);
      if (Date.now() > deadline) throw new Error("dev server not ready in 300 s");
      let html = "";
      try {
        const res = await fetch(`http://127.0.0.1:${port}/login`, { redirect: "manual" });
        html = res.status === 200 ? await res.text() : "";
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        // The server has not started listening yet.
      }
      if (html.includes("</html>")) {
        const parents = processParents();
        const owners = listeningPids(port);
        const ownerPid = owners.find((pid) => isDescendantOf(pid, child.pid, parents));
        if (ownerPid !== undefined) {
          return { child, seconds: Number(process.hrtime.bigint() - t0) / 1e9, portOwnerPid: ownerPid };
        }
        if (owners.length) {
          throw new Error(`GET /login rendered, but port ${port} belongs to pid(s) ${owners.join(", ")}, not spawned process ${child.pid}`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } catch (error) {
    try {
      await stopDevServer(child);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "dev server startup and cleanup failed");
    }
    throw error;
  }
}

async function playwrightStep(step, run, args) {
  const { child, portOwnerPid } = await startDevServer();
  try {
    const r = timed(`npx playwright test ${args} --reporter=json`, {
      env: { PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${port}` },
    });
    const testResults = parsePlaywrightOutput(r.stdout);
    const detail = [
      `${testResults.passed} passed`,
      `${testResults.failed} failed`,
      testResults.flaky ? `${testResults.flaky} flaky` : null,
      testResults.skipped ? `${testResults.skipped} skipped` : null,
    ].filter(Boolean).join(", ");
    record(step, run, r.seconds, { exitCode: r.exitCode, detail, testResults });
  } finally {
    await stopDevServer(child, portOwnerPid);
  }
}

const stepRunners = {
  "worktree-setup"(run) {
    const dir = path.resolve(root, "..", `perf-setup-${process.pid}-${run}`);
    const t0 = process.hrtime.bigint();
    execSync(`git worktree add --detach "${dir}" HEAD`, { cwd: root, stdio: "ignore" });
    const r = spawnSync("npm ci --no-audit --no-fund", { cwd: dir, shell: true, stdio: "ignore" });
    const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
    record("worktree-setup", run, seconds, {
      exitCode: r.status,
      detail: "git worktree add + npm ci (warm npm cache)",
    });
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    } catch (error) {
      console.warn(`could not remove ${dir}: ${error.code}; remove it by hand`);
    }
    spawnSync("git worktree prune", { cwd: root, shell: true });
  },
  async "dev-server-ready"(run) {
    rmSync(path.join(root, ".next"), { recursive: true, force: true });
    const start = timed(`npm run dev:server -- start --port ${port} --json`);
    if (start.exitCode !== 0) throw new Error(`managed dev server failed to start: ${start.output}`);

    const server = parseCommandJson(start.stdout, "managed dev server start");
    const stop = timed(`npm run dev:server -- stop --port ${port} --json`);
    let stopResult = null;
    if (stop.exitCode === 0) stopResult = parseCommandJson(stop.stdout, "managed dev server stop");
    record("dev-server-ready", run, server.readySeconds, {
      exitCode: stop.exitCode === 0 && stopResult?.stopped ? 0 : 1,
      detail: `cold .next to GET /login rendered; warmed ${server.warmedRouteCount} main page routes`,
      serverPid: server.serverPid,
      portOwnerPid: server.pid,
      warmSeconds: server.warmSeconds,
      warmFailureCount: server.warmFailureCount,
      startCommandSeconds: start.seconds,
      warmedRouteCount: server.warmedRouteCount,
      portFreeAfterStop: stopResult?.stopped === true,
    });
    if (stop.exitCode !== 0 || !stopResult?.stopped) {
      throw new Error(`managed dev server did not stop cleanly: ${stop.output}`);
    }
  },
  "typecheck-cold": timedCommandRunner("typecheck-cold", "npm run typecheck", () =>
    rmSync(path.join(root, "tsconfig.tsbuildinfo"), { force: true }),
  ),
  "typecheck-warm": timedCommandRunner("typecheck-warm", "npm run typecheck"),
  "lint-cold": timedCommandRunner("lint-cold", "npm run lint", () =>
    rmSync(path.join(root, ".eslintcache"), { force: true }),
  ),
  "lint-warm": timedCommandRunner("lint-warm", "npm run lint"),
  verify(run) {
    const r = timed("npm run verify");
    const checks = [...r.output.matchAll(/^(PASS|FAIL) (typecheck|lint|test) \(([\d.]+)s\)\r?$/gm)]
      .map(([, status, name, duration]) => ({
        name,
        status,
        durationSeconds: Number(duration),
      }));
    const detail = checks.length
      ? checks.map(({ name, status, durationSeconds }) => `${name} ${status} ${durationSeconds.toFixed(2)}s`).join(", ")
      : "per-check summary missing";
    record("verify", run, r.seconds, { exitCode: r.exitCode ?? 1, detail, checks });
  },
  "serial-checks"(run) {
    const startedAt = process.hrtime.bigint();
    const checks = SERIAL_CHECKS.map(({ name, command }) => ({ name, ...timed(command) }));
    const vitestCheck = checks.find(({ name }) => name === "vitest");
    let testResults;
    let testSummaryError;
    try {
      testResults = parseVitestOutput(vitestCheck.output);
    } catch (error) {
      testSummaryError = error.message;
    }
    const failedCheck = checks.find(({ exitCode }) => exitCode !== 0);
    const exitCode = failedCheck ? (failedCheck.exitCode ?? 1) : 0;
    const detail = checks
      .map(({ name, seconds, exitCode }) => `${name} ${exitCode === 0 ? "PASS" : "FAIL"} ${seconds.toFixed(2)}s`)
      .join(", ");
    record("serial-checks", run, Number(process.hrtime.bigint() - startedAt) / 1e9, {
      exitCode,
      detail,
      checks: checks.map(({ name, seconds, exitCode }) => ({ name, seconds, exitCode: exitCode ?? 1 })),
      ...(testResults ? { testResults } : { testSummaryError }),
    });
  },
  "vitest-full"(run) {
    const r = timed("npm test -- --reporter=verbose");
    const testResults = parseVitestOutput(r.output);
    record("vitest-full", run, r.seconds, {
      exitCode: r.exitCode,
      detail: `${testResults.passed} passed, ${testResults.failed} failed (${testResults.total} tests, ${testResults.files.passed} files)`,
      testResults,
    });
  },
  "e2e-focused": (run) => playwrightStep("e2e-focused", run, FOCUSED_SPECS.join(" ")),
  "e2e-full": (run) => playwrightStep("e2e-full", run, ""),
  build(run) {
    rmSync(path.join(root, ".next"), { recursive: true, force: true });
    const r = timed("npm run build");
    record("build", run, r.seconds, {
      exitCode: r.exitCode,
      detail: "clean .next build; .next removed before every run",
    });
  },
};

if (!existsSync(path.dirname(path.resolve(out)))) mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
for (const step of steps) {
  for (let run = 1; run <= runs; run++) await stepRunners[step](run);
}
console.log(`\nWrote ${results.length} rows to ${out}`);
