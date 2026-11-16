// Corre Stryker sobre una parte (shard) de los archivos a mutar, para repartir la corrida
// en varios jobs de GitHub Actions (mutation.yml). Uso: node scripts/mutation-shard.mjs <i> <n>
// Parte de stryker.config.json, reemplaza `mutate` por los archivos del shard y pone
// thresholds.break en 0: el umbral se exige sobre el score global (scripts/mutation-merge.mjs),
// no sobre cada parte.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";

const [index, count] = process.argv.slice(2).map(Number);
if (!Number.isInteger(index) || !Number.isInteger(count) || index < 0 || index >= count) {
  console.error("Uso: node scripts/mutation-shard.mjs <indice> <cantidad>");
  process.exit(2);
}

const base = JSON.parse(readFileSync("stryker.config.json", "utf8"));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full.split("\\").join("/"));
  }
  return out;
}

// Mismo alcance que `mutate` de stryker.config.json: src/lib (sin tests, fixtures ni .d.ts) y
// los handlers de las rutas BFF.
const files = [
  ...walk("src/lib").filter(
    (f) => /\.ts$/.test(f) && !/\.(test|spec)\.ts$/.test(f) && !/-fixtures\.ts$/.test(f) && !/\.d\.ts$/.test(f),
  ),
  ...walk("src/app/api").filter((f) => posix.basename(f) === "route.ts"),
];

// Reparto voraz por peso (bytes del archivo, que aproxima la cantidad de mutantes y el costo de
// probarlos). Un archivo que pesa más que un shard (src/lib/services.ts) se parte en rangos de
// líneas (`archivo:desde-hasta`, sintaxis de `mutate` de Stryker) para que ningún shard cargue solo con él.
const totalBytes = files.reduce((sum, f) => sum + statSync(f).size, 0);
const maxChunk = totalBytes / count / 2;
const units = [];
for (const file of files) {
  const size = statSync(file).size;
  if (size <= maxChunk) {
    units.push({ spec: file, size });
    continue;
  }
  const lineCount = readFileSync(file, "utf8").split("\n").length;
  const parts = Math.ceil(size / maxChunk);
  const perPart = Math.ceil(lineCount / parts);
  for (let from = 1; from <= lineCount; from += perPart) {
    units.push({ spec: `${file}:${from}-${Math.min(from + perPart - 1, lineCount)}`, size: size / parts });
  }
}
const shards = Array.from({ length: count }, () => ({ size: 0, files: [] }));
for (const unit of units.sort((a, b) => b.size - a.size || a.spec.localeCompare(b.spec))) {
  const lightest = shards.reduce((min, s) => (s.size < min.size ? s : min));
  lightest.files.push(unit.spec);
  lightest.size += unit.size;
}

const config = {
  ...base,
  // `mutate` son globs: los corchetes de las rutas dinámicas ([id]) se escapan para que sean literales.
  mutate: shards[index].files.map((spec) => spec.replace(/[[\]]/g, "\\$&")),
  thresholds: { ...base.thresholds, break: 0 },
};
mkdirSync("reports/mutation", { recursive: true });
const configPath = "reports/mutation/stryker.shard.json";
writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`Shard ${index + 1}/${count}: ${config.mutate.length} archivos`);

const result = spawnSync("pnpm", ["exec", "stryker", "run", configPath], { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
