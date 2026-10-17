#!/usr/bin/env node
import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { request } from "@playwright/test";
import {
  isDescendantOf,
  killPid,
  killTree,
  listeningPids,
  processIsAlive,
  processParents,
  processStartIdentity,
} from "./dev/server-process.mjs";
import {
  clearServerState,
  getCurrentServerPort,
  readServerState,
  serverLogPath,
  setCurrentServerPort,
  writeServerState,
} from "./dev/server-state.mjs";
import { warmMainRoutes } from "./dev/warm-routes.mjs";
import { requestPageBeforeDeadline } from "./dev/server-readiness.mjs";
import { DEV_SERVER_ENV } from "./dev/server-config.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_PORT = 4311;
const LAST_PORT = 4399;
const READY_TIMEOUT_MS = 60_000;
const STOP_TIMEOUT_MS = 5_000;

function parseOptions(argv) {
  let command = "start";
  let index = 0;
  if (["start", "stop", "restart"].includes(argv[0])) {
    command = argv[0];
    index = 1;
  }

  let port;
  let json = false;
  for (; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      json = true;
    } else if (argument === "--port") {
      port = Number(argv[index + 1]);
      index += 1;
    } else if (argument.startsWith("--port=")) {
      port = Number(argument.slice("--port=".length));
    } else if (argument === "--help" || argument === "-h") {
      return { help: true };
    } else {
      throw new Error(`unknown option ${argument}`);
    }
  }

  if (port !== undefined && (!Number.isSafeInteger(port) || port < 1 || port > 65535)) {
    throw new Error(`invalid port ${port}`);
  }
  if (port === 4310) throw new Error("port 4310 is reserved for Playwright");
  return { command, port, json };
}

function printHelp() {
  console.log([
    "Usage: npm run dev:server -- [start|stop|restart] [--port <port>] [--json]",
    "",
    "start uses the first free port from 4311 through 4399 unless --port is supplied.",
    "stop and restart use the last recorded port unless --port is supplied.",
  ].join("\n"));
}

function emit(value, json) {
  if (json) {
    console.log(JSON.stringify(value));
  } else if (value.url) {
    const skippedWarmRoutes = value.warmFailureCount
      ? `, ${value.warmFailureCount} skipped`
      : "";
    console.log([
      `URL: ${value.url}`,
      `PID: ${value.pid}`,
      `Port: ${value.port}`,
      `Ready: ${value.readySeconds.toFixed(2)} s`,
      `Warm-up: ${value.warmSeconds.toFixed(2)} s (${value.warmedRouteCount} routes${skippedWarmRoutes})`,
      `Log: ${value.logPath}`,
      value.alreadyRunning ? "Server was already running." : null,
    ].filter(Boolean).join("\n"));
  } else {
    console.log(value.message ?? (value.stopped
      ? `Stopped managed dev server on port ${value.port} (PID ${value.pid}).`
      : value.stale
        ? `Cleared stale managed dev server record for port ${value.port}.`
        : `No managed dev server recorded for port ${value.port}.`));
  }
}

function matchingProcess(pid, startedAt) {
  return Number.isSafeInteger(pid)
    && typeof startedAt === "string"
    && processStartIdentity(pid) === startedAt;
}

function recordedOwnerIsListening(state, owners) {
  return Number.isSafeInteger(state.portOwnerPid)
    && owners.includes(state.portOwnerPid)
    && matchingProcess(state.portOwnerPid, state.portOwnerStartedAt);
}

function startingProcessIsAlive(state) {
  return matchingProcess(state.serverPid, state.serverStartedAt);
}

function removeStaleRecord(port) {
  clearServerState(projectRoot, port);
}

