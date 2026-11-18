import { afterEach, describe, expect, it, vi } from "vitest";

import { environmentalInspectionFixtures } from "./environmental-report-fixtures";
import {
  getReferralSourceServiceIds,
  isReferralVisibleToBackendSources,
  isReferralVisibleToScenario,
  referralFromBackendRepairRequest,
  referralFromRepairRequest,
  referralFromStreetClosureRequest,
  referralsAdapter,
  ReferralContractError,
  serviceSourceHref,
  treeInterventionSourceHref,
  type Referral,
} from "./referrals";
import { repairRequestFixtures } from "./repair-request-fixtures";
import { scenarios } from "./scenarios";
import { streetClosureRequestFixtures } from "./street-closure-request-fixtures";

afterEach(() => vi.restoreAllMocks());

const repair = repairRequestFixtures[0]!;
const closureService = streetClosureRequestFixtures.find((r) => r.sourceType === "SERVICE")!;
const closureTree = streetClosureRequestFixtures.find((r) => r.sourceType === "TREE_INTERVENTION")!;
const inspectionWithReport = environmentalInspectionFixtures.find((i) => i.reportId)!;

describe("hrefs de origen", () => {
  it("codifica el identificador en los enlaces a servicio y arbolado", () => {
    expect(serviceSourceHref("SVC 1/2")).toBe("/app?destination=services&detail=SVC%201%2F2");
    expect(treeInterventionSourceHref("TI 1/2")).toBe("/app/catalog/tree-interventions?detail=TI%201%2F2");
  });
});

describe("referralFromRepairRequest", () => {
  it("arma la derivación a M3 con los datos de la solicitud", () => {
    const referral = referralFromRepairRequest({ ...repair, sourceContext: undefined, createdAt: "c", updatedAt: "u" });
    expect(referral).toMatchObject({
      kind: "REPAIR_REQUEST",
      destination: "M3",
      id: repair.id,
      sourceType: "SERVICE",
      sourceId: repair.detectedInId,
      sourceServiceId: repair.detectedInId,
      sourceLabel: "Servicio de origen",
      sourceHref: serviceSourceHref(repair.detectedInId),
      status: repair.status,
      createdAt: "c",
      updatedAt: "u",
    });
  });

  it("usa la etiqueta y el href del contexto de origen cuando existen", () => {
    const referral = referralFromRepairRequest({ ...repair, sourceContext: { type: "SERVICE", id: "x", label: "Mi origen", href: "/mi-href" } });
    expect(referral).toMatchObject({ sourceLabel: "Mi origen", sourceHref: "/mi-href" });
  });

  it("cae a requestedAt para createdAt y encadena los respaldos de updatedAt", () => {
    const base = { ...repair, createdAt: undefined, updatedAt: undefined, requestedAt: "R" };
    expect(referralFromRepairRequest(base)).toMatchObject({ createdAt: "R", updatedAt: "R" });
    expect(referralFromRepairRequest({ ...base, createdAt: "C" })).toMatchObject({ createdAt: "C", updatedAt: "C" });
    expect(referralFromRepairRequest({ ...base, createdAt: "C", updatedAt: "U" })).toMatchObject({ createdAt: "C", updatedAt: "U" });
  });

  it("para una inspección con fixtures enlaza al reporte y a la inspección", () => {
    const referral = referralFromRepairRequest({ ...repair, sourceContext: undefined, detectedInType: "INSPECTION", detectedInId: inspectionWithReport.id });
    expect(referral.sourceLabel).toBe("Inspección ambiental");
    expect(referral.sourceHref).toBe(
      `/app?destination=environment&detail=${inspectionWithReport.reportId}&inspectionId=${inspectionWithReport.id}`,
    );
  });

  it("para una inspección desconocida enlaza solo a la inspección", () => {
    const referral = referralFromRepairRequest({ ...repair, sourceContext: undefined, detectedInType: "INSPECTION", detectedInId: "INS-NO/EXISTE" });
    expect(referral.sourceHref).toBe("/app?destination=environment&inspectionId=INS-NO%2FEXISTE");
  });

  it("la variante de backend no consulta fixtures para la inspección", () => {
    const referral = referralFromBackendRepairRequest({ ...repair, sourceContext: undefined, detectedInType: "INSPECTION", detectedInId: inspectionWithReport.id });
    expect(referral.sourceLabel).toBe("Inspección ambiental");
    expect(referral.sourceHref).toBe(`/app?destination=environment&inspectionId=${inspectionWithReport.id}`);
  });

  it("la variante de backend para un servicio enlaza al detalle del servicio", () => {
    expect(referralFromBackendRepairRequest({ ...repair, sourceContext: undefined }).sourceHref).toBe(serviceSourceHref(repair.detectedInId));
  });
});

