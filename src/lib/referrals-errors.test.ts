import { afterEach, describe, expect, it, vi } from "vitest";

import { scenarios } from "./scenarios";
import { isReferralVisibleToScenario, ReferralContractError, referralsAdapter } from "./referrals";

afterEach(() => vi.restoreAllMocks());

describe("referralsAdapter: errores", () => {
  it("falla con un error de contrato si la respuesta no es JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(referralsAdapter.list()).rejects.toBeInstanceOf(ReferralContractError);
  });

  it("relaya el mensaje del backend ante un error y usa uno genérico si no hay", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ message: "Sin permiso." }, { status: 403 }));
    await expect(referralsAdapter.list()).rejects.toThrow("Sin permiso.");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ otra: 1 }, { status: 500 }));
    await expect(referralsAdapter.list()).rejects.toThrow("No se pudieron cargar las derivaciones.");
  });

  it("falla con un error de contrato si la lista o el detalle no cumplen el esquema", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: [{ id: 1 }], meta: { total: 1 } }));
    await expect(referralsAdapter.list()).rejects.toThrow(/lista de derivaciones/);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: 1 }));
    await expect(referralsAdapter.get("ref/1")).rejects.toThrow(/detalle de la derivación/);
  });

  it("codifica el identificador al pedir el detalle", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: 1 }));
    await referralsAdapter.get("ref/1").catch(() => undefined);
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/referrals/ref%2F1");
  });
});

describe("isReferralVisibleToScenario: derivaciones de arbolado", () => {
  it("Oficina ve todo, pero la cuadrilla no ve derivaciones de intervenciones de arbolado", () => {
    const fromIntervention = { sourceType: "TREE_INTERVENTION", sourceServiceId: "SVC-1043" } as never;
    const withInterventionId = { sourceTreeInterventionId: "ti-1", sourceServiceId: "SVC-1043" } as never;

    expect(isReferralVisibleToScenario(fromIntervention, scenarios.officeDutyQueue)).toBe(true);
    expect(isReferralVisibleToScenario(fromIntervention, scenarios.fieldCrewLeader)).toBe(false);
    expect(isReferralVisibleToScenario(withInterventionId, scenarios.fieldCrewLeader)).toBe(false);
  });

  it("la cuadrilla no ve una derivación sin servicio de origen", () => {
    expect(isReferralVisibleToScenario({ sourceServiceId: "" }, scenarios.fieldCrewLeader)).toBe(false);
  });
});