async function inspectManagedServer(port) {
  const state = readServerState(projectRoot, port);
  const owners = listeningPids(port);
  if (!state) return { state: null, owners };

  if (state.status === "ready" && recordedOwnerIsListening(state, owners)) {
    return { state, owners };
  }

  if (state.status === "starting" && startingProcessIsAlive(state)) {
    if (!owners.length) return { state, owners };
    const parents = processParents();
    if (owners.some((pid) => isDescendantOf(pid, state.serverPid, parents))) return { state, owners };
  }

  removeStaleRecord(port);
  return { state: null, owners };
}

async function findManagedServer() {
  for (let port = DEFAULT_PORT; port <= LAST_PORT; port += 1) {
    const stored = readServerState(projectRoot, port);
    if (!stored) continue;
    const inspected = await inspectManagedServer(port);
    if (inspected.state) return { port, ...inspected };
  }
  return null;
}

async function chooseFreePort() {
  for (let port = DEFAULT_PORT; port <= LAST_PORT; port += 1) {
    const { state, owners } = await inspectManagedServer(port);
    if (state) return { port, state, owners };
    if (!owners.length) return { port, state: null, owners };
  }
  throw new Error(`no free dev server port between ${DEFAULT_PORT} and ${LAST_PORT}`);
}

function pageIsRendered(response, html) {
  return response.status === 200 && /<body\b/i.test(html) && /<\/html>/i.test(html);
}

