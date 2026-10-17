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

const ALL_STEPS = [
  "worktree-setup",
  "dev-server-ready",
  "typecheck-cold",
  "typecheck-warm",
  "lint-cold",
  "lint-warm",
  "vitest-full",
  "e2e-focused",
  "e2e-full",
  "build",
];
const FOCUSED_SPECS = ["e2e/services.spec.ts", "e2e/accessibility.spec.ts"];
const DEV_ENV = { M6_AUTH_MODE: "mock", NEXT_PUBLIC_DISABLE_MSW: "true" };
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

function timedCommandRunner(step, command, prepare = () => {}) {
  return (run) => {
    prepare();
    const result = timed(command);
    record(step, run, result.seconds, { exitCode: result.exitCode });
  };
}

function killTree(child) {
  if (isWin) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
  else process.kill(-child.pid, "SIGKILL");
}

function killPid(pid) {
  if (isWin) spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"]);
  else {
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
}

function listeningPids(port) {
  if (isWin) {
    const result = spawnSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`could not inspect TCP listeners for port ${port}: ${result.stderr}`);
    return result.stdout
      .split(/\r?\n/)
      .flatMap((line) => {
        const columns = line.trim().split(/\s+/);
        const localPort = Number(/:(\d+)$/.exec(columns[1] ?? "")?.[1]);
        return columns[0] === "TCP" && columns[3] === "LISTENING" && localPort === port
          ? [Number(columns[4])]
          : [];
      });
  }

  const ss = spawnSync("ss", ["-ltnp", `sport = :${port}`], { encoding: "utf8" });
  if (ss.status === 0) {
    return [...new Set([...ss.stdout.matchAll(/pid=(\d+)/g)].map((match) => Number(match[1])))];
  }

  const lsof = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });
  if (lsof.status === 0) return lsof.stdout.trim().split(/\s+/).filter(Boolean).map(Number);
  if (lsof.status === 1 && !lsof.error) return [];
  throw new Error(`could not inspect TCP listeners for port ${port}; install ss or lsof`);
}

function processParents() {
  if (isWin) {
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NoLogo", "-Command", "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress"],
      { encoding: "utf8", maxBuffer: 1 << 26 },
    );
    if (result.status !== 0) throw new Error(`could not inspect process ownership: ${result.stderr}`);
    const processes = JSON.parse(result.stdout);
    return new Map((Array.isArray(processes) ? processes : [processes]).map((process) => [
      Number(process.ProcessId),
      Number(process.ParentProcessId),
    ]));
  }

  const result = spawnSync("ps", ["-eo", "pid=,ppid="], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`could not inspect process ownership: ${result.stderr}`);
  return new Map(result.stdout.split(/\r?\n/).flatMap((line) => {
    const [pid, parentPid] = line.trim().split(/\s+/).map(Number);
    return Number.isInteger(pid) && Number.isInteger(parentPid) ? [[pid, parentPid]] : [];
  }));
}

function isDescendantOf(pid, ancestorPid, parents) {
  const visited = new Set();
  for (let current = pid; Number.isInteger(current) && !visited.has(current); current = parents.get(current)) {
    if (current === ancestorPid) return true;
    visited.add(current);
  }
  return false;
}

async function stopDevServer(child, portOwnerPid) {
  const parents = processParents();
  const owners = new Set([
    portOwnerPid,
    ...listeningPids(port).filter((pid) => isDescendantOf(pid, child.pid, parents)),
  ].filter(Number.isInteger));
  for (const pid of owners) killPid(pid);
  killTree(child);

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
    env: { ...process.env, ...DEV_ENV },
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
    const { child, seconds, portOwnerPid } = await startDevServer();
    await stopDevServer(child, portOwnerPid);
    record("dev-server-ready", run, seconds, {
      serverPid: child.pid,
      portOwnerPid,
      detail: "cold .next to GET /login rendered by spawned server process",
    });
  },
  "typecheck-cold": timedCommandRunner("typecheck-cold", "npm run typecheck", () =>
    rmSync(path.join(root, "tsconfig.tsbuildinfo"), { force: true }),
  ),
  "typecheck-warm": timedCommandRunner("typecheck-warm", "npm run typecheck"),
  "lint-cold": timedCommandRunner("lint-cold", "npm run lint", () =>
    rmSync(path.join(root, ".eslintcache"), { force: true }),
  ),
  "lint-warm": timedCommandRunner("lint-warm", "npm run lint"),
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
      detail: "cold Next build; .next removed before every run",
    });
  },
};

if (!existsSync(path.dirname(path.resolve(out)))) mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
for (const step of steps) {
  for (let run = 1; run <= runs; run++) await stepRunners[step](run);
}
console.log(`\nWrote ${results.length} rows to ${out}`);
