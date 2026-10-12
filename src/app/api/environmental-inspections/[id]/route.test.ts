import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { AUTH_COOKIE_NAME, createSession, sealSession } from "@/lib/session";
import { GET } from "./route";

const inspectionId = "0b5bd4d8-179b-4de7-82aa-a83524012097";
const serviceId = "ceec08ae-67e7-4739-9677-150f5085bb1a";
const crewId = "c1ba1a57-6f23-4871-b6b3-1d7ce231a516";
const inspection = {
  id: inspectionId,
  reportId: "ea890c7c-c2b4-4b26-aa04-822d1e51bb44",
  serviceId,
  createdAt: "2026-09-22T12:00:00.000Z",
  updatedAt: "2026-09-22T12:00:00.000Z",
  findings: "Emisión visible",
  inspectorId: "inspector-interno",
  reporterSnapshot: { name: "Denunciante reservado" },
  violationNotice: { noticeNumber: "ACTA-1" },
};

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function backendCookie(scenarioId = "field-crew-leader-route") {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie") ?? "";
}

function detail(cookie: string) {
  return GET(new Request(`http://localhost/api/environmental-inspections/${inspectionId}`, {
    headers: { cookie },
  }), { params: Promise.resolve({ id: inspectionId }) });
}

function fieldBackend() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: [{
    id: crewId, name: "Cuadrilla Belgrano — Recolección",
  }] }));
}

