#!/usr/bin/env node
import { spawn } from "node:child_process";

const checks = [
  { name: "typecheck", npmArgs: ["run", "typecheck"] },
  { name: "lint", npmArgs: ["run", "lint"] },
  { name: "test", npmArgs: ["run", "verify:tests"] },
];
const staticChecks = checks.filter(({ name }) => name !== "test");
const testCheck = checks.find(({ name }) => name === "test");

function runCheck({ name, npmArgs }) {
  const startedAt = process.hrtime.bigint();

  return new Promise((resolve) => {
    const child = spawn("npm", npmArgs, {
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    let spawnError;
    let settled = false;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        resolve({ ...result, durationSeconds: secondsSince(startedAt) });
      }
    };

    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", (error) => {
      spawnError = error;
      finish({ name, exitCode: 1, output, spawnError });
    });
    child.once("close", (exitCode, signal) => {
      finish({ name, exitCode: exitCode ?? 1, signal, output, spawnError });
    });
  });
}

function secondsSince(startedAt) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
}

function printFailureOutput(output) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length > 0) {
    console.log(lines.slice(-20).map((line) => `  ${line}`).join("\n"));
  }
}

async function main() {
  const startedAt = process.hrtime.bigint();
  const results = await Promise.all(staticChecks.map(runCheck));
  results.push(await runCheck(testCheck));

  for (const result of results) {
    const passed = result.exitCode === 0;
    const status = passed ? "PASS" : "FAIL";
    console.log(`${status} ${result.name} (${result.durationSeconds.toFixed(2)}s)`);

    if (!passed) {
      if (result.spawnError) {
        console.log(`  Could not start check: ${result.spawnError.message}`);
      }
      if (result.signal) {
        console.log(`  Process stopped by ${result.signal}`);
      }
      printFailureOutput(result.output);
    }
  }

  const passedCount = results.filter(({ exitCode }) => exitCode === 0).length;
  const totalDuration = secondsSince(startedAt).toFixed(2);
  console.log(`${passedCount}/${results.length} checks passed in ${totalDuration}s`);
  if (passedCount !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`verify could not complete: ${error.message}`);
  process.exitCode = 1;
});
