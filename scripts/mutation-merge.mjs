// Junta los reportes JSON de los shards de Stryker (carpetas que se pasan como argumentos),
// calcula el mutation score global y falla si queda por debajo de `thresholds.break` de
// stryker.config.json. Fórmula de Stryker: (killed + timeout) / (killed + timeout + survived +
// noCoverage); los mutantes ignorados y los que no compilan o fallan en runtime no cuentan.
//
// Con el modo incremental, el reporte de un shard también trae resultados viejos de archivos que
// ya no son suyos (vienen del cache restaurado). Por eso cada carpeta debe traer
// `stryker.shard.json` y solo se cuentan los mutantes de los archivos y rangos de líneas que le
// tocaron a ese shard.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dirs = process.argv.slice(2);
const breakAt = JSON.parse(readFileSync("stryker.config.json", "utf8")).thresholds.break;
const detected = new Set(["Killed", "Timeout"]);
const undetected = new Set(["Survived", "NoCoverage"]);

/** `src/a/\[id\]/route.ts:10-20` -> { file: "src/a/[id]/route.ts", from: 10, to: 20 } */
function parseSpec(spec) {
  const clean = spec.replaceAll("\\", "");
  const match = /^(.*):(\d+)-(\d+)$/.exec(clean);
  return match ? { file: match[1], from: Number(match[2]), to: Number(match[3]) } : { file: clean, from: 1, to: Infinity };
}

const perFile = new Map();
for (const dir of dirs) {
  const reportPath = join(dir, "mutation.json");
  const configPath = join(dir, "stryker.shard.json");
  if (!existsSync(reportPath) || !existsSync(configPath)) {
    console.error(`Falta mutation.json o stryker.shard.json en ${dir}`);
    process.exit(1);
  }
  const specs = JSON.parse(readFileSync(configPath, "utf8")).mutate.map(parseSpec);
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  for (const [file, data] of Object.entries(report.files)) {
    const ranges = specs.filter((s) => s.file === file);
    if (ranges.length === 0) continue;
    const entry = perFile.get(file) ?? { hit: 0, valid: 0 };
    for (const mutant of data.mutants) {
      const line = mutant.location.start.line;
      if (!ranges.some((r) => line >= r.from && line <= r.to)) continue;
      if (detected.has(mutant.status)) {
        entry.hit += 1;
        entry.valid += 1;
      } else if (undetected.has(mutant.status)) {
        entry.valid += 1;
      }
    }
    perFile.set(file, entry);
  }
}

const rows = [...perFile.entries()]
  .map(([file, { hit, valid }]) => ({ file, hit, valid, score: valid === 0 ? 100 : (hit / valid) * 100 }))
  .sort((a, b) => a.score - b.score);
const totalDetected = rows.reduce((sum, r) => sum + r.hit, 0);
const totalValid = rows.reduce((sum, r) => sum + r.valid, 0);
const score = totalValid === 0 ? 100 : (totalDetected / totalValid) * 100;
const lines = [
  "| Archivo | Score | Detectados / válidos |",
  "| --- | ---: | ---: |",
  ...rows.map((f) => `| ${f.file} | ${f.score.toFixed(1)} % | ${f.hit} / ${f.valid} |`),
];
const summary = `Mutation score global: ${score.toFixed(2)} % (${totalDetected} / ${totalValid}); umbral ${breakAt} %\n\n${lines.join("\n")}\n`;
writeFileSync("mutation-summary.md", summary);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
if (score < breakAt) {
  console.error(`El score global (${score.toFixed(2)} %) está por debajo del umbral (${breakAt} %).`);
  process.exit(1);
}
