import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parsePlaywrightOutput, parseVitestOutput } from "./result-parsers.mjs";

const require = createRequire(import.meta.url);
const { isDocsOnlyChange } = require("./docs-only.cjs");
const root = fileURLToPath(new URL("../..", import.meta.url));
const scripts = path.join(root, "scripts", "perf");

function run(script, args, cwd = root) {
  return spawnSync(process.execPath, [path.join(scripts, script), ...args], {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
  });
}

test("documentation and Markdown configuration changes are docs-only", () => {
  const files = [
    { filename: "docs/agents/ci.md" },
    { filename: "README.md" },
    { filename: ".markdownlint-cli2.jsonc" },
    { filename: "lychee.toml" },
  ];

  assert.equal(isDocsOnlyChange({ changedFiles: files.length, files }), true);
});

test("renaming a documentation file stays docs-only", () => {
  const files = [{ filename: "docs/agents/new-name.md", previous_filename: "docs/agents/old-name.md" }];

  assert.equal(isDocsOnlyChange({ changedFiles: files.length, files }), true);
});

test("a mixed documentation and source change is not docs-only", () => {
  const files = [{ filename: "docs/agents/ci.md" }, { filename: "src/app/page.tsx" }];

  assert.equal(isDocsOnlyChange({ changedFiles: files.length, files }), false);
});

test("workflow-only and package-lock changes are not docs-only", () => {
  for (const filename of [".github/workflows/ci.yml", "package-lock.json"]) {
    assert.equal(isDocsOnlyChange({ changedFiles: 1, files: [{ filename }] }), false, filename);
  }
});

test("empty or incomplete file lists are not docs-only", () => {
  assert.equal(isDocsOnlyChange({ changedFiles: 0, files: [] }), false);
  assert.equal(isDocsOnlyChange({ changedFiles: 2, files: [{ filename: "docs/agents/ci.md" }] }), false);
});

test("measure-loop rejects fewer than three runs before starting a step", () => {
  const out = path.join(mkdtempSync(path.join(os.tmpdir(), "measure-loop-test-")), "unused.json");
  try {
    const result = run("measure-loop.mjs", ["--out", out, "--runs", "2", "--steps", "not-a-step"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--runs must be an integer of at least 3/);
  } finally {
    rmSync(path.dirname(out), { recursive: true, force: true });
  }
});

test("compare rejects a step with fewer than three rows", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "compare-test-"));
  const before = path.join(dir, "before.json");
  const after = path.join(dir, "after.json");
  const twoRows = { results: [{ step: "build", seconds: 1 }, { step: "build", seconds: 2 }] };
  const threeRows = { results: [...twoRows.results, { step: "build", seconds: 3 }] };
  writeFileSync(before, JSON.stringify(twoRows));
  writeFileSync(after, JSON.stringify(threeRows));
  try {
    const result = run("compare.mjs", [before, after]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /at least 3 rows/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("compare filters to requested steps before validating row counts", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "compare-test-"));
  const before = path.join(dir, "before.json");
  const after = path.join(dir, "after.json");
  const rows = (step, seconds) => seconds.map((value, index) => ({ step, run: index + 1, seconds: value }));
  writeFileSync(before, JSON.stringify({ results: [...rows("e2e-full", [8, 9]), ...rows("vitest-full", [10, 11, 12])] }));
  writeFileSync(after, JSON.stringify({ results: [...rows("e2e-full", [7, 8]), ...rows("vitest-full", [6, 7, 8])] }));
  try {
    const result = run("compare.mjs", [before, after, "--steps", "vitest-full"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\| vitest-full \| 3\/3 \|/);
    assert.doesNotMatch(result.stdout, /e2e-full/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("measure-loop refuses a port already serving a login page", async () => {
  const server = createServer((_, response) => response.end("<html><body>stale server</body></html>"));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(4311, "127.0.0.1", resolve);
  });
  const dir = mkdtempSync(path.join(os.tmpdir(), "measure-loop-port-test-"));
  try {
    const result = run("measure-loop.mjs", [
      "--out", path.join(dir, "unused.json"),
      "--runs", "3",
      "--port", "4311",
      "--steps", "dev-server-ready",
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /port 4311 is already in use/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Vitest summary keeps failed counts, test names, and collection-failed file names", () => {
  const result = parseVitestOutput(`
 FAIL  .claude/skills/demo/test/parse.test.mjs [ .claude/skills/demo/test/parse.test.mjs ]
 FAIL  src/example.test.ts > Example > reports the broken case
 Test Files  1 failed | 3 passed (4)
      Tests  1 failed | 8 passed (9)
`);
  assert.deepEqual(result, {
    passed: 8,
    failed: 1,
    total: 9,
    flaky: 0,
    skipped: 0,
    failedTests: ["src/example.test.ts > Example > reports the broken case"],
    failedFiles: [".claude/skills/demo/test/parse.test.mjs"],
    files: { passed: 3, failed: 1, total: 4 },
  });
});

test("Playwright summary keeps the full title path for unexpected tests", () => {
  const result = parsePlaywrightOutput(JSON.stringify({
    stats: { expected: 2, unexpected: 1, flaky: 1, skipped: 1 },
    suites: [{
      title: "chromium",
      suites: [{
        title: "services.spec.ts",
        file: "e2e/services.spec.ts",
        specs: [{
          title: "the Services page retains its selected row",
          file: "e2e/services.spec.ts",
          ok: false,
          tests: [{ status: "unexpected", results: [{ status: "failed" }] }],
        }],
        suites: [{
          title: "Services workspace",
          specs: [{
            title: "loads its rows",
            file: "e2e/services.spec.ts",
            ok: true,
            tests: [{ status: "expected", results: [{ status: "passed" }] }],
          }],
        }],
      }],
    }],
  }));
  assert.deepEqual(result, {
    passed: 2,
    failed: 1,
    total: 5,
    flaky: 1,
    skipped: 1,
    failedTests: ["services.spec.ts > the Services page retains its selected row"],
  });
});
