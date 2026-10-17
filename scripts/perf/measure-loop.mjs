#!/usr/bin/env node
// Times every step of the development loop N times and writes raw JSON.
// Usage: node scripts/perf/measure-loop.mjs --out docs/perf/baseline-<date>.json [--runs 3] [--port 4311] [--steps a,b]
// Docs: docs/agents/measuring-the-loop.md
import { spawn, spawnSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

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

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const runs = Number(arg("runs", "3"));
const port = Number(arg("port", "4311"));
const out = arg("out");
const steps = arg("steps", ALL_STEPS.join(",")).split(",");
const root = process.cwd();
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
  return { seconds, exitCode: r.status, output: `${r.stdout}\n${r.stderr}` };
}

function killTree(child) {
  if (isWin) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
  else process.kill(-child.pid, "SIGKILL");
}

async function startDevServer() {
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
  for (;;) {
    if (Date.now() > deadline) {
      killTree(child);
      throw new Error("dev server not ready in 300 s");
    }
    try {
      const res = await fetch(`http://127.0.0.1:${port}/login`, { redirect: "manual" });
      const html = res.status === 200 ? await res.text() : "";
      if (html.includes("</html>")) break;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { child, seconds: Number(process.hrtime.bigint() - t0) / 1e9 };
}

function parseVitest(output) {
  const tests = /Tests\s+(?:\d+ failed \| )?(\d+) passed/.exec(output)?.[1];
  const files = /Test Files\s+(?:\d+ failed \| )?(\d+) passed/.exec(output)?.[1];
  return tests ? `${tests} tests, ${files} files` : undefined;
}

function parsePlaywright(output) {
  return (
    ["passed", "failed", "flaky", "skipped"]
      .map((k) => {
        const n = new RegExp(`(\\d+) ${k}`).exec(output)?.[1];
        return n ? `${n} ${k}` : null;
      })
      .filter(Boolean)
      .join(", ") || undefined
  );
}

async function playwrightStep(step, run, args) {
  const { child } = await startDevServer();
  try {
    const r = timed(`npx playwright test ${args} --reporter=line`, {
      env: { PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${port}` },
    });
    record(step, run, r.seconds, { exitCode: r.exitCode, detail: parsePlaywright(r.output) });
  } finally {
    killTree(child);
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
    const { child, seconds } = await startDevServer();
    killTree(child);
    record("dev-server-ready", run, seconds, { detail: "cold .next to GET /login rendered" });
  },
  "typecheck-cold"(run) {
    rmSync(path.join(root, "tsconfig.tsbuildinfo"), { force: true });
    const r = timed("npm run typecheck");
    record("typecheck-cold", run, r.seconds, { exitCode: r.exitCode });
  },
  "typecheck-warm"(run) {
    const r = timed("npm run typecheck");
    record("typecheck-warm", run, r.seconds, { exitCode: r.exitCode });
  },
  "lint-cold"(run) {
    rmSync(path.join(root, ".eslintcache"), { force: true });
    const r = timed("npm run lint");
    record("lint-cold", run, r.seconds, { exitCode: r.exitCode });
  },
  "lint-warm"(run) {
    const r = timed("npm run lint");
    record("lint-warm", run, r.seconds, { exitCode: r.exitCode });
  },
  "vitest-full"(run) {
    const r = timed("npm test");
    record("vitest-full", run, r.seconds, { exitCode: r.exitCode, detail: parseVitest(r.output) });
  },
  "e2e-focused": (run) => playwrightStep("e2e-focused", run, FOCUSED_SPECS.join(" ")),
  "e2e-full": (run) => playwrightStep("e2e-full", run, ""),
  build(run) {
    rmSync(path.join(root, ".next"), { recursive: true, force: true });
    const r = timed("npm run build");
    record("build", run, r.seconds, { exitCode: r.exitCode });
  },
};

if (!existsSync(path.dirname(path.resolve(out)))) mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
for (const step of steps) {
  for (let run = 1; run <= runs; run++) await stepRunners[step](run);
}
console.log(`\nWrote ${results.length} rows to ${out}`);
