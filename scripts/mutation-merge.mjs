// Junta los reportes JSON de los shards de Stryker (carpetas que se pasan como argumentos),
// calcula el mutation score global y falla si queda por debajo de `thresholds.break` de
// stryker.config.json. Fórmula de Stryker: (killed + timeout) / (killed + timeout + survived +
// noCoverage); los mutantes ignorados y los que no compilan o fallan en runtime no cuentan.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dirs = process.argv.slice(2);
const breakAt = JSON.parse(readFileSync("stryker.config.json", "utf8")).thresholds.break;
const detected = new Set(["Killed", "Timeout"]);
const undetected = new Set(["Survived", "NoCoverage"]);

const perFile = [];
let totalDetected = 0;
let totalValid = 0;
for (const dir of dirs) {
  const path = join(dir, "mutation.json");
  if (!existsSync(path)) {
    console.error(`Falta ${path}`);
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(path, "utf8"));
  for (const [file, data] of Object.entries(report.files)) {
    const hit = data.mutants.filter((m) => detected.has(m.status)).length;
    const valid = hit + data.mutants.filter((m) => undetected.has(m.status)).length;
    totalDetected += hit;
    totalValid += valid;
    perFile.push({ file, hit, valid, score: valid === 0 ? 100 : (hit / valid) * 100 });
  }
}

perFile.sort((a, b) => a.score - b.score);
const lines = [
  "| Archivo | Score | Detectados / válidos |",
  "| --- | ---: | ---: |",
  ...perFile.map((f) => `| ${f.file} | ${f.score.toFixed(1)} % | ${f.hit} / ${f.valid} |`),
];
const score = totalValid === 0 ? 100 : (totalDetected / totalValid) * 100;
const summary = `Mutation score global: ${score.toFixed(2)} % (${totalDetected} / ${totalValid}); umbral ${breakAt} %\n\n${lines.join("\n")}\n`;
writeFileSync("mutation-summary.md", summary);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
if (score < breakAt) {
  console.error(`El score global (${score.toFixed(2)} %) está por debajo del umbral (${breakAt} %).`);
  process.exit(1);
}
