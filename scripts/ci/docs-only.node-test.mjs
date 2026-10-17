import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { isDocsOnlyChange } = require("./docs-only.cjs");

test("documentation and Markdown configuration changes are docs-only", () => {
  const files = [
    { filename: "docs/agents/ci.md" },
    { filename: "README.md" },
    { filename: ".markdownlint-cli2.jsonc" },
    { filename: "lychee.toml" },
  ];

  assert.equal(isDocsOnlyChange({ changedFiles: files.length, files }), true);
});

test("renaming a documentation file stays docs-only", () => {
  const files = [{ filename: "docs/agents/new-name.md", previous_filename: "docs/agents/old-name.md" }];

  assert.equal(isDocsOnlyChange({ changedFiles: files.length, files }), true);
});

test("a mixed documentation and source change is not docs-only", () => {
  const files = [{ filename: "docs/agents/ci.md" }, { filename: "src/app/page.tsx" }];

  assert.equal(isDocsOnlyChange({ changedFiles: files.length, files }), false);
});

test("workflow-only and package-lock changes are not docs-only", () => {
  for (const filename of [".github/workflows/ci.yml", "package-lock.json"]) {
    assert.equal(isDocsOnlyChange({ changedFiles: 1, files: [{ filename }] }), false, filename);
  }
});

test("empty or incomplete file lists are not docs-only", () => {
  assert.equal(isDocsOnlyChange({ changedFiles: 0, files: [] }), false);
  assert.equal(isDocsOnlyChange({ changedFiles: 2, files: [{ filename: "docs/agents/ci.md" }] }), false);
});
