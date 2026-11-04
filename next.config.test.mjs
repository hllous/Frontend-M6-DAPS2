import { describe, expect, it } from "vitest";

import { resolveNextDistDir, typescriptConfigPathForDistDir } from "./next.config.mjs";

describe("M6_NEXT_DIST_DIR", () => {
  it.each([undefined, "", "../outside", "C:\\outside", ".next/subdir", "."])("falls back to .next for unsafe value %s", (value) => {
    expect(resolveNextDistDir(value)).toBe(".next");
  });

  it.each([".next", ".next-real-m1", ".next-e2e-real-m1"])("accepts a dedicated Next build directory: %s", (value) => {
    expect(resolveNextDistDir(value)).toBe(value);
  });

  it("uses the root TypeScript config only for the default dist directory", () => {
    expect(typescriptConfigPathForDistDir(".next")).toBe("tsconfig.json");
    expect(typescriptConfigPathForDistDir(".next-real-m1")).toBe("tsconfig.next-dist.json");
  });
});
