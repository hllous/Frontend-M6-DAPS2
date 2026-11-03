import { describe, expect, it } from "vitest";

import { getScenario, isScenarioId, scenarios } from "./scenarios";

describe("operational scenarios", () => {
  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "", null, undefined, 42, {}, [], true])(
    "rejects non-scenario values (%j)", (value) => {
      expect(isScenarioId(value)).toBe(false);
    },
  );

  it.each(Object.values(scenarios).map((scenario) => scenario.id))(
    "accepts the real scenario %s", (id) => {
      expect(isScenarioId(id)).toBe(true);
    },
  );

  it("names Office, Field leader, Field member and capability-limited states", () => {
    expect(Object.values(scenarios).map((scenario) => scenario.actor.kind)).toEqual(
      expect.arrayContaining(["OFFICE", "FIELD"]),
    );
    expect(scenarios.fieldCrewLeader.actor.fieldRole).toBe("CREW_LEADER");
    expect(scenarios.fieldCrewMember.actor.fieldRole).toBe("CREW_MEMBER");
    expect(scenarios.officeDutyQueue.capabilities).toContain("service:schedule");
    expect(scenarios.officeDutyQueue.capabilities).toContain("sanctionOutcome:view");
    expect(scenarios.fieldCrewLeader.capabilities).toContain("container:report");
    expect(scenarios.fieldCrewLeader.capabilities).toContain("environmentalInspection:execute");
    expect(scenarios.fieldCrewMember.capabilities).toContain("container:report");
    expect(scenarios.fieldCrewMember.capabilities).not.toContain("environmentalInspection:execute");
    // El integrante comparte el rol de la cuadrilla, pero solo el responsable cambia el estado del servicio.
    expect(scenarios.fieldCrewLeader.capabilities).toContain("service:execute");
    expect(scenarios.fieldCrewMember.capabilities).not.toContain("service:execute");
    // Oficina y Campo no conviven: el administrador no ejecuta trabajo de Campo.
    expect(scenarios.officeDutyQueue.capabilities).not.toContain("container:report");
    expect(scenarios.fieldCrewLeader.capabilities).not.toContain("sanctionOutcome:view");
    // El auditor lee y nada más.
    expect(scenarios.officeLimited.capabilities).toContain("service:view");
    expect(scenarios.officeLimited.capabilities).not.toContain("service:schedule");
    expect(scenarios.officeLimited.capabilities).not.toContain("container:report");
  });

  it("returns operational scenarios by their stable name", () => {
    expect(getScenario("field-crew-leader-route").work.title).toBe("Servicios asignados");
  });
});