describe("referralFromStreetClosureRequest", () => {
  it("origen servicio: guarda sourceServiceId y enlaza al servicio", () => {
    const referral = referralFromStreetClosureRequest({ ...closureService, sourceContext: undefined });
    expect(referral).toMatchObject({
      kind: "STREET_CLOSURE_REQUEST",
      destination: "M7",
      sourceServiceId: closureService.sourceId,
      sourceLabel: closureService.reason,
      sourceHref: serviceSourceHref(closureService.sourceId),
      status: closureService.status,
      createdAt: closureService.createdAt,
      updatedAt: closureService.updatedAt,
    });
    expect(referral).not.toHaveProperty("sourceTreeInterventionId");
  });

  it("origen arbolado: guarda sourceTreeInterventionId y no sourceServiceId", () => {
    const referral = referralFromStreetClosureRequest(closureTree);
    expect(referral).toMatchObject({ sourceTreeInterventionId: closureTree.sourceId, sourceHref: treeInterventionSourceHref(closureTree.sourceId) });
    expect(referral).not.toHaveProperty("sourceServiceId");
  });

  it("usa el título del contexto de origen como etiqueta cuando lo hay", () => {
    const withContext = { ...closureService, sourceContext: { ...(closureService.sourceContext as object), title: "Título ctx" } } as typeof closureService;
    expect(referralFromStreetClosureRequest(withContext).sourceLabel).toBe("Título ctx");
  });
});

describe("visibilidad", () => {
  it("la cuadrilla ve los servicios propios y las inspecciones de esos servicios", () => {
    // crew-b: SVC-1050 es propio; INS-1012 cuelga de SVC-1112 (crew-b); INS-1005 de SVC-1072 (crew-c).
    const ids = getReferralSourceServiceIds(scenarios.fieldCrewLeader)!;
    expect(ids).toEqual(expect.arrayContaining(["SVC-1050", "SVC-1112", "INS-1012"]));
    expect(ids).not.toContain("SVC-1042");
    expect(ids).not.toContain("SVC-1072");
    expect(ids).not.toContain("INS-1005");
  });

  it("una derivación con servicio de la cuadrilla es visible y una ajena no", () => {
    const own = getReferralSourceServiceIds(scenarios.fieldCrewLeader)![0]!;
    expect(isReferralVisibleToScenario({ sourceServiceId: own }, scenarios.fieldCrewLeader)).toBe(true);
    expect(isReferralVisibleToScenario({ sourceServiceId: "SVC-AJENO" }, scenarios.fieldCrewLeader)).toBe(false);
  });

  it("las derivaciones con origen en arbolado solo las ve Oficina (por fuentes de backend)", () => {
    const tree = { sourceType: "TREE_INTERVENTION", sourceId: "TI-1" } as Referral;
    const service = { sourceType: "SERVICE", sourceId: "SVC-1" } as Referral;
    expect(isReferralVisibleToBackendSources(tree, undefined)).toBe(true);
    expect(isReferralVisibleToBackendSources(tree, new Set(["TI-1"]))).toBe(false);
    expect(isReferralVisibleToBackendSources(service, new Set(["SVC-1"]))).toBe(true);
    expect(isReferralVisibleToBackendSources(service, new Set(["SVC-2"]))).toBe(false);
  });
});

