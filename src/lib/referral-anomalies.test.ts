import { describe, expect, it } from "vitest";

import { fixtureReferrals } from "@/app/api/referrals/route";
import { getReferralAnomalies, isReferralStale, REFERRAL_STALE_AFTER_HOURS } from "./referral-anomalies";
import { serviceFixtures } from "./services-fixtures";

describe("referral anomaly detection", () => {
  it("keeps the stale window explicit and only flags open referrals", () => {
    expect(REFERRAL_STALE_AFTER_HOURS).toBe(72);
    const referral = fixtureReferrals().find((candidate) => candidate.kind === "REPAIR_REQUEST");
    if (!referral) throw new Error("Expected a repair referral fixture");
    const staleReferral = { ...referral, updatedAt: "2026-01-01T00:00:00.000Z" };

    expect(isReferralStale(staleReferral, new Date("2026-01-04T00:00:01.000Z"))).toBe(true);
    expect(isReferralStale({ ...staleReferral, status: "CLOSED" }, new Date("2026-01-04T00:00:01.000Z"))).toBe(false);
  });

  it("groups duplicate candidates by kind and source Service, excluding terminal records", () => {
    const [repair] = fixtureReferrals().filter((referral) => referral.kind === "REPAIR_REQUEST");
    if (!repair) throw new Error("Expected a repair referral fixture");
    const duplicate = { ...repair, id: "RR-118-DUPLICATE" };
    const terminal = { ...repair, id: "RR-118-CLOSED", status: "CLOSED" as const };
    const anomalies = getReferralAnomalies([repair, duplicate, terminal], new Map());

    expect(anomalies.get(repair.id)?.duplicateReferralIds).toEqual([duplicate.id]);
    expect(anomalies.get(duplicate.id)?.duplicateReferralIds).toEqual([repair.id]);
    expect(anomalies.get(terminal.id)?.duplicateReferralIds).toEqual([]);
  });

  it("compares live Service data with the referral source context", () => {
    const closure = fixtureReferrals().find((referral) => referral.kind === "STREET_CLOSURE_REQUEST" && referral.sourceType === "SERVICE");
    const service = serviceFixtures.find((candidate) => candidate.id === closure?.sourceServiceId);
    if (!closure || closure.kind !== "STREET_CLOSURE_REQUEST" || !service) throw new Error("Expected closure and source fixtures");

    const changed = {
      ...closure,
      request: {
        ...closure.request,
        sourceContext: { ...closure.request.sourceContext, scheduledDate: "2026-09-07" },
      },
    };
    const anomalies = getReferralAnomalies([changed], new Map([[service.id, service]]));

    expect(anomalies.get(changed.id)?.sourceChanges).toEqual([
      { field: "Fecha programada", recordedValue: "2026-09-07", currentValue: service.scheduledDate },
    ]);
  });
});
