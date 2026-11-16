import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { buildGrep, collectUnits, selectShard } = require("./e2e-shard.cjs");

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
