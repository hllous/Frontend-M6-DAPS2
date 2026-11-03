import { describe, expect, it } from "vitest";
import { capabilitiesForRoles } from "@/lib/m6-roles";

describe("permisos del monitor de integración", () => {
  it("permite leer a administradores y auditores, y reserva detalle y reintentos a administradores", () => {
    expect(capabilitiesForRoles(["M6_ADMIN"])).toEqual(expect.arrayContaining(["integrationMonitor:view", "integrationMonitor:manage"]));
    expect(capabilitiesForRoles(["M6_AUDITOR"])).toContain("integrationMonitor:view");
    expect(capabilitiesForRoles(["M6_AUDITOR"])).not.toContain("integrationMonitor:manage");
    expect(capabilitiesForRoles(["M6_OFICINA_OPERACIONES"])).not.toContain("integrationMonitor:view");
  });
});
