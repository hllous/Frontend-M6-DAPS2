import { expect, it } from "vitest";

it("PERF_FAILURE_PROBE: this assertion must fail", () => {
  expect("the probe is active").toBe("the probe must fail");
});
