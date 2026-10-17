import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { killTree, listeningPids, processStartIdentity } from "./dev/server-process.mjs";
import { requestPageBeforeDeadline } from "./dev/server-readiness.mjs";
import { readServerState, serverStatePath, writeServerState } from "./dev/server-state.mjs";
import { warmMainRoutes } from "./dev/warm-routes.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const serverScript = path.join(root, "scripts", "dev-server.mjs");
const assignedPort = 4314;

test("readiness deadline aborts an in-flight page request", async () => {
  let requestSignal;
  const result = await requestPageBeforeDeadline(
    "http://127.0.0.1:4314/login",
    Date.now() + 20,
    (_url, { signal }) => {
      requestSignal = signal;
      return new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("request aborted")), { once: true });
      });
    },
  );

  assert.equal(result.timedOut, true);
  assert.equal(requestSignal.aborted, true);
});

test("readiness deadline includes reading the rendered page body", async () => {
  let bodySignal;
  const result = await requestPageBeforeDeadline(
    "http://127.0.0.1:4314/login",
    Date.now() + 20,
    async (_url, { signal }) => {
      bodySignal = signal;
      return {
        status: 200,
        text: () => new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("body read aborted")), { once: true });
        }),
      };
    },
  );

  assert.equal(result.timedOut, true);
  assert.equal(bodySignal.aborted, true);
});

test("readiness deadline never issues a request after it has expired", async () => {
  let requested = false;
  const result = await requestPageBeforeDeadline(
    "http://127.0.0.1:4314/login",
    Date.now() - 1,
    async () => {
      requested = true;
      return { status: 200, text: async () => "<html><body>late</body></html>" };
    },
  );

  assert.equal(result.timedOut, true);
  assert.equal(requested, false);
});

function runServerCommand(command, extraArgs = [], timeout = 10_000) {
  return spawnSync(process.execPath, [serverScript, command, ...extraArgs], {
    cwd: root,
    encoding: "utf8",
    timeout,
    maxBuffer: 1 << 24,
  });
}