async function waitForRenderedPage(state) {
  const startedAtMs = Date.parse(state.startedAt);
  const deadline = Number.isFinite(startedAtMs)
    ? startedAtMs + READY_TIMEOUT_MS
    : Date.now() + READY_TIMEOUT_MS;
  const url = `http://127.0.0.1:${state.port}/login`;
  while (Date.now() < deadline) {
    if (!processIsAlive(state.serverPid)) {
      throw new Error(`dev server process ${state.serverPid} exited before GET /login rendered`);
    }

    try {
      const result = await requestPageBeforeDeadline(url, deadline);
      if (result.timedOut) break;
      const { response, html } = result;
      if (pageIsRendered(response, html)) {
        const owners = listeningPids(state.port);
        const parents = processParents();
        const portOwnerPid = owners.find((pid) => isDescendantOf(pid, state.serverPid, parents));
        if (portOwnerPid === undefined) {
          throw new Error(owners.length
            ? `GET /login rendered, but port ${state.port} belongs to pid(s) ${owners.join(", ")}, not spawned process ${state.serverPid}`
            : `GET /login rendered, but port ${state.port} has no inspectable listener`);
        }
        const portOwnerStartedAt = processStartIdentity(portOwnerPid);
        if (!portOwnerStartedAt) throw new Error(`could not identify listening process ${portOwnerPid}`);
        const readySeconds = state.startedAtNs
          ? Number(process.hrtime.bigint() - state.startedAtNs) / 1e9
          : (Date.now() - Date.parse(state.startedAt)) / 1000;
        return { portOwnerPid, portOwnerStartedAt, readySeconds };
      }
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      // The server has not started listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`dev server did not render GET /login within ${READY_TIMEOUT_MS / 1000} s`);
}

async function warmRoutes(state) {
  const t0 = process.hrtime.bigint();
  let context;
  try {
    context = await request.newContext({ baseURL: state.url.replace(/\/login$/, "") });
    const result = await warmMainRoutes(context, {
      timeoutMs: 120_000,
      baseURL: state.url.replace(/\/login$/, ""),
    });
    for (const failure of result.failedPageRoutes) {
      console.warn(`route warm-up skipped ${failure.route}: ${failure.error}`);
    }
    return {
      warmSeconds: Number(process.hrtime.bigint() - t0) / 1e9,
      warmedRouteCount: result.warmedRouteCount,
      warmFailureCount: result.failedPageRoutes.length,
    };
  } catch (error) {
    console.warn(`page route warm-up failed: ${error.message}`);
    return {
      warmSeconds: Number(process.hrtime.bigint() - t0) / 1e9,
      warmedRouteCount: 0,
      warmFailureCount: 1,
    };
  } finally {
    try {
      await context?.dispose();
    } catch (error) {
      console.warn(`could not dispose page route warm-up context: ${error.message}`);
    }
  }
}

async function startServer(port, options = {}) {
  const inspected = options.existing ?? await inspectManagedServer(port);
  const existing = inspected.state;
  const owners = inspected.owners ?? listeningPids(port);
  if (existing?.status === "ready") {
    const result = {
      command: options.command ?? "start",
      alreadyRunning: true,
      ready: true,
      url: existing.url,
      port,
      pid: existing.portOwnerPid,
      serverPid: existing.serverPid,
      readySeconds: existing.readySeconds,
      warmSeconds: existing.warmSeconds,
      warmedRouteCount: existing.warmedRouteCount,
      warmFailureCount: existing.warmFailureCount ?? 0,
      logPath: existing.logPath,
    };
    setCurrentServerPort(projectRoot, port);
    emit(result, options.json);
    return result;
  }

  if (existing?.status === "starting") {
    const ready = await waitForRenderedPage(existing);
    existing.portOwnerPid = ready.portOwnerPid;
    existing.portOwnerStartedAt = ready.portOwnerStartedAt;
    existing.readySeconds = ready.readySeconds;
    writeServerState(projectRoot, existing);
    const warm = await warmRoutes(existing);
    Object.assign(existing, warm, { status: "ready" });
    writeServerState(projectRoot, existing);
    setCurrentServerPort(projectRoot, port);
    const result = { command: options.command ?? "start", alreadyRunning: true, ready: true, url: existing.url, logPath: existing.logPath, port, pid: existing.portOwnerPid, serverPid: existing.serverPid, readySeconds: existing.readySeconds, ...warm, warmedRouteCount: existing.warmedRouteCount };
    emit(result, options.json);
    return result;
  }

  if (owners.length) throw new Error(`port ${port} is already in use by pid(s) ${owners.join(", ")}`);

  const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const startedAtMs = Date.now();
  const startedAtNs = process.hrtime.bigint();
  const logPath = serverLogPath(projectRoot, port);
  mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = openSync(logPath, "w");
  const child = spawn(process.execPath, [nextCli, "dev", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: projectRoot,
    env: { ...process.env, ...DEV_SERVER_ENV },
    stdio: ["ignore", logFd, logFd],
    detached: true,
    windowsHide: true,
  });
  closeSync(logFd);
  child.unref();

  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  const identityDeadline = Date.now() + STOP_TIMEOUT_MS;
  let serverStartedAt = processStartIdentity(child.pid);
  while (!serverStartedAt && Date.now() < identityDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    serverStartedAt = processStartIdentity(child.pid);
  }
  if (!serverStartedAt) {
    killTree(child.pid);
    throw new Error(`could not record the start identity for dev server process ${child.pid}`);
  }

  const state = {
    version: 1,
    port,
    url: `http://127.0.0.1:${port}/login`,
    status: "starting",
    logPath,
    serverPid: child.pid,
    serverStartedAt,
    portOwnerPid: null,
    portOwnerStartedAt: null,
    startedAt: new Date(startedAtMs).toISOString(),
    startedAtNs,
  };
  // The nanosecond clock value is useful only in this process; persist a stable wall-clock timestamp instead.
  const startedAtForMeasurement = startedAtNs;
  delete state.startedAtNs;
  writeServerState(projectRoot, state);
  setCurrentServerPort(projectRoot, port);

  try {
    const ready = await waitForRenderedPage({ ...state, startedAtNs: startedAtForMeasurement });
    Object.assign(state, ready);
    writeServerState(projectRoot, state);

    const warm = await warmRoutes(state);
    Object.assign(state, warm, { status: "ready" });
    writeServerState(projectRoot, state);
    setCurrentServerPort(projectRoot, port);

    const result = {
      command: options.command ?? "start",
      alreadyRunning: false,
      ready: true,
      url: state.url,
      logPath: state.logPath,
      port,
      pid: state.portOwnerPid,
      serverPid: state.serverPid,
      readySeconds: state.readySeconds,
      ...warm,
      warmedRouteCount: state.warmedRouteCount,
    };
    emit(result, options.json);
    return result;
  } catch (error) {
    let logExcerpt = "";
    try {
      logExcerpt = readFileSync(logPath, "utf8").trim().split(/\r?\n/).slice(-12).join("\n");
    } catch {
      // A missing or unreadable log should not hide the startup error.
    }
    try {
      await stopServer(state, { ignoreMissing: true });
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "dev server startup and cleanup failed");
    }
    throw new Error(logExcerpt ? `${error.message}\n${logExcerpt}` : error.message, { cause: error });
  }
}

async function waitForPortToBeFree(port) {
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const owners = listeningPids(port);
    if (!owners.length) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const owners = listeningPids(port);
  throw new Error(`port ${port} is still in use after stopping the recorded process; pid(s): ${owners.join(", ")}`);
}

async function stopServer(state, { ignoreMissing = false } = {}) {
  const owners = listeningPids(state.port);
  const ownerIsListener = recordedOwnerIsListening(state, owners);
  const rootMatches = matchingProcess(state.serverPid, state.serverStartedAt);

  if (ownerIsListener) {
    if (rootMatches) killTree(state.serverPid);
    else killPid(state.portOwnerPid);
    await waitForPortToBeFree(state.port);
    clearServerState(projectRoot, state.port);
    return { command: "stop", port: state.port, stopped: true, stale: false, pid: state.portOwnerPid };
  }

  if (state.status === "starting" && rootMatches) {
    const parents = processParents();
    if (owners.length && !owners.some((pid) => isDescendantOf(pid, state.serverPid, parents))) {
      killTree(state.serverPid);
      clearServerState(projectRoot, state.port);
      return { command: "stop", port: state.port, stopped: false, stale: true, message: `cleared stale dev server record for port ${state.port}; another process still owns the port` };
    }
    killTree(state.serverPid);
    await waitForPortToBeFree(state.port);
    clearServerState(projectRoot, state.port);
    return { command: "stop", port: state.port, stopped: true, stale: false, pid: state.serverPid };
  }

  clearServerState(projectRoot, state.port);
  if (ignoreMissing) return { command: "stop", port: state.port, stopped: false, stale: true };
  return { command: "stop", port: state.port, stopped: false, stale: true, message: `cleared stale dev server record for port ${state.port}` };
}

function selectLifecyclePort(command, requestedPort) {
  if (requestedPort !== undefined) return requestedPort;
  if (command === "stop" || command === "restart") return getCurrentServerPort(projectRoot) ?? DEFAULT_PORT;
  return null;
}

async function run() {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (options.help) return printHelp();
  const lifecyclePort = selectLifecyclePort(options.command, options.port);

  try {
    if (options.command === "stop") {
      const state = readServerState(projectRoot, lifecyclePort);
      const result = state
        ? await stopServer(state)
        : { command: "stop", port: lifecyclePort, stopped: false, stale: false, message: `no managed dev server recorded for port ${lifecyclePort}` };
      emit(result, options.json);
      return;
    }

    if (options.command === "restart") {
      const state = readServerState(projectRoot, lifecyclePort);
      if (state) await stopServer(state);
      return await startServer(lifecyclePort, { command: "restart", json: options.json });
    }

    if (lifecyclePort !== null) {
      return await startServer(lifecyclePort, { json: options.json });
    }

    const recordedPort = getCurrentServerPort(projectRoot);
    if (recordedPort !== null) {
      const recorded = await inspectManagedServer(recordedPort);
      if (recorded.state) return await startServer(recordedPort, { json: options.json, existing: recorded });
    }

    const current = await findManagedServer();
    if (current) return await startServer(current.port, { json: options.json, existing: current });
    const selected = await chooseFreePort();
    return await startServer(selected.port, { json: options.json, existing: selected });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

await run();
