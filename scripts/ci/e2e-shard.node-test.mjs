import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { buildGrep, collectUnits, readDurations, selectShard, unitWeights } = require("./e2e-shard.cjs");

const report = {
  suites: [
    {
      title: "a.spec.ts",
      specs: [{ title: "opens", tests: [{ projectName: "chromium" }] }],
      suites: [
        {
          title: "Catalog",
          specs: [
            { title: "lists rows", tests: [{ projectName: "chromium" }] },
            // The same declaration run for two projects.
            { title: "filters", tests: [{ projectName: "chromium" }, { projectName: "real-m1" }] },
          ],
        },
      ],
    },
    { title: "b.spec.ts", specs: [{ title: "closes", tests: [{ projectName: "chromium" }] }] },
  ],
};

test("collects the full title path of each test, in report order, through nested suites", () => {
  assert.deepEqual(collectUnits(report, "chromium"), [
    ["chromium a.spec.ts opens"],
    ["chromium a.spec.ts Catalog lists rows"],
    ["chromium a.spec.ts Catalog filters"],
    ["chromium b.spec.ts closes"],
  ]);
});

test("only the requested project is collected", () => {
  assert.deepEqual(collectUnits(report, "real-m1"), [["real-m1 a.spec.ts Catalog filters"]]);
});

test("an empty or missing report has no units", () => {
  assert.deepEqual(collectUnits({}, "chromium"), []);
  assert.deepEqual(collectUnits(undefined, "chromium"), []);
});

test("all tests of a serial spec file form one unit so they stay in the same shard", () => {
  const units = collectUnits(report, "chromium", new Set(["a.spec.ts"]));

  assert.deepEqual(units, [
    ["chromium a.spec.ts opens", "chromium a.spec.ts Catalog lists rows", "chromium a.spec.ts Catalog filters"],
    ["chromium b.spec.ts closes"],
  ]);
});

test("duplicate title paths are collected once so they run in a single shard", () => {
  const duplicated = {
    suites: [
      {
        title: "a.spec.ts",
        specs: [
          { title: "same", tests: [{ projectName: "chromium" }] },
          { title: "same", tests: [{ projectName: "chromium" }] },
        ],
      },
    ],
  };

  assert.deepEqual(collectUnits(duplicated, "chromium"), [["chromium a.spec.ts same"]]);
});

test("every title lands in exactly one shard and shards differ in size by at most one", () => {
  const titles = Array.from({ length: 23 }, (_, index) => `title ${index}`);
  const units = titles.map((title) => [title]);
  const shards = [1, 2, 3, 4, 5].map((current) => selectShard(units, current, 5));

  assert.deepEqual([...shards.flat()].sort(), [...titles].sort());
  const sizes = shards.map((shard) => shard.length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
});

test("neighbouring titles are spread across different shards", () => {
  const units = [["a"], ["b"], ["c"], ["d"]];

  assert.deepEqual(selectShard(units, 1, 2), ["a", "c"]);
  assert.deepEqual(selectShard(units, 2, 2), ["b", "d"]);
});

test("a multi-test unit is never split between shards", () => {
  const units = [["a1", "a2"], ["b"], ["c"]];

  assert.deepEqual(selectShard(units, 1, 2), ["a1", "a2", "c"]);
  assert.deepEqual(selectShard(units, 2, 2), ["b"]);
});

test("an out-of-range shard is rejected", () => {
  assert.throws(() => selectShard([["a"]], 0, 3), RangeError);
  assert.throws(() => selectShard([["a"]], 4, 3), RangeError);
});

test("the grep pattern matches exactly the selected titles, with or without trailing tags", () => {
  const pattern = new RegExp(buildGrep(["chromium a.spec.ts opens (v1.0)", "chromium b.spec.ts closes"]));

  assert.ok(pattern.test("chromium a.spec.ts opens (v1.0)"));
  assert.ok(pattern.test("chromium b.spec.ts closes @smoke @smoke"));
  assert.ok(!pattern.test("chromium a.spec.ts opens (v1.0) and more"));
  assert.ok(!pattern.test("chromium a.spec.ts opens (v1x0)"));
});

test("an empty selection builds a pattern that matches nothing", () => {
  assert.equal(new RegExp(buildGrep([])).test("chromium a.spec.ts opens"), false);
});

test("weighted units go heaviest first to the least loaded shard", () => {
  const units = [["slow"], ["a"], ["b"], ["c"], ["d"]];
  const weights = [10, 3, 3, 2, 2];

  assert.deepEqual(selectShard(units, 1, 2, weights), ["slow"]);
  assert.deepEqual(selectShard(units, 2, 2, weights), ["a", "b", "c", "d"]);
});

test("with weights, every title still lands in exactly one shard", () => {
  const units = Array.from({ length: 41 }, (_, index) => [`title ${index}`]);
  const weights = units.map((_, index) => (index * 7) % 11);
  const shards = [1, 2, 3, 4, 5, 6, 7, 8].map((current) => selectShard(units, current, 8, weights));

  assert.deepEqual([...shards.flat()].sort(), units.flat().sort());
});

test("a unit weighs the sum of its tests and an unknown test weighs the median", () => {
  const durations = { a: 1, b: 2, c: 9 };

  assert.deepEqual(unitWeights([["a", "c"], ["new"], ["b"]], durations), [10, 2, 2]);
  assert.deepEqual(unitWeights([["x"], ["y", "z"]], {}), [1, 2]);
});

test("the committed durations file parses to positive numbers", () => {
  const durations = readDurations();

  assert.ok(Object.keys(durations).length > 0);
  assert.ok(Object.values(durations).every((value) => Number.isFinite(value) && value > 0));
});

test("durations are parsed from list-reporter lines with the same full title the shards use", () => {
  const { parseDurations } = require("./update-e2e-durations.cjs");
  const log = [
    "e2e shard 1/8\tPlaywright\t2026-11-16T17:07:27.0689658Z   ✓   1 [chromium] › e2e/a.spec.ts:6:5 › Catalog › lists rows (5.7s)",
    "2026-11-16T17:07:28.0Z   ✓   2 [chromium] › e2e/a.spec.ts:9:5 › Catalog › lists rows (300ms)",
    "2026-11-16T17:07:29.0Z   ✓   3 [chromium] › e2e/b.spec.ts:1:1 › closes (20ms)",
    "2026-11-16T17:07:30.0Z Running 3 tests using 1 worker",
  ].join("\n");

  assert.deepEqual(parseDurations([log]), {
    "chromium a.spec.ts Catalog lists rows": 3,
    "chromium b.spec.ts closes": 0.1,
  });
});
