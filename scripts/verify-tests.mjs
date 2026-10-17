import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";
const workerCount = process.env.VERIFY_MAX_WORKERS ?? "2";

if (!/^[1-9]\d*$/.test(workerCount) || !Number.isSafeInteger(Number(workerCount))) {
  console.error("VERIFY_MAX_WORKERS must be a positive safe integer");
  process.exitCode = 2;
} else {
  function runNpm(args) {
    const result = spawnSync(npm, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: isWindows,
      stdio: "inherit",
      windowsHide: true,
    });

    if (result.error) {
      console.error(`Could not run npm ${args.join(" ")}: ${result.error.message}`);
      return 1;
    }
    return result.status ?? 1;
  }

  const testExitCode = runNpm(["run", "test", "--", `--maxWorkers=${workerCount}`]);
  if (testExitCode !== 0) {
    process.exitCode = testExitCode;
  } else {
    process.exitCode = runNpm(["run", "test:perf"]);
  }
}