function runJsonServerCommand(command, extraArgs = [], timeout = 10_000) {
  const result = runServerCommand(command, [...extraArgs, "--json"], timeout);
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("page warm-up uses only GET and records failures without throwing", async () => {
  const requestedRoutes = [];
  const result = await warmMainRoutes({
    async get(url, options) {
      const route = new URL(url).pathname;
      requestedRoutes.push({ route, options });
      if (route === "/app") throw new Error("page did not compile in time");
      if (route === "/app/dashboard") {
        return { status: () => 307, ok: () => false, headers: () => ({ location: "/login" }) };
      }
      return {
        status: () => 200,
        ok: () => true,
        headers: () => ({ "content-type": "text/html; charset=utf-8" }),
        text: async () => "<html><body>page</body></html>",
      };
    },
    async post() {
      assert.fail("page warm-up must not send POST requests");
    },
  }, {
    baseURL: "http://127.0.0.1:4314",
    environment: { NODE_ENV: "development", M6_AUTH_MODE: "mock" },
  });

  assert.equal(requestedRoutes.length, 15);
  assert.ok(requestedRoutes.every(({ route, options }) => !route.startsWith("/api/") && options.maxRedirects === 0));
  assert.equal(requestedRoutes.find(({ route }) => route === "/login").options.headers, undefined);
  assert.ok(requestedRoutes
    .filter(({ route }) => route.startsWith("/app"))
    .every(({ options }) => /^m6_session=/.test(options.headers.cookie)));
  assert.equal(result.warmedRouteCount, 13);
  assert.deepEqual(result.failedPageRoutes, [
    { route: "/app", error: "page did not compile in time" },
    { route: "/app/dashboard", error: "redirected to /login" },
  ]);
});

test("page warm-up skips every route outside local development", async () => {
  for (const scenario of [
    {
      baseURL: "https://example.com",
      environment: { NODE_ENV: "development", M6_AUTH_MODE: "mock" },
      error: "page warm-up requires a localhost target",
    },
    {
      baseURL: "http://127.0.0.1:4314",
      environment: { NODE_ENV: "production", M6_AUTH_MODE: "mock" },
      error: "page warm-up is available only in local development",
    },
  ]) {
    let requests = 0;
    const result = await warmMainRoutes({
      async get() {
        requests += 1;
        return {
          status: () => 200,
          ok: () => true,
          headers: () => ({ "content-type": "text/html; charset=utf-8" }),
          text: async () => "<html><body>page</body></html>",
        };
      },
    }, scenario);

    assert.equal(requests, 0);
    assert.equal(result.warmedRouteCount, 0);
    assert.equal(result.failedPageRoutes.length, 15);
    assert.ok(result.failedPageRoutes.every(({ error }) => error === scenario.error));
  }
});

test("start refuses a requested port owned by another process", async () => {
  const server = createServer((_, response) => response.end("occupied"));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(assignedPort, "127.0.0.1", resolve);
  });

  try {
    const result = spawnSync(process.execPath, [serverScript, "start", "--port", String(assignedPort), "--json"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
    });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /port 4314 is already in use/i);
    assert.doesNotMatch(result.stdout, /"ready"\s*:\s*true/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("stop clears a stale record without killing a live PID that does not own the port", async () => {
  const child = await new Promise((resolve, reject) => {
    const processHandle = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      cwd: root,
      detached: true,
      stdio: "ignore",
    });
    processHandle.once("spawn", () => resolve(processHandle));
    processHandle.once("error", reject);
  });
  child.unref();

  try {
    const startedAt = processStartIdentity(child.pid);
    assert.ok(startedAt);
    writeServerState(root, {
      version: 1,
      port: assignedPort,
      url: `http://127.0.0.1:${assignedPort}/login`,
      status: "ready",
      serverPid: child.pid,
      serverStartedAt: startedAt,
      portOwnerPid: child.pid,
      portOwnerStartedAt: startedAt,
    });

    const result = spawnSync(process.execPath, [serverScript, "stop", "--port", String(assignedPort), "--json"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).stale, true);
    assert.equal(processStartIdentity(child.pid), startedAt);
    assert.equal(readServerState(root, assignedPort), null);
    assert.equal(existsSync(serverStatePath(root, assignedPort)), false);

    writeServerState(root, {
      version: 1,
      port: assignedPort,
      url: `http://127.0.0.1:${assignedPort}/login`,
      status: "ready",
      serverPid: 2_147_483_647,
      serverStartedAt: "dead-process",
      portOwnerPid: 2_147_483_647,
      portOwnerStartedAt: "dead-process",
    });
    const deadRecord = runJsonServerCommand("stop", ["--port", String(assignedPort)]);
    assert.equal(deadRecord.stale, true);
    assert.equal(readServerState(root, assignedPort), null);
  } finally {
    killTree(child.pid);
  }
});

test("start warms main pages, repeated start reuses the server, and restart/stop use its recorded PID", () => {
  assert.deepEqual(listeningPids(assignedPort), [], "the assigned port must be free before the integration test");
  let started;
  try {
    started = runJsonServerCommand("start", ["--port", String(assignedPort)], 120_000);
    assert.equal(started.ready, true);
    assert.equal(started.port, assignedPort);
    assert.match(started.url, /^http:\/\/127\.0\.0\.1:4314\/login$/);
    assert.ok(Number.isSafeInteger(started.pid));
    assert.ok(started.readySeconds < 60);
    assert.ok(started.warmedRouteCount > 0);
    const startedState = readServerState(root, assignedPort);
    assert.equal(startedState.status, "ready");

    const secondStart = runJsonServerCommand("start");
    assert.equal(secondStart.alreadyRunning, true);
    assert.equal(secondStart.pid, started.pid);

    const restarted = runJsonServerCommand("restart", [], 120_000);
    assert.equal(restarted.ready, true);
    const restartedState = readServerState(root, assignedPort);
    assert.notEqual(restartedState.serverStartedAt, startedState.serverStartedAt);
    assert.equal(listeningPids(assignedPort).includes(restartedState.portOwnerPid), true);

    const stopped = runJsonServerCommand("stop");
    assert.equal(stopped.stopped, true);
    assert.deepEqual(listeningPids(assignedPort), []);
  } finally {
    if (readServerState(root, assignedPort)) runServerCommand("stop", ["--port", String(assignedPort), "--json"]);
  }
});
