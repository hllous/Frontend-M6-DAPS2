import { expect, it } from "vitest";
import { buildAttentionSignals } from "./attention-signals";

it("conserva el rango exacto en los enlaces de servicios", () => {
  const states = {
    coverage: { status: "ready", data: { family: "coverage", totals: { notServiced: 1, coveragePct: 90 } } },
    compliance: { status: "loading" }, incidents: { status: "loading" },
  } as Parameters<typeof buildAttentionSignals>[0];
  const signal = buildAttentionSignals(states, { from: "2026-01-03", to: "2026-01-20" })[0];
  expect(signal).toMatchObject({ href: expect.stringContaining("from=2026-01-03&to=2026-01-20") });
});
