#!/usr/bin/env node
// Collects per-job CI durations for the latest green runs of ci.yml on a branch.
// Usage: node scripts/perf/ci-timings.mjs --out docs/perf/ci-baseline-<date>.json [--branch develop] [--runs 5]
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const out = arg("out");
const branch = arg("branch", "develop");
const count = Number(arg("runs", "5"));
if (!out) throw new Error("--out <file.json> is required");

const gh = (args) => JSON.parse(execSync(`gh ${args}`, { encoding: "utf8", maxBuffer: 1 << 26 }));
const runs = gh(`run list --workflow ci.yml --branch ${branch} --status success --limit ${count} --json databaseId,headSha,createdAt,displayTitle`);

const rows = [];
for (const run of runs) {
  const detail = gh(`run view ${run.databaseId} --json jobs,startedAt,updatedAt`);
  const wallSeconds = (Date.parse(detail.updatedAt) - Date.parse(detail.startedAt)) / 1000;
  rows.push({
    runId: run.databaseId,
    commit: run.headSha,
    date: run.createdAt,
    title: run.displayTitle,
    wallSeconds,
    jobs: detail.jobs.map((j) => ({
      job: j.name,
      seconds: (Date.parse(j.completedAt) - Date.parse(j.startedAt)) / 1000,
      conclusion: j.conclusion,
      steps: j.steps.map((s) => ({
        step: s.name,
        seconds: (Date.parse(s.completedAt) - Date.parse(s.startedAt)) / 1000,
      })),
    })),
  });
}

writeFileSync(out, JSON.stringify({ branch, collected: new Date().toISOString(), runs: rows }, null, 2) + "\n");
console.log(`Wrote ${rows.length} runs to ${out}`);
