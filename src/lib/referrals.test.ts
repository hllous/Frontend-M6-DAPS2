import { describe, expect, it } from "vitest";

import {
  getReferralSourceServiceIds,
  isReferralVisibleToScenario,
  referralFromStreetClosureRequest,
  treeInterventionSourceHref,
  type Referral,
} from "./referrals";
import { scenarios } from "./scenarios";
import { streetClosureRequestFixtures } from "./street-closure-request-fixtures";

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

  it("keeps TreeIntervention referrals Office-only and points to the catalog source", () => {
    const request = streetClosureRequestFixtures.find((candidate) => candidate.sourceType === "TREE_INTERVENTION");
    if (!request) throw new Error("Expected a TreeIntervention closure request fixture");
    const referral = referralFromStreetClosureRequest(request);

    expect(referral).toMatchObject({
      sourceType: "TREE_INTERVENTION",
      sourceId: request.sourceId,
      sourceTreeInterventionId: request.sourceId,
      sourceHref: treeInterventionSourceHref(request.sourceId),
    });
    expect(isReferralVisibleToScenario(referral, scenarios.officeDutyQueue)).toBe(true);
    expect(isReferralVisibleToScenario(referral, scenarios.fieldCrewLeader)).toBe(false);
  });
});
