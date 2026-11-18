// Junta los reportes JSON de los shards de Stryker (carpetas que se pasan como argumentos),
// calcula el mutation score global y falla si queda por debajo de `thresholds.break` de
// stryker.config.json. Fórmula de Stryker: (killed + timeout) / (killed + timeout + survived +
// noCoverage); los mutantes ignorados y los que no compilan o fallan en runtime no cuentan.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const detected = new Set(["Killed", "Timeout"]);
const undetected = new Set(["Survived", "NoCoverage"]);

// Un mutante puede venir en más de un shard: un archivo partido en rangos aparece en varios
// reportes (cada uno con sus mutantes), pero en la corrida del 16/11 (run 43952775688) 15
// archivos vinieron enteros en dos shards y se contaron dos veces. Se cuenta cada mutante una
// vez, identificado por archivo, posición, mutador y reemplazo; si dos shards difieren, gana
// el que lo detectó.
export function mergeReports(reports) {
  const mutants = new Map();
  for (const report of reports) {
    for (const [file, data] of Object.entries(report.files)) {
      for (const m of data.mutants) {
        const { start, end } = m.location;
        const key = `${file}|${start.line}:${start.column}-${end.line}:${end.column}|${m.mutatorName}|${m.replacement}`;
        const seen = mutants.get(key);
        if (!seen || (!detected.has(seen.status) && detected.has(m.status))) mutants.set(key, { file, status: m.status });
      }
    }
  }
  const byFile = new Map();
  for (const { file, status } of mutants.values()) {
    const f = byFile.get(file) ?? { file, hit: 0, valid: 0 };
    if (detected.has(status)) f.hit++;
    if (detected.has(status) || undetected.has(status)) f.valid++;
    byFile.set(file, f);
  }
  const perFile = [...byFile.values()].map((f) => ({ ...f, score: f.valid === 0 ? 100 : (f.hit / f.valid) * 100 }));
  const hit = perFile.reduce((sum, f) => sum + f.hit, 0);
  const valid = perFile.reduce((sum, f) => sum + f.valid, 0);
  return { perFile, hit, valid, score: valid === 0 ? 100 : (hit / valid) * 100 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const breakAt = JSON.parse(readFileSync("stryker.config.json", "utf8")).thresholds.break;
  const reports = process.argv.slice(2).map((dir) => {
    const path = join(dir, "mutation.json");
    if (!existsSync(path)) {
      console.error(`Falta ${path}`);
      process.exit(1);
    }
    return JSON.parse(readFileSync(path, "utf8"));
  });
  const { perFile, hit, valid, score } = mergeReports(reports);
  perFile.sort((a, b) => a.score - b.score);
  const lines = [
    "| Archivo | Score | Detectados / válidos |",
    "| --- | ---: | ---: |",
    ...perFile.map((f) => `| ${f.file} | ${f.score.toFixed(1)} % | ${f.hit} / ${f.valid} |`),
  ];
  const summary = `Mutation score global: ${score.toFixed(2)} % (${hit} / ${valid}); umbral ${breakAt} %\n\n${lines.join("\n")}\n`;
  writeFileSync("mutation-summary.md", summary);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  if (score < breakAt) {
    console.error(`El score global (${score.toFixed(2)} %) está por debajo del umbral (${breakAt} %).`);
    process.exit(1);
  }
}
