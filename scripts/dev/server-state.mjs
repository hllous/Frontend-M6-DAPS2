import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function stateDirectory(projectRoot) {
  const resolvedRoot = path.resolve(projectRoot);
  const normalizedRoot = process.platform === "win32" ? resolvedRoot.toLowerCase() : resolvedRoot;
  const id = createHash("sha256").update(normalizedRoot).digest("hex").slice(0, 20);
  return path.join(os.tmpdir(), "m6-dev-server", id);
}

export function serverStatePath(projectRoot, port) {
  return path.join(stateDirectory(projectRoot), `${port}.json`);
}

export function serverLogPath(projectRoot, port) {
  return path.join(stateDirectory(projectRoot), `${port}.log`);
}

function currentPortPath(projectRoot) {
  return path.join(stateDirectory(projectRoot), "current.json");
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, file);
}

export function readServerState(projectRoot, port) {
  const file = serverStatePath(projectRoot, port);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeServerState(projectRoot, state) {
  writeJson(serverStatePath(projectRoot, state.port), state);
}

export function clearServerState(projectRoot, port) {
  rmSync(serverStatePath(projectRoot, port), { force: true });
  const pointer = currentPortPath(projectRoot);
  if (existsSync(pointer)) {
    const current = JSON.parse(readFileSync(pointer, "utf8"));
    if (current.port === port) rmSync(pointer, { force: true });
  }
}

export function setCurrentServerPort(projectRoot, port) {
  writeJson(currentPortPath(projectRoot), { port });
}

export function getCurrentServerPort(projectRoot) {
  const file = currentPortPath(projectRoot);
  if (!existsSync(file)) return null;
  const port = Number(JSON.parse(readFileSync(file, "utf8")).port);
  return Number.isSafeInteger(port) && port > 0 ? port : null;
}
