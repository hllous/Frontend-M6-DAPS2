import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { AUTH_COOKIE_NAME, createSession, sealSession } from "@/lib/session";
import { GET as detail } from "./[id]/route";
import { GET as list } from "./route";

const repairId = "15c86465-54d3-4e0a-83a5-26a3cc510017";
const closureId = "ce0bbfaa-8720-4566-b9d1-738cb37a689b";
const serviceId = "ceec08ae-67e7-4739-9677-150f5085bb1a";
const crewId = "c1ba1a57-6f23-4871-b6b3-1d7ce231a516";
const inspectionId = "bd685878-7c96-4e99-9b38-b0368a011fa0";
const foreignServiceId = "761e8f97-ed2e-4c14-a253-ea68252f731d";
const timestamp = "2026-10-01T08:00:00.000Z";
const repair = {
  id: repairId, damageType: "BROKEN_SIDEWALK", address: "Av. Rivadavia 2200",
  severity: "LOW", publicSafetyRisk: false, detectedInType: "SERVICE",
  detectedInId: serviceId, status: "REQUESTED", requestedAt: timestamp,
};
const closure = {
  id: closureId, reason: "Trabajo en vía pública", sourceType: "SERVICE", sourceId: serviceId,
  sourceModule: "M6", closureType: "TOTAL", requestedFrom: timestamp,
  requestedTo: "2026-10-01T12:00:00.000Z",
  affectedSections: [{ streetName: "Rivadavia", fromCross: "Azcuénaga", toCross: "Pasteur" }],
  status: "REQUESTED", closureId: null, createdAt: timestamp, updatedAt: timestamp,
  sourceContext: {
    sourceType: "SERVICE", sourceId: serviceId, title: "Servicio de higiene",
    mode: "POINT", serviceTypeName: "Higiene", scheduledDate: timestamp,
    windowFrom: null, windowTo: null,
  },
};