describe("GET /api/environmental-inspections/:id en backend-development", () => {
  it("Campo sin cuadrilla resuelta no recibe la inspección", async () => {
    process.env.M6_AUTH_MODE = "backend-development";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const session = createSession("field-crew-leader-route", {
      mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(inspection));
    const response = await detail(`${AUTH_COOKIE_NAME}=${sealSession(session)}`);

    expect(response.status).toBe(404);
    expect((await response.json()).message).toBe("Inspección no encontrada.");
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });

  it("conserva la proyección si falla la lectura de evidencia y codifica el servicio", async () => {
    const backendFetch = fieldBackend()
      .mockResolvedValueOnce(Response.json({ ...inspection, serviceId: "servicio/real?x=1" }))
      .mockResolvedValueOnce(Response.json({ crewId }))
      .mockResolvedValueOnce(Response.json({ message: "Evidencia no disponible." }, { status: 503 }));
    const response = await detail(await backendCookie());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.findings).toBe("Emisión visible");
    expect(body).not.toHaveProperty("inspectorId");
    expect(body).not.toHaveProperty("reporterSnapshot");
    expect(body).not.toHaveProperty("violationNotice");
    expect(body).not.toHaveProperty("attachments");
    expect(String(backendFetch.mock.calls[2]?.[0])).toBe("https://backend.internal/services/servicio%2Freal%3Fx%3D1");
  });

  it.each(["901159c1-3230-440a-ba3d-d7baf55fab24", null, undefined])("Campo no recibe inspecciones de otra cuadrilla (%s)", async (otherCrewId) => {
    const backendFetch = fieldBackend()
      .mockResolvedValueOnce(Response.json(inspection))
      .mockResolvedValueOnce(Response.json({ id: serviceId, crewId: otherCrewId }));
    const response = await detail(await backendCookie());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      statusCode: 404, message: "Inspección no encontrada.", error: "Not Found",
      path: `/api/environmental-inspections/${inspectionId}`,
    });
    expect(backendFetch).toHaveBeenCalledTimes(3);
  });

  it.each([null, undefined])("Campo no recibe una inspección sin servicio (%s)", async (missingServiceId) => {
    const backendFetch = fieldBackend().mockResolvedValueOnce(Response.json({ ...inspection, serviceId: missingServiceId }));
    const response = await detail(await backendCookie());

    expect(response.status).toBe(404);
    expect((await response.json()).message).toBe("Inspección no encontrada.");
    expect(backendFetch).toHaveBeenCalledTimes(2);
  });

  it("Oficina recibe todos los campos y la evidencia sin consultar el servicio", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(inspection))
      .mockResolvedValueOnce(Response.json([]));
    const response = await detail(await backendCookie("office-duty-queue"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...inspection, attachments: [] });
    expect(backendFetch.mock.calls.map(([url]) => String(url))).toEqual([
      `https://backend.internal/environmental-inspections/${inspectionId}`,
      `https://backend.internal/evidence?ownerType=INSPECTION&ownerId=${inspectionId}`,
    ]);
  });

  it("conserva el 404 del backend sin consultar servicio ni evidencia", async () => {
    const error = { statusCode: 404, message: "Inspección no encontrada en el backend." };
    const backendFetch = fieldBackend().mockResolvedValueOnce(Response.json(error, { status: 404 }));
    const response = await detail(await backendCookie());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(error);
    expect(backendFetch).toHaveBeenCalledTimes(2);
  });

  it.each(["field-crew-leader-route", "office-duty-queue"])("rechaza un payload inválido para %s", async (scenarioId) => {
    const backendFetch = scenarioId.startsWith("field") ? fieldBackend() : vi.spyOn(globalThis, "fetch");
    backendFetch.mockResolvedValueOnce(Response.json({ ...inspection, reportId: 123 }));
    const response = await detail(await backendCookie(scenarioId));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      statusCode: 502, message: "La respuesta del backend no contiene una inspección válida.", error: "Error",
      path: `/api/environmental-inspections/${inspectionId}`,
    });
    expect(backendFetch).toHaveBeenCalledTimes(scenarioId.startsWith("field") ? 2 : 1);
  });

  it("rechaza JSON malformado sin reenviarlo a Campo", async () => {
    const backendFetch = fieldBackend().mockResolvedValueOnce(new Response('{"inspectorId":"reservado"'));
    const response = await detail(await backendCookie());

    expect(response.status).toBe(502);
    expect((await response.json()).message).toBe("La respuesta del backend no contiene una inspección válida.");
    expect(backendFetch).toHaveBeenCalledTimes(2);
  });

  it("Campo recibe su inspección con evidencia y sin datos reservados de Oficina", async () => {
    const evidence = [{ id: "evidencia-real", url: "https://files.internal/evidence.jpg" }];
    const backendFetch = fieldBackend()
      .mockResolvedValueOnce(Response.json(inspection))
      .mockResolvedValueOnce(Response.json({ id: serviceId, crewId }))
      .mockResolvedValueOnce(Response.json(evidence));
    const response = await detail(await backendCookie());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: inspectionId, reportId: inspection.reportId, serviceId,
      createdAt: inspection.createdAt, updatedAt: inspection.updatedAt,
      findings: "Emisión visible", attachments: evidence,
    });
    expect(backendFetch.mock.calls.slice(1).map(([url, init]) => [String(url), init?.method ?? "GET"])).toEqual([
      [`https://backend.internal/environmental-inspections/${inspectionId}`, "GET"],
      [`https://backend.internal/services/${serviceId}`, "GET"],
      [`https://backend.internal/evidence?ownerType=INSPECTION&ownerId=${inspectionId}`, "GET"],
    ]);
    expect(new Headers(backendFetch.mock.calls[2]?.[1]?.headers).get("authorization")).toMatch(/^Bearer /);
  });
});

describe("GET /api/environmental-inspections/:id con fixtures", () => {
  it.each([
    ["field-crew-leader-route", "INS-1012", 200],
    ["field-crew-leader-route", "INS-1005", 404],
    ["field-crew-leader-route", "INS-1008", 404],
    ["office-duty-queue", "INS-1008", 200],
  ])("mantiene el acceso de %s a %s (%s)", async (scenarioId, id, status) => {
    process.env.M6_AUTH_MODE = "mock";
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const loginResponse = await login(new Request("http://localhost/api/session/login", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }),
    }));
    const response = await GET(new Request(`http://localhost/api/environmental-inspections/${id}`, {
      headers: { cookie: loginResponse.headers.get("set-cookie") ?? "" },
    }), { params: Promise.resolve({ id }) });

    expect(response.status).toBe(status);
    expect(backendFetch).not.toHaveBeenCalled();
    const body = await response.json();
    if (status === 200) expect(body.id).toBe(id);
    else expect(body.message).toBe("Inspección no encontrada.");
    if (scenarioId.startsWith("field")) {
      expect(body).not.toHaveProperty("inspectorId");
      expect(body).not.toHaveProperty("reporterSnapshot");
      expect(body).not.toHaveProperty("violationNotice");
    }
  });
});
