// Reparte los tests de Playwright entre shards de CI en round-robin por test en lugar
// de `--shard`, que corta bloques contiguos: los specs pesados (shell-page-scroll,
// catalog-page-overflow, ...) caían juntos y un shard tardaba el doble que otro.
// Imprime un patrón para `--grep` con el título completo de cada test del shard.

const { spawnSync } = require("node:child_process");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

// Un grupo serial (`describe.serial` o `mode: "serial"`) comparte estado entre sus tests:
// partirlo entre shards lo rompería, así que todo el archivo viaja junto.
const SERIAL_MARKER = /describe\.serial|mode:\s*["']serial["']/;

function findSerialFiles(testDir) {
  return new Set(
    readdirSync(testDir)
      .filter((name) => name.endsWith(".spec.ts"))
      .filter((name) => SERIAL_MARKER.test(readFileSync(path.join(testDir, name), "utf8"))),
  );
}

// Devuelve unidades de reparto: un test suelto, o todos los tests de un archivo serial.
function collectUnits(report, project, serialFiles = new Set()) {
  const units = new Map();
  const seen = new Set();

  function visit(suite, trail) {
    const here = [...trail, suite.title];
    for (const spec of suite.specs ?? []) {
      for (const entry of spec.tests ?? []) {
        if (entry.projectName !== project) continue;
        const title = [project, ...here, spec.title].join(" ");
        if (seen.has(title)) continue;
        seen.add(title);
        const key = serialFiles.has(here[0]) ? `file:${here[0]}` : `test:${title}`;
        units.set(key, [...(units.get(key) ?? []), title]);
      }
    }
    for (const child of suite.suites ?? []) {
      visit(child, here);
    }
  }

  for (const suite of report?.suites ?? []) {
    visit(suite, []);
  }

  return [...units.values()];
}

function selectShard(units, current, total) {
  if (!Number.isInteger(current) || !Number.isInteger(total) || total < 1 || current < 1 || current > total) {
    throw new RangeError(`Invalid shard ${current}/${total}`);
  }

  return units.filter((_, index) => index % total === current - 1).flat();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Playwright matches --grep against "<project> <file> <describes> <title>" followed by the
// test's tags, each preceded by a space; anchoring both ends keeps a title that is a prefix
// of another from pulling that one into the shard.
function buildGrep(titles) {
  if (titles.length === 0) {
    return "(?!)";
  }

  return `^(?:${titles.map(escapeRegExp).join("|")})(?: @\\S+)*$`;
}

function listReport(project) {
  const result = spawnSync(
    "pnpm",
    ["exec", "playwright", "test", "--list", "--reporter=json", `--project=${project}`],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32" },
  );

  if (result.status !== 0) {
    throw new Error(`playwright --list failed:\n${result.stderr}`);
  }

  return JSON.parse(result.stdout);
}

function main(argv) {
  const args = Object.fromEntries(argv.map((arg) => arg.replace(/^--/, "").split("=")));
  const project = args.project ?? "chromium";
  const [current, total] = String(args.shard ?? "").split("/").map(Number);
  const report = listReport(project);
  const testDir = report.config.projects.find((entry) => entry.name === project)?.testDir ?? report.config.rootDir;

  process.stdout.write(buildGrep(selectShard(collectUnits(report, project, findSerialFiles(testDir)), current, total)));
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { buildGrep, collectUnits, findSerialFiles, selectShard };
