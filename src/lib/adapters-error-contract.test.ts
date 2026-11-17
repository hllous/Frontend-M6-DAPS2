import { afterEach, describe, expect, it, vi } from "vitest";

import { NetworkFailureError } from "./authenticated-fetch";
import { CrewContractError } from "./crews";
import { crewZoneAssignmentsAdapter, CrewZoneAssignmentRequestError } from "./crew-zone-assignments";
import { TreeSurveyContractError, TreeSurveyRequestError, treeSurveysAdapter } from "./tree-surveys";
import { searchAddresses, suggestStreets } from "./address-search";

afterEach(() => vi.restoreAllMocks());

const envelope = (statusCode: number, message: string | string[]) => Response.json({ statusCode, message }, { status: statusCode });

describe("crew zone assignments adapter: errores", () => {
  it("relaya el mensaje y el estado del backend", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(envelope(409, ["La cuadrilla ya está asignada.", "Revise las fechas."]));
    const failure = await crewZoneAssignmentsAdapter.list("crew-a").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(CrewZoneAssignmentRequestError);
    expect(failure).toMatchObject({ status: 409, message: "La cuadrilla ya está asignada. Revise las fechas." });
  });

  it("falla con un error de contrato si el error no sigue el formato", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ raro: true }, { status: 500 }));
    await expect(crewZoneAssignmentsAdapter.list("crew-a")).rejects.toBeInstanceOf(CrewContractError);
  });

  it("falla con un error de contrato si la respuesta no es JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(crewZoneAssignmentsAdapter.list("crew-a")).rejects.toThrow(/información válida/);
  });

  it("falla con un error de contrato si el historial o la reubicación creada no cumplen el esquema", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ id: 1 }]));
    await expect(crewZoneAssignmentsAdapter.list("crew-a")).rejects.toBeInstanceOf(CrewContractError);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: 1 }));
    await expect(crewZoneAssignmentsAdapter.create("crew-a", { zoneId: "zone-1", validFrom: "2099-01-01", validTo: null, reason: "x" })).rejects.toBeInstanceOf(CrewContractError);
  });

  it("no pide nada si los datos de la reubicación son inválidos", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(crewZoneAssignmentsAdapter.create("crew-a", { zoneId: "zone-1", validFrom: "2099-02-01", validTo: "2099-01-01", reason: "x" })).rejects.toBeInstanceOf(CrewContractError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("propaga la falla de red", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(crewZoneAssignmentsAdapter.list("crew-a")).rejects.toBeInstanceOf(NetworkFailureError);
  });
});

describe("tree surveys adapter: errores", () => {
  it("relaya el mensaje y el estado del backend", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ statusCode: 404, message: "El árbol no existe.", error: "Not Found", timestamp: "t", path: "/api/trees/tree-x/surveys" }, { status: 404 }));
    const failure = await treeSurveysAdapter.getTreeSurveys("tree-x").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TreeSurveyRequestError);
    expect(failure).toMatchObject({ status: 404, message: "El árbol no existe." });
  });

  it("falla con un error de contrato si el error no sigue el formato o la respuesta no es JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ raro: true }, { status: 500 }));
    await expect(treeSurveysAdapter.getTreeSurveys("tree-x")).rejects.toBeInstanceOf(TreeSurveyContractError);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    await expect(treeSurveysAdapter.getTreeSurveys("tree-x")).rejects.toBeInstanceOf(TreeSurveyContractError);
  });

  it("falla con un error de contrato si el historial o un relevamiento no cumplen el esquema", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: "no", meta: {} }));
    await expect(treeSurveysAdapter.getTreeSurveys("tree-x")).rejects.toBeInstanceOf(TreeSurveyContractError);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: 1 }));
    await expect(treeSurveysAdapter.getTreeSurvey("tree-x", "s-1")).rejects.toBeInstanceOf(TreeSurveyContractError);
  });

  it("propaga la falla de red", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(treeSurveysAdapter.getTreeSurveys("tree-x")).rejects.toBeInstanceOf(NetworkFailureError);
  });
});

describe("address search: errores", () => {
  it("pide la búsqueda predictiva con el indicador typeahead", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ outcome: "empty", data: [] }));
    await expect(searchAddresses("Rivadavia", { typeahead: true })).resolves.toEqual([]);

    expect(String(fetchSpy.mock.calls[0]![0])).toContain("typeahead=1");
  });

  it("falla con el mensaje de respaldo cuando el BFF responde con error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 502 }));
    await expect(searchAddresses("Rivadavia")).rejects.toThrow();
  });

  it("devuelve las calles sugeridas y ninguna ante un error o una respuesta inválida", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: [{ label: "Av. Rivadavia" }] }));
    await expect(suggestStreets("Riv")).resolves.toEqual(["Av. Rivadavia"]);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 500 }));
    await expect(suggestStreets("Riv")).resolves.toEqual([]);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: [{ label: "" }] }));
    await expect(suggestStreets("Riv")).resolves.toEqual([]);
  });
});
