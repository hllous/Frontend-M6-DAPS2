import { describe, expect, it } from "vitest";

import { referralLabel, reportLabel, shortId } from "./display-ids";

const uuid = "88ef5782-6cd8-4812-9a5e-c14723ff2b72";

describe("display ids (#741)", () => {
  it("labels reports by public number or type and address", () => {
    expect(reportLabel({ reportType: "NOISE", address: "Av. Corrientes 4200", publicId: "TK-2026-000123" })).toBe("TK-2026-000123");
    expect(reportLabel({ reportType: "NOISE", address: "Av. Corrientes 4200" })).toBe("Ruidos molestos · Av. Corrientes 4200");
  });

  it("shortens only UUIDs", () => {
    expect(shortId(uuid)).toBe("#88ef5782");
    expect(shortId("RR-1001")).toBe("RR-1001");
  });

  it("labels referrals by kind, damage and address", () => {
    const labels = { BLOCKED_DRAIN: "Sumidero obstruido" };
    expect(referralLabel({ kind: "REPAIR_REQUEST", request: { damageType: "BLOCKED_DRAIN", address: "Av. Rivadavia 4500" } }, labels))
      .toBe("Reparación · Sumidero obstruido · Av. Rivadavia 4500");
    expect(referralLabel({ kind: "REPAIR_REQUEST", request: { damageType: "BLOCKED_DRAIN", address: null } }, labels))
      .toBe("Reparación · Sumidero obstruido · sin dirección");
    expect(referralLabel({ kind: "STREET_CLOSURE_REQUEST", request: { affectedSections: [{ streetName: "Rivadavia" }], reason: "x" } }, labels))
      .toBe("Corte de calle · Rivadavia");
  });
});
