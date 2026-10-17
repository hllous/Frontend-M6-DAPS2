import path from "node:path";

function parseCount(line, status) {
  return Number(new RegExp(`(\\d+)\\s+${status}\\b`).exec(line)?.[1] ?? 0);
}

function parseTotal(line) {
  const total = /\((\d+)\)\s*$/.exec(line)?.[1];
  return Number(total ?? 0);
}

function summaryLine(output, label) {
  return output.split(/\r?\n/).find((line) => new RegExp(`^\\s*${label}\\s+`).test(line));
}

export function parseVitestOutput(output) {
  const testsLine = summaryLine(output, "Tests");
  const filesLine = summaryLine(output, "Test Files");
  if (!testsLine || !filesLine) throw new Error("Vitest output is missing its test summary");

  const failedTests = [];
  const failedFiles = [];
  for (const line of output.split(/\r?\n/)) {
    const failure = /^\s*FAIL\s+(.+?)\s*$/.exec(line)?.[1];
    if (!failure) continue;
    if (failure.includes(" > ")) {
      failedTests.push(failure);
    } else {
      failedFiles.push(/\s+\[\s*(.+?)\s*\]$/.exec(failure)?.[1] ?? failure);
    }
  }

  return {
    passed: parseCount(testsLine, "passed"),
    failed: parseCount(testsLine, "failed"),
    total: parseTotal(testsLine),
    flaky: 0,
    skipped: 0,
    failedTests,
    failedFiles,
    files: {
      passed: parseCount(filesLine, "passed"),
      failed: parseCount(filesLine, "failed"),
      total: parseTotal(filesLine),
    },
  };
}

function collectFailedTests(suite, ancestors, failures) {
  const suiteTitles = suite.title ? [...ancestors, suite.title] : ancestors;
  for (const spec of suite.specs ?? []) {
    const failed = spec.ok === false || spec.tests?.some((test) =>
      test.status === "unexpected" || test.results?.some((result) => ["failed", "timedOut"].includes(result.status))
    );
    if (!failed) continue;

    const file = spec.file ?? suite.file ?? "unknown.spec.ts";
    const titles = [...suiteTitles, spec.title].filter((title) =>
      title && title !== file && title !== path.basename(file) && title !== "chromium"
    );
    failures.add(`${path.basename(file)} > ${titles.join(" > ")}`);
  }

  for (const child of suite.suites ?? []) collectFailedTests(child, suiteTitles, failures);
}

export function parsePlaywrightOutput(output) {
  const report = JSON.parse(output);
  const stats = report.stats ?? {};
  const passed = Number(stats.expected ?? 0);
  const failed = Number(stats.unexpected ?? 0);
  const flaky = Number(stats.flaky ?? 0);
  const skipped = Number(stats.skipped ?? 0);
  const failedTests = new Set();
  for (const suite of report.suites ?? []) collectFailedTests(suite, [], failedTests);

  return {
    passed,
    failed,
    total: passed + failed + flaky + skipped,
    flaky,
    skipped,
    failedTests: [...failedTests].sort(),
  };
}
