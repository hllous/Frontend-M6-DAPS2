import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const isWindows = process.platform === "win32";

export function listeningPids(port) {
  if (isWindows) {
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

export function processParents() {
  if (isWindows) {
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

export function isDescendantOf(pid, ancestorPid, parents) {
  const visited = new Set();
  for (let current = pid; Number.isInteger(current) && !visited.has(current); current = parents.get(current)) {
    if (current === ancestorPid) return true;
    visited.add(current);
  }
  return false;
}

export function processStartIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;

  if (isWindows) {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NoLogo",
        "-Command",
        `$process = Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' -ErrorAction SilentlyContinue; if ($process) { $process.CreationDate.ToUniversalTime().Ticks }`,
      ],
      { encoding: "utf8" },
    );
    return result.status === 0 ? result.stdout.trim() || null : null;
  }

  const procStat = `/proc/${pid}/stat`;
  if (existsSync(procStat)) {
    const stat = readFileSync(procStat, "utf8");
    const fields = stat.slice(stat.lastIndexOf(")") + 2).trim().split(/\s+/);
    return fields[19] ?? null;
  }

  const result = spawnSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() || null : null;
}

export function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    if (error.code === "EPERM") return true;
    throw error;
  }
}

export function killPid(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  if (isWindows) {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    if (result.status !== 0 && processIsAlive(pid)) throw new Error(`could not stop process ${pid}`);
    return;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

export function killTree(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  if (isWindows) return killPid(pid);
  try {
    process.kill(-pid, "SIGKILL");
  } catch (error) {
    if (error.code === "ESRCH") return killPid(pid);
    throw error;
  }
}
