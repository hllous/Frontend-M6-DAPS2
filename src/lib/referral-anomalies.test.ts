import { describe, expect, it } from "vitest";

import { fixtureReferrals } from "@/app/api/referrals/route";
import { getReferralAnomalies, isReferralStale, REFERRAL_STALE_AFTER_HOURS } from "./referral-anomalies";
import { serviceFixtures } from "./services-fixtures";

describe("referral anomaly detection", () => {
  it("keeps the 72-hour stale window strict and only flags open referrals", () => {
    expect(REFERRAL_STALE_AFTER_HOURS).toBe(72);
    const referral = fixtureReferrals().find((candidate) => candidate.kind === "REPAIR_REQUEST");
    if (!referral) throw new Error("Expected a repair referral fixture");
    const staleReferral = { ...referral, updatedAt: "2026-01-01T00:00:00.000Z" };

    expect(isReferralStale(staleReferral, new Date("2026-01-04T00:00:00.001Z"))).toBe(true);
    expect(isReferralStale(staleReferral, new Date("2026-01-04T00:00:00.000Z"))).toBe(false);
    expect(isReferralStale({ ...staleReferral, status: "CLOSED" }, new Date("2026-01-04T00:00:00.001Z"))).toBe(false);
  });

  it("parses timestamps without an offset as local time at the stale boundary", () => {
    const referral = fixtureReferrals().find((candidate) => candidate.kind === "REPAIR_REQUEST");
    if (!referral) throw new Error("Expected a repair referral fixture");
    const localStart = new Date(2026, 0, 1, 12, 30, 0);
    const offsetFreeReferral = { ...referral, updatedAt: "2026-01-01T12:30:00" };

    expect(isReferralStale(offsetFreeReferral, new Date(localStart.getTime() + 72 * 60 * 60 * 1000))).toBe(false);
    expect(isReferralStale(offsetFreeReferral, new Date(localStart.getTime() + 72 * 60 * 60 * 1000 + 1))).toBe(true);
  });

  it("falls back to createdAt when updatedAt is empty", () => {
    const referral = fixtureReferrals().find((candidate) => candidate.kind === "REPAIR_REQUEST");
    if (!referral) throw new Error("Expected a repair referral fixture");
    const createdOnly = { ...referral, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "" };

    expect(isReferralStale(createdOnly, new Date("2026-01-04T00:00:00.001Z"))).toBe(true);
  });

  it("matches open repair referrals only when source, damage class, and location agree", () => {
    const [repair] = fixtureReferrals().filter((referral) => referral.kind === "REPAIR_REQUEST");
    if (!repair || repair.kind !== "REPAIR_REQUEST") throw new Error("Expected a repair referral fixture");
    const matching = { ...repair, id: "RR-118-MATCH" };
    const differentDamage = { ...repair, id: "RR-118-DAMAGE", request: { ...repair.request, damageType: "BLOCKED_DRAIN" as const } };
    const differentLocation = { ...repair, id: "RR-118-LOCATION", request: { ...repair.request, address: "Av. distinta 900" } };
    const differentSourceType = { ...repair, id: "RR-118-SOURCE-TYPE", request: { ...repair.request, detectedInType: "INSPECTION" as const } };
    const terminal = { ...repair, id: "RR-118-CLOSED", status: "CLOSED" as const };
    const anomalies = getReferralAnomalies([repair, matching, differentDamage, differentLocation, differentSourceType, terminal], new Map());

    expect(anomalies.get(repair.id)?.duplicateReferralIds).toEqual([matching.id]);
    expect(anomalies.get(matching.id)?.duplicateReferralIds).toEqual([repair.id]);
    expect(anomalies.get(differentDamage.id)?.duplicateReferralIds).toEqual([]);
    expect(anomalies.get(differentLocation.id)?.duplicateReferralIds).toEqual([]);
    expect(anomalies.get(differentSourceType.id)?.duplicateReferralIds).toEqual([]);
    expect(anomalies.get(terminal.id)?.duplicateReferralIds).toEqual([]);
  });

  it("matches open street-closure referrals only when closure type and affected sections agree", () => {
    const closure = fixtureReferrals().find((referral) => referral.kind === "STREET_CLOSURE_REQUEST" && referral.sourceType === "SERVICE");
    if (!closure || closure.kind !== "STREET_CLOSURE_REQUEST") throw new Error("Expected a Service closure fixture");
    const matching = { ...closure, id: "SCR-118-MATCH" };
    const differentClosureType = { ...closure, id: "SCR-118-TYPE", request: { ...closure.request, closureType: "TOTAL" as const } };
    const differentLocation = {
      ...closure,
      id: "SCR-118-LOCATION",
      request: { ...closure.request, affectedSections: closure.request.affectedSections.map((section) => ({ ...section, fromCross: "Calle 99" })) },
    };
    const anomalies = getReferralAnomalies([closure, matching, differentClosureType, differentLocation], new Map());

    expect(anomalies.get(closure.id)?.duplicateReferralIds).toEqual([matching.id]);
    expect(anomalies.get(matching.id)?.duplicateReferralIds).toEqual([closure.id]);
    expect(anomalies.get(differentClosureType.id)?.duplicateReferralIds).toEqual([]);
    expect(anomalies.get(differentLocation.id)?.duplicateReferralIds).toEqual([]);
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
