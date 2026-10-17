import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const checkNames = ["typecheck", "lint", "test"];

function runVerify(failingCheck) {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "verify-cli-"));
  const scriptsDirectory = path.join(fixture, "scripts");
  const checksDirectory = path.join(fixture, "checks");
  const markerDirectory = path.join(fixture, "started");

  mkdirSync(scriptsDirectory);
  mkdirSync(checksDirectory);
  mkdirSync(markerDirectory);
  try {
    cpSync(path.join(projectRoot, "verify.mjs"), path.join(scriptsDirectory, "verify.mjs"));
    writeFileSync(
      path.join(fixture, "package.json"),
      JSON.stringify({
        private: true,
        scripts: {
          verify: "node scripts/verify.mjs",
          "verify:tests": "npm run test -- --maxWorkers=2",
          typecheck: "node checks/check.mjs typecheck",
          lint: "node checks/check.mjs lint",
          test: "node checks/check.mjs test",
        },
      }),
    );
    writeFileSync(
      path.join(checksDirectory, "check.mjs"),
      `import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const name = process.argv[2];
const markerDirectory = process.env.VERIFY_MARKER_DIRECTORY;
writeFileSync(path.join(markerDirectory, name), "started");
const deadline = Date.now() + 5000;
while (!["typecheck", "lint", "test"].every((check) => existsSync(path.join(markerDirectory, check)))) {
  if (Date.now() >= deadline) {
    console.error("CHECKS_DID_NOT_START_TOGETHER");
    process.exit(2);
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
}
if (process.env.VERIFY_FAIL_CHECK === name) {
  console.error("INJECTED_FAILURE:" + name);
  process.exit(1);
}
console.log("CHECK_OK:" + name);
`,
    );

    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    return spawnSync(npm, ["run", "--silent", "verify"], {
      cwd: fixture,
      env: {
        ...process.env,
        VERIFY_MARKER_DIRECTORY: markerDirectory,
        VERIFY_FAIL_CHECK: failingCheck ?? "",
      },
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: 15000,
    });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

}

test("verify runs all checks together and prints a per-check summary", () => {
  const result = runVerify();
  const output = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 0, output);
  for (const checkName of checkNames) {
    assert.match(output, new RegExp(`PASS ${checkName}\\b`));
  }
  assert.match(output, /3\/3 checks passed/);
});

test("verify reports a failed check and exits non-zero while running the others", () => {
  const result = runVerify("lint");
  const output = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 1, output);
  assert.match(output, /PASS typecheck\b/);
  assert.match(output, /FAIL lint\b/);
  assert.match(output, /PASS test\b/);
  assert.match(output, /INJECTED_FAILURE:lint/);
  assert.match(output, /2\/3 checks passed/);
});