describe("referralsAdapter: contrato", () => {
  const serviceReferral = referralFromRepairRequest(repair);
  const closureReferral = referralFromStreetClosureRequest(closureService);

  it("lista derivaciones válidas de ambos tipos y cuenta las inválidas", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [serviceReferral, closureReferral], meta: { total: 2, invalid: 3 } }));
    const page = await referralsAdapter.list();
    expect(page).toEqual({ referrals: [serviceReferral, closureReferral], total: 2, invalid: 3 });
  });

  it("invalid vale 0 si el BFF no lo informa", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [], meta: { total: 0 } }));
    expect((await referralsAdapter.list()).invalid).toBe(0);
  });

  it("rechaza un invalid negativo o no entero", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: [], meta: { total: 0, invalid: -1 } }));
    await expect(referralsAdapter.list()).rejects.toBeInstanceOf(ReferralContractError);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: [], meta: { total: 0, invalid: 1.5 } }));
    await expect(referralsAdapter.list()).rejects.toBeInstanceOf(ReferralContractError);
  });

  it("pide la lista a /api/referrals y el detalle con el id codificado", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(serviceReferral));
    expect(await referralsAdapter.get("RR 1")).toEqual(serviceReferral);
    expect(String(spy.mock.calls[0]![0])).toBe("/api/referrals/RR%201");
    spy.mockImplementation(async () => Response.json({ data: [], meta: { total: 0 } }));
    await referralsAdapter.list();
    expect(String(spy.mock.calls[1]![0])).toBe("/api/referrals");
  });

  it.each([
    ["destination de M3 distinto", { ...serviceReferral, destination: "M7" }],
    ["kind desconocido", { ...serviceReferral, kind: "OTRO" }],
    ["sourceType de reparación distinto de SERVICE", { ...serviceReferral, sourceType: "TREE_INTERVENTION" }],
    ["estado de reparación inválido", { ...serviceReferral, status: "APPROVED" }],
    ["estado interno de la solicitud de reparación inválido", { ...serviceReferral, request: { ...serviceReferral.request, status: "APPROVED" } }],
    ["destination de M7 distinto", { ...closureReferral, destination: "M3" }],
    ["estado de cierre inválido", { ...closureReferral, status: "CLOSED" }],
    ["estado interno del cierre inválido", { ...closureReferral, request: { ...closureReferral.request, status: "CLOSED" } }],
    ["sourceModule distinto de M6", { ...closureReferral, request: { ...closureReferral.request, sourceModule: "M3" } }],
    ["closureType desconocido", { ...closureReferral, request: { ...closureReferral.request, closureType: "MEDIO" } }],
    ["solicitud de reparación sin objeto", { ...serviceReferral, request: undefined }],
    ["solicitud de cierre sin objeto", { ...closureReferral, request: undefined }],
  ])("rechaza el detalle con %s", async (_name, body) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));
    await expect(referralsAdapter.get("x")).rejects.toBeInstanceOf(ReferralContractError);
  });

  it.each(["REQUESTED", "IN_PROGRESS", "CLOSED"])("acepta el estado de reparación %s", async (status) => {
    const body = { ...serviceReferral, status, request: { ...serviceReferral.request, status } };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));
    expect((await referralsAdapter.get("x")).status).toBe(status);
  });

  it.each(["REQUESTED", "APPROVED", "REJECTED", "ENDED", "EXPIRED"])("acepta el estado de cierre %s", async (status) => {
    const body = { ...closureReferral, status, request: { ...closureReferral.request, status } };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));
    expect((await referralsAdapter.get("x")).status).toBe(status);
  });

  it.each(["TOTAL", "PARTIAL", null])("acepta el tipo de cierre %s", async (closureType) => {
    const body = { ...closureReferral, request: { ...closureReferral.request, closureType } };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));
    await expect(referralsAdapter.get("x")).resolves.toBeDefined();
  });

  it("los errores de contrato llevan nombre, mensaje exacto y la causa", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<html>"));
    const notJson = (await referralsAdapter.list().catch((e: unknown) => e)) as ReferralContractError;
    expect(notJson.name).toBe("ReferralContractError");
    expect(notJson.message).toBe("No se pudo obtener información válida de derivaciones. Reintente en unos segundos.");
    expect(notJson.cause).toBeInstanceOf(Error);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: [{}], meta: { total: 1 } }));
    const list = (await referralsAdapter.list().catch((e: unknown) => e)) as ReferralContractError;
    expect(list.message).toBe("No se pudo obtener información válida de la lista de derivaciones. Reintente en unos segundos.");
    expect(list.cause).toBeDefined();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({}));
    const detail = (await referralsAdapter.get("x").catch((e: unknown) => e)) as ReferralContractError;
    expect(detail.message).toBe("No se pudo obtener información válida del detalle de la derivación. Reintente en unos segundos.");
    expect(detail.cause).toBeDefined();
  });

  it("ante un error HTTP con cuerpo null usa el mensaje genérico", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(null, { status: 500 }));
    await expect(referralsAdapter.list()).rejects.toThrow("No se pudieron cargar las derivaciones.");
  });
});
