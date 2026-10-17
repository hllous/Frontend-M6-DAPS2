import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function runVerifyTests(maxWorkers) {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "verify-tests-"));
  const scriptsDirectory = path.join(fixture, "scripts");
  const checksDirectory = path.join(fixture, "checks");
  const logFile = path.join(fixture, "commands.jsonl");
  mkdirSync(scriptsDirectory);
  mkdirSync(checksDirectory);
  try {
    writeFileSync(
      path.join(fixture, "package.json"),
      JSON.stringify({
        private: true,
        scripts: {
          test: "node checks/record-command.mjs test",
          "test:perf": "node checks/record-command.mjs perf",
        },
      }),
    );
    writeFileSync(
      path.join(checksDirectory, "record-command.mjs"),
      `import { appendFileSync } from "node:fs";
const [name, ...args] = process.argv.slice(2);
appendFileSync(process.env.VERIFY_TESTS_LOG, JSON.stringify({ name, args }) + "\\n");
`,
    );
    const result = spawnSync(process.execPath, [path.join(projectRoot, "verify-tests.mjs")], {
      cwd: fixture,
      env: {
        ...process.env,
        VERIFY_TESTS_LOG: logFile,
        ...(maxWorkers === undefined ? {} : { VERIFY_MAX_WORKERS: maxWorkers }),
      },
      encoding: "utf8",
      timeout: 15000,
    });
    const commands = readFileSync(logFile, "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    return { result, commands };
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test("verify test suite defaults to two workers and runs CLI regression tests", () => {
  const { result, commands } = runVerifyTests(undefined);

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(commands, [
    { name: "test", args: ["--maxWorkers=2"] },
    { name: "perf", args: [] },
  ]);
});

test("verify test suite accepts a worker count override", () => {
  const { result, commands } = runVerifyTests("6");

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(commands, [
    { name: "test", args: ["--maxWorkers=6"] },
    { name: "perf", args: [] },
  ]);
});
