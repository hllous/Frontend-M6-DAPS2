#!/usr/bin/env node
// Prints a before/after Markdown table (median, min, max, change) from two measure-loop JSON files.
// Usage: node scripts/perf/compare.mjs <before.json> <after.json>
import { readFileSync } from "node:fs";

const [beforeFile, afterFile] = process.argv.slice(2);
if (!beforeFile || !afterFile) throw new Error("usage: compare.mjs <before.json> <after.json>");

function stats(file) {
  const byStep = new Map();
  for (const row of JSON.parse(readFileSync(file, "utf8")).results) {
    byStep.set(row.step, [...(byStep.get(row.step) ?? []), row.seconds]);
  }
  for (const [step, values] of byStep) {
    if (values.length < 3) throw new Error(`${file}: ${step} has ${values.length} rows; at least 3 rows are required`);
  }
  return new Map(
    [...byStep].map(([step, values]) => {
      const s = [...values].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
      return [step, { n: s.length, median, min: s[0], max: s.at(-1) }];
    }),
  );
}

const before = stats(beforeFile);
const after = stats(afterFile);
const formatSeconds = (seconds) => seconds.toFixed(1);
console.log("| Step | Runs | Before median (min-max) s | After median (min-max) s | Change s | Change % |");
console.log("| --- | --- | --- | --- | --- | --- |");
for (const [step, b] of before) {
  const a = after.get(step);
  if (!a) continue;
  const d = a.median - b.median;
  const sign = d > 0 ? "+" : "";
  console.log(
    `| ${step} | ${b.n}/${a.n} | ${formatSeconds(b.median)} (${formatSeconds(b.min)}-${formatSeconds(b.max)}) | ${formatSeconds(a.median)} (${formatSeconds(a.min)}-${formatSeconds(a.max)}) | ${sign}${formatSeconds(d)} | ${sign}${formatSeconds((d / b.median) * 100)}% |`,
  );
}
