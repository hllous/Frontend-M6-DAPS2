import { describe, expect, it } from "vitest";

import { getReferralSourceServiceIds, isReferralVisibleToScenario, type Referral } from "./referrals";
import { scenarios } from "./scenarios";

const repairReferral = {
  kind: "REPAIR_REQUEST",
  id: "RR-1001",
  sourceServiceId: "SVC-1050",
} as Referral;

const otherServiceReferral = {
  kind: "STREET_CLOSURE_REQUEST",
  id: "SCR-OTHER",
  sourceServiceId: "SVC-1042",
} as Referral;

describe("referral visibility boundary", () => {
  it("gives Office the complete referral workspace", () => {
    expect(getReferralSourceServiceIds(scenarios.officeDutyQueue)).toBeUndefined();
    expect(isReferralVisibleToScenario(repairReferral, scenarios.officeDutyQueue)).toBe(true);
  });

  it("limits Field to Services assigned to the acting crew", () => {
    expect(getReferralSourceServiceIds(scenarios.fieldCrewLeader)).toContain("SVC-1050");
    expect(isReferralVisibleToScenario(repairReferral, scenarios.fieldCrewLeader)).toBe(true);
    expect(isReferralVisibleToScenario(otherServiceReferral, scenarios.fieldCrewLeader)).toBe(false);
  });
});
