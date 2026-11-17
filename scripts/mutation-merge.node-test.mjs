import assert from "node:assert/strict";
import test from "node:test";

import { mergeReports } from "./mutation-merge.mjs";

const mutant = (line, status, mutatorName = "ConditionalExpression") => ({
  location: { start: { line, column: 1 }, end: { line, column: 9 } },
  mutatorName,
  replacement: "true",
  status,
});
const report = (files) => ({ files: Object.fromEntries(Object.entries(files).map(([f, mutants]) => [f, { mutants }])) });

test("cuenta una sola vez un archivo que viene entero en dos shards", () => {
  const a = report({ "src/lib/a.ts": [mutant(1, "Killed"), mutant(2, "Survived")] });
  const merged = mergeReports([a, a]);
  assert.equal(merged.valid, 2);
  assert.equal(merged.hit, 1);
  assert.equal(merged.score, 50);
  assert.deepEqual(merged.perFile.map((f) => f.file), ["src/lib/a.ts"]);
});

test("suma los rangos disjuntos de un archivo partido en shards en una sola fila", () => {
  const merged = mergeReports([
    report({ "src/lib/a.ts": [mutant(1, "Killed")] }),
    report({ "src/lib/a.ts": [mutant(50, "Survived"), mutant(51, "Timeout")] }),
  ]);
  assert.deepEqual(merged.perFile, [{ file: "src/lib/a.ts", hit: 2, valid: 3, score: (2 / 3) * 100 }]);
});

test("si dos shards difieren en un mutante, gana el que lo detectó", () => {
  const merged = mergeReports([report({ "a.ts": [mutant(1, "Survived")] }), report({ "a.ts": [mutant(1, "Killed")] })]);
  assert.equal(merged.hit, 1);
  assert.equal(merged.valid, 1);
});

test("no cuenta ignorados ni los que no compilan, y sin válidos el score es 100", () => {
  const merged = mergeReports([report({ "a.ts": [mutant(1, "Ignored"), mutant(2, "CompileError"), mutant(3, "RuntimeError")] })]);
  assert.equal(merged.valid, 0);
  assert.equal(merged.score, 100);
});

test("distingue mutantes en la misma posición con otro mutador", () => {
  const merged = mergeReports([report({ "a.ts": [mutant(1, "Killed"), mutant(1, "Survived", "BooleanLiteral")] })]);
  assert.equal(merged.valid, 2);
});
