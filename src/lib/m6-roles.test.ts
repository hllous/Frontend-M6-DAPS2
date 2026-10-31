import { describe, expect, it } from "vitest";

import { actorKindForRoles, capabilitiesForRoles, meSchema } from "./m6-roles";
import { scenarios } from "./scenarios";

describe("M6 roles", () => {
  it("provides selectable fixtures for each role and for denied access", () => {
    expect(scenarios.officeOperations.roles).toEqual(["M6_OFICINA_OPERACIONES"]);
    expect(scenarios.officeEnvironmental.roles).toEqual(["M6_OFICINA_AMBIENTAL"]);
    expect(scenarios.fieldInspector.roles).toEqual(["M6_CAMPO_INSPECTOR"]);
    expect(scenarios.employeeNoRole.roles).toEqual([]);
    expect(scenarios.citizen.subType).toBe("CIUDADANO");
  });
  it("parses the GET /me contract and rejects a role outside the closed catalog", () => {
    const me = { userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: ["M6_OFICINA_OPERACIONES"] };
    expect(meSchema.parse(me).roles).toEqual(["M6_OFICINA_OPERACIONES"]);
    expect(meSchema.safeParse({ ...me, roles: ["M6_SUPERUSER"] }).success).toBe(false);
  });

  it("gives no capability to a user without roles", () => {
    expect(capabilitiesForRoles([])).toEqual([]);
  });

  it("follows the backend table: Operations schedules, Environmental reviews, neither does both", () => {
    const operations = capabilitiesForRoles(["M6_OFICINA_OPERACIONES"]);
    expect(operations).toContain("service:schedule");
    expect(operations).toContain("repairRequest:create");
    expect(operations).not.toContain("environmentalReport:review");
    expect(operations).not.toContain("serviceType:manage");

    const environmental = capabilitiesForRoles(["M6_OFICINA_AMBIENTAL"]);
    expect(environmental).toContain("violationNotice:issue");
    expect(environmental).not.toContain("service:schedule");
  });

  it("reserves authorizing a removal for the Administrator while Operations keeps the route-level authorize", () => {
    expect(capabilitiesForRoles(["M6_ADMIN"])).toEqual(expect.arrayContaining(["treeIntervention:authorize", "treeIntervention:authorizeRemoval"]));
    const operations = capabilitiesForRoles(["M6_OFICINA_OPERACIONES"]);
    expect(operations).toContain("treeIntervention:authorize");
    expect(operations).toContain("treeIntervention:request");
    expect(operations).not.toContain("treeIntervention:authorizeRemoval");
  });

  it("keeps the Administrator out of Field work and the Auditor read-only", () => {
    const admin = capabilitiesForRoles(["M6_ADMIN"]);
    expect(admin).toContain("referral:reconcile");
    expect(admin).not.toContain("service:execute");
    expect(admin).not.toContain("container:report");
    expect(admin).not.toContain("environmentalInspection:execute");

    const auditor = capabilitiesForRoles(["M6_AUDITOR"]);
    expect(auditor).toEqual(expect.arrayContaining(["service:view", "indicator:view", "violationNotice:view"]));
    expect(auditor.filter((capability) => /:(manage|create|execute|issue|schedule|assign|cancel|reschedule|authorize|request|review|close|reconcile|report|survey)$/.test(capability))).toEqual([]);
  });

  it("splits Field work between the crew and the inspector", () => {
    const crew = capabilitiesForRoles(["M6_CAMPO_CUADRILLA"]);
    expect(crew).toEqual(expect.arrayContaining(["service:execute", "container:report", "tree:survey"]));
    expect(crew).not.toContain("environmentalInspection:execute");
    expect(crew).not.toContain("environmentalReport:create");

    const inspector = capabilitiesForRoles(["M6_CAMPO_INSPECTOR"]);
    expect(inspector).toEqual(expect.arrayContaining(["environmentalInspection:execute", "environmentalReport:create", "violationNotice:view"]));
    expect(inspector).not.toContain("service:execute");
  });

  it("classifies the actor: any Office role is Office, only Campo roles are Field", () => {
    expect(actorKindForRoles(["M6_ADMIN"])).toBe("OFFICE");
    expect(actorKindForRoles(["M6_AUDITOR"])).toBe("OFFICE");
    expect(actorKindForRoles(["M6_CAMPO_CUADRILLA", "M6_CAMPO_INSPECTOR"])).toBe("FIELD");
  });

  it("derives each mock scenario's capabilities from its fixture roles", () => {
    expect(scenarios.officeDutyQueue.actor.kind).toBe("OFFICE");
    expect(scenarios.fieldCrewLeader.actor.kind).toBe("FIELD");
    expect(scenarios.fieldCrewMember.actor.kind).toBe("FIELD");
    expect(scenarios.officeLimited.capabilities).toEqual(capabilitiesForRoles(["M6_AUDITOR"]));
  });
});
