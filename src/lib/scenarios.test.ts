import { describe, expect, it } from "vitest";

import { getScenario, scenarios } from "./scenarios";

describe("operational scenarios", () => {
  it("names Office, Field leader, Field member and capability-limited states", () => {
    expect(Object.values(scenarios).map((scenario) => scenario.actor.kind)).toEqual(
      expect.arrayContaining(["OFFICE", "FIELD"]),
    );
    expect(scenarios.fieldCrewLeader.actor.fieldRole).toBe("CREW_LEADER");
    expect(scenarios.fieldCrewMember.actor.fieldRole).toBe("CREW_MEMBER");
    expect(scenarios.officeLimited.capabilities).not.toContain("inventory:view");
  });

  it("returns operational scenarios by their stable name", () => {
    expect(getScenario("field-crew-leader-route").work.items[0]).toMatch(/recorrido/i);
  });
});