beforeEach(() => {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId = "office-duty-queue") {
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie") ?? "";
}

function getDetail(cookie: string, id = repairId) {
  return detail(new Request(`http://localhost/api/referrals/${id}`, { headers: { cookie } }), {
    params: Promise.resolve({ id }),
  });
}

function page(data: unknown[], total: number, currentPage = 1, totalPages = 1) {
  return { data, meta: { total, page: currentPage, pageSize: 100, totalPages } };
}

describe("referrals against the backend", () => {
  it("follows every Services page and resolves missing inspection links only for inspection Services", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/crews") return Response.json({ data: [{ id: crewId, name: "Cuadrilla Belgrano — Recolección" }] });
      if (url.pathname === "/services") {
        const currentPage = Number(url.searchParams.get("page"));
        return Response.json(currentPage === 1
          ? page(Array.from({ length: 100 }, (_, index) => ({
            id: `4a95de0d-9c08-4dc1-b0d4-${String(index).padStart(12, "0")}`, crewId, origin: "PLANNED", inspectionId: null,
          })), 101, 1, 2)
          : page([{ id: serviceId, crewId, origin: "INSPECTION" }], 101, 2, 2));
      }
      if (url.pathname === `/services/${serviceId}`) return Response.json({ id: serviceId, crewId, origin: "INSPECTION", inspectionId });
      if (url.pathname === "/repair-requests") return Response.json(page([{ ...repair, detectedInType: "INSPECTION", detectedInId: inspectionId }], 1));
      if (url.pathname === "/street-closure-requests") return Response.json(page([], 0, 1, 0));
      throw new Error(`Unexpected backend URL: ${url}`);
    });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await list(new Request("http://localhost/api/referrals", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [{ id: repairId, sourceId: inspectionId }], meta: { total: 1 } });
    expect(backendFetch.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      "https://backend.internal/crews?active=true&pageSize=100",
      "https://backend.internal/repair-requests?page=1&pageSize=100",
      `https://backend.internal/services/${serviceId}`,
      `https://backend.internal/services?crewId=${crewId}&page=1&pageSize=100`,
      `https://backend.internal/services?crewId=${crewId}&page=2&pageSize=100`,
      "https://backend.internal/street-closure-requests?page=1&pageSize=100",
    ]);
  });

  it("denies Field collection and detail without a resolved crew before backend calls", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const session = createSession("field-crew-leader-route", {
      mode: "backend-development", devJwt: process.env.M6_DEV_JWT,
      backendOrigin: process.env.M6_BACKEND_ORIGIN,
    });
    const cookie = `${AUTH_COOKIE_NAME}=${sealSession(session)}`;
    expect((await list(new Request("http://localhost/api/referrals", { headers: { cookie } }))).status).toBe(403);
    expect((await getDetail(cookie)).status).toBe(403);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it.each([
    [serviceId, "SERVICE", 200],
    [inspectionId, "INSPECTION", 200],
    [foreignServiceId, "SERVICE", 404],
  ])("limits Field detail for source %s to its real crew (%s)", async (sourceId, sourceType, status) => {
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/crews") return Response.json({ data: [{ id: crewId, name: "Cuadrilla Belgrano — Recolección" }] });
      if (url.pathname === "/services") return Response.json(page([{ id: serviceId, crewId, origin: "INSPECTION", inspectionId }], 1));
      if (url.pathname === `/repair-requests/${repairId}`) return Response.json({ ...repair, detectedInType: sourceType, detectedInId: sourceId });
      throw new Error(`Unexpected backend URL: ${url}`);
    });
    const response = await getDetail(await authenticatedCookie("field-crew-leader-route"));
    expect(response.status).toBe(status);
    if (status === 200) expect(await response.json()).toMatchObject({ id: repairId, sourceId });
    expect(backendFetch.mock.calls.map(([url]) => String(url))).toEqual([
      "https://backend.internal/crews?active=true&pageSize=100",
      `https://backend.internal/repair-requests/${repairId}`,
      `https://backend.internal/services?crewId=${crewId}&page=1&pageSize=100`,
    ]);
  });

  it.each([false, true])("scopes Field street-closure detail and excludes tree sources (%s)", async (treeSource) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/crews") return Response.json({ data: [{ id: crewId, name: "Cuadrilla Belgrano — Recolección" }] });
      if (url.pathname === "/services") return Response.json(page([{ id: serviceId, crewId, origin: "PLANNED", inspectionId: null }], 1));
      if (url.pathname.startsWith("/repair-requests/")) return Response.json({}, { status: 404 });
      return Response.json(treeSource ? {
        ...closure, sourceType: "TREE_INTERVENTION",
        sourceContext: { sourceType: "TREE_INTERVENTION", sourceId: serviceId, title: "Poda", interventionType: "SAFETY_PRUNING", address: "Rivadavia 2200" },
      } : closure);
    });
    const response = await getDetail(await authenticatedCookie("field-crew-leader-route"), closureId);
    expect(response.status).toBe(treeSource ? 404 : 200);
  });

  it("scopes Field referrals by real crew Services and linked inspections without per-Service referral calls", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/crews") return Response.json({ data: [{ id: crewId, name: "Cuadrilla Belgrano — Recolección" }] });
      if (url.pathname === "/services") return Response.json(page([
        { id: serviceId, crewId, origin: "INSPECTION", inspectionId },
        { id: foreignServiceId, crewId: "ec9368eb-8245-4aa3-b2ce-c02e7766d2c7", origin: "PLANNED" },
      ], 2));
      if (url.pathname === "/repair-requests") return Response.json(page([
        repair,
        { ...repair, id: "30e086fc-402f-4783-af1d-cad8ab4ed1fb", detectedInType: "INSPECTION", detectedInId: inspectionId },
        { ...repair, id: "02fe58ea-3414-41ab-a55a-836c4c0a4922", detectedInId: foreignServiceId },
      ], 3));
      if (url.pathname === "/street-closure-requests") return Response.json(page([
        closure,
        { ...closure, id: "f5c48560-80a0-408b-b3eb-8c481fe07da1", sourceId: foreignServiceId },
        { ...closure, id: "d9188a29-a51f-4718-ae15-6f707c378fa3", sourceType: "TREE_INTERVENTION", sourceId: serviceId,
          sourceContext: { sourceType: "TREE_INTERVENTION", sourceId: serviceId, title: "Poda", interventionType: "SAFETY_PRUNING", address: "Rivadavia 2200" } },
      ], 3));
      throw new Error(`Unexpected backend URL: ${url}`);
    });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await list(new Request("http://localhost/api/referrals", { headers: { cookie } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.total).toBe(3);
    expect(body.data).toHaveLength(3);
    expect(body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: repairId }), expect.objectContaining({ id: closureId }),
      expect.objectContaining({ sourceId: inspectionId }),
    ]));
    expect(backendFetch.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      "https://backend.internal/crews?active=true&pageSize=100",
      "https://backend.internal/repair-requests?page=1&pageSize=100",
      `https://backend.internal/services?crewId=${crewId}&page=1&pageSize=100`,
      "https://backend.internal/street-closure-requests?page=1&pageSize=100",
    ]);
  });

  it("returns every page of both collections and the complete total to Office", async () => {
    const repairs = Array.from({ length: 101 }, (_, index) => ({
      ...repair, id: `15c86465-54d3-4e0a-83a5-${String(index).padStart(12, "0")}`,
    }));
    const closures = Array.from({ length: 101 }, (_, index) => ({
      ...closure, id: `ce0bbfaa-8720-4566-b9d1-${String(index).padStart(12, "0")}`,
    }));
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      const records = url.pathname === "/repair-requests" ? repairs : closures;
      const currentPage = Number(url.searchParams.get("page") ?? 1);
      return Response.json(page(records.slice((currentPage - 1) * 100, currentPage * 100), 101, currentPage, 2));
    });
    const cookie = await authenticatedCookie();
    const response = await list(new Request("http://localhost/api/referrals", { headers: { cookie } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.total).toBe(202);
    expect(body.data).toHaveLength(202);
    expect(body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: repairs[100].id }),
      expect.objectContaining({ id: closures[100].id }),
    ]));
    expect(backendFetch.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      "https://backend.internal/repair-requests?page=1&pageSize=100",
      "https://backend.internal/repair-requests?page=2&pageSize=100",
      "https://backend.internal/street-closure-requests?page=1&pageSize=100",
      "https://backend.internal/street-closure-requests?page=2&pageSize=100",
    ]);
    expect(backendFetch.mock.calls.every(([, init]) => (init?.method ?? "GET") === "GET")).toBe(true);
  });

  it("rejects malformed collection records at the backend boundary", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      Response.json(page(String(input).includes("/repair-requests") ? [{ id: repairId }] : [], 1)));
    const cookie = await authenticatedCookie();
    const response = await list(new Request("http://localhost/api/referrals", { headers: { cookie } }));
    expect(response.status).toBe(500);
  });

  it("stops at 50 pages and reports an error instead of a partial total", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input));
      return Response.json(url.pathname === "/repair-requests"
        ? page([repair], 51, Number(url.searchParams.get("page")), 51)
        : page([], 0, 1, 0));
    });
    const cookie = await authenticatedCookie();
    const response = await list(new Request("http://localhost/api/referrals", { headers: { cookie } }));
    expect(response.status).toBe(500);
    expect(backendFetch).toHaveBeenCalledTimes(51);
    expect(backendFetch.mock.calls.some(([url]) => new URL(String(url)).searchParams.get("page") === "51")).toBe(false);
  });

  it("opens a RepairRequest UUID through the repair endpoint", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(repair));
    const response = await getDetail(await authenticatedCookie());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: repairId, kind: "REPAIR_REQUEST" });
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(String(backendFetch.mock.calls[0][0])).toBe(`https://backend.internal/repair-requests/${repairId}`);
    expect(backendFetch.mock.calls[0][1]?.method ?? "GET").toBe("GET");
  });

  it("opens a StreetClosureRequest UUID only after a repair 404", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ message: "No existe" }, { status: 404 }))
      .mockResolvedValueOnce(Response.json(closure));
    const response = await getDetail(await authenticatedCookie(), closureId);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: closureId, kind: "STREET_CLOSURE_REQUEST" });
    expect(backendFetch.mock.calls.map(([url]) => String(url))).toEqual([
      `https://backend.internal/repair-requests/${closureId}`,
      `https://backend.internal/street-closure-requests/${closureId}`,
    ]);
    expect(backendFetch.mock.calls.every(([, init]) => (init?.method ?? "GET") === "GET")).toBe(true);
  });

  it.each([401, 403, 500, 503])("preserves repair errors (%s) without trying closures", async (status) => {
    const payload = { statusCode: status, message: "Error del backend" };
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(payload, { status }));
    const response = await getDetail(await authenticatedCookie());

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(payload);
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });

  it("returns the existing not-found envelope when both resources are missing", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({ message: "No existe" }, { status: 404 }));
    const response = await getDetail(await authenticatedCookie());

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      statusCode: 404, message: "La derivación no existe o no está disponible para esta sesión.",
      path: `/api/referrals/${repairId}`,
    });
    expect(backendFetch).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed successful payloads without trying another kind", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: repairId }));
    const response = await getDetail(await authenticatedCookie());
    expect(response.status).toBe(500);
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });
});
