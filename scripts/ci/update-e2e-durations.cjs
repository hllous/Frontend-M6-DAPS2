// Regenera scripts/ci/e2e-durations.json a partir de logs de CI (#981), para que
// e2e-shard.cjs reparta los shards por duración. Uso:
//   gh run view <run-id> --log > run.log   (uno o más runs verdes de ci.yml)
//   node scripts/ci/update-e2e-durations.cjs run.log [otro.log ...]
// Toma la línea de cada test del reporter `list` (`✓ N [chromium] › archivo:l:c › título (Xs)`)
// y guarda el promedio por título completo, el mismo que arma e2e-shard.cjs.

const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const LINE = /(?:✓|✘)\s+\d+ \[chromium\] › (\S+?):\d+:\d+ › (.*) \(([\d.]+)(m?s)\)\s*$/;

function parseDurations(texts) {
  const samples = new Map();
  for (const text of texts) {
    for (const line of text.split(/\r?\n/)) {
      const match = LINE.exec(line);
      if (!match) continue;
      const title = ["chromium", path.basename(match[1]), ...match[2].split(" › ")].join(" ");
      const seconds = Number(match[3]) / (match[4] === "ms" ? 1000 : 1);
      samples.set(title, [...(samples.get(title) ?? []), seconds]);
    }
  }

  const durations = {};
  for (const title of [...samples.keys()].sort()) {
    const values = samples.get(title);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    durations[title] = Math.max(0.1, Math.round(mean * 10) / 10);
  }
  return durations;
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Uso: node scripts/ci/update-e2e-durations.cjs <log> [<log> ...]");
    process.exit(1);
  }
  const durations = parseDurations(files.map((file) => readFileSync(file, "utf8")));
  writeFileSync(path.join(__dirname, "e2e-durations.json"), `${JSON.stringify(durations, null, 2)}\n`);
  console.log(`${Object.keys(durations).length} tests`);
}

module.exports = { parseDurations };
