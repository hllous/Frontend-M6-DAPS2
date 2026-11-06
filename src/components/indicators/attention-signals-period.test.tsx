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

it("suma la zona y el tipo de servicio elegidos a los enlaces de servicios", () => {
  const states = {
    coverage: { status: "ready", data: { family: "coverage", totals: { notServiced: 1, coveragePct: 90 } } },
    compliance: { status: "ready", data: { family: "compliance", finished: { late: 2, onTimePct: 80 } } },
    incidents: { status: "loading" },
  } as unknown as Parameters<typeof buildAttentionSignals>[0];
  const [notServiced, late] = buildAttentionSignals(states, { from: "2026-01-03", to: "2026-01-20", zoneId: "zone-3", serviceTypeId: "st-waste-route" });
  for (const signal of [notServiced, late]) {
    const href = "href" in signal ? signal.href : "";
    expect(href).toContain("from=2026-01-03&to=2026-01-20&zone=zone-3&serviceType=st-waste-route");
  }
});
