import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { environmentalReportFixtures, resetEnvironmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { backendEnv, createSessionCookie } from "@/test/session";
import { GET, POST } from "./route";

const CREW = { id: "crew-b", name: "Cuadrilla B" };
const fixture = (id: string) => environmentalReportFixtures.find((report) => report.id === id)!;
const withCrew = (id: string, crewId: string | null) => ({ ...fixture(id), assignedCrewId: crewId });
const page = (data: unknown[], totalPages = 1) => ({ data, meta: { total: data.length, page: 1, pageSize: 100, totalPages } });

let restoreEnv: (() => void) | undefined;
beforeEach(() => resetEnvironmentalReportFixtures());
afterEach(() => { restoreEnv?.(); restoreEnv = undefined; vi.restoreAllMocks(); });

function fieldRequest(query = "") {
  restoreEnv = backendEnv();
  const cookie = createSessionCookie("field-crew-leader-route", { mode: "real-m1", crew: CREW });
  return new Request(`http://localhost/api/environmental-reports${query}`, { headers: { cookie } });
}

describe("GET /api/environmental-reports as a field crew in real-m1 mode", () => {
  it("refuses a session without an assigned crew", async () => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("field-crew-leader-route", { mode: "real-m1" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await GET(new Request("http://localhost/api/environmental-reports", { headers: { cookie } }));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ message: "La sesión no tiene una cuadrilla asignada." });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("scans every backend page and keeps only the reports of the own crew", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(page([withCrew("ER-1005", "crew-b"), withCrew("ER-1006", "crew-a")], 2)))
      .mockResolvedValueOnce(Response.json(page([withCrew("ER-1012", "crew-b"), withCrew("ER-1001", null)], 2)));

    const response = await GET(fieldRequest("?pageSize=10"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.map((report: { id: string }) => report.id)).toEqual(["ER-1005", "ER-1012"]);
    expect(body.meta).toMatchObject({ total: 2, page: 1, pageSize: 10, totalPages: 1 });
    expect(body.meta.dropped).toBeUndefined();
    expect(body.sanctionOutcomeIntegrationExceptions).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const second = new URL(String(fetchSpy.mock.calls[1]![0]));
    expect(second.searchParams.get("page")).toBe("2");
    expect(second.searchParams.get("pageSize")).toBe("100");
  });

  it("forwards the filters to the backend and applies them to the crew's reports", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(page([
      { ...withCrew("ER-1005", "crew-b"), status: "INSPECTION_SCHEDULED", priority: "CRITICAL" },
      { ...withCrew("ER-1012", "crew-b"), status: "INSPECTION_SCHEDULED", priority: "HIGH" },
    ])));

    const response = await GET(fieldRequest("?status=INSPECTION_SCHEDULED&priority=CRITICAL&reportType=AIR_EMISSION&from=2026-09-01&to=2026-09-30&search=%20Brasil%20"));

    const body = await response.json();
    expect(body.data.map((report: { id: string }) => report.id)).toEqual(["ER-1005"]);
    const query = new URL(String(fetchSpy.mock.calls[0]![0])).searchParams;
    expect(query.getAll("status")).toEqual(["INSPECTION_SCHEDULED"]);
    expect(query.get("priority")).toBe("CRITICAL");
    expect(query.get("reportType")).toBe("AIR_EMISSION");
    expect(query.get("from")).toBe("2026-09-01");
    expect(query.get("to")).toBe("2026-09-30");
    expect(query.get("search")).toBe("Brasil");
  });

  it("pages the crew's own list", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(page([withCrew("ER-1005", "crew-b"), withCrew("ER-1012", "crew-b"), withCrew("ER-1006", "crew-b")])));

    const response = await GET(fieldRequest("?page=2&pageSize=2"));

    const body = await response.json();
    expect(body.data.map((report: { id: string }) => report.id)).toEqual(["ER-1006"]);
    expect(body.meta).toMatchObject({ total: 3, page: 2, pageSize: 2, totalPages: 2 });
  });

  it("counts records with a status unknown to the Frontend instead of failing the list", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(page([withCrew("ER-1005", "crew-b"), { ...withCrew("ER-1012", "crew-b"), status: "ESTADO_NUEVO_DEL_BACKEND" }])));

    const body = await (await GET(fieldRequest())).json();

    expect(body.data.map((report: { id: string }) => report.id)).toEqual(["ER-1005"]);
    expect(body.meta.dropped).toBe(1);
  });

  it("answers 502 when a record is malformed rather than merely unknown", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(page([withCrew("ER-1005", "crew-b"), { id: "roto", status: 42 }])));
    expect((await GET(fieldRequest())).status).toBe(502);
  });

  it("relays a failed backend page as is", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ message: "Sin permiso." }, { status: 403 }));
    const response = await GET(fieldRequest());
    expect(response.status).toBe(403);
  });

  it("answers 502 when the backend page is not JSON or has the wrong shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    const notJson = await GET(fieldRequest());
    expect(notJson.status).toBe(502);
    expect(await notJson.json()).toMatchObject({ message: "La respuesta de expedientes ambientales no contiene JSON válido." });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: "x" }));
    const wrongShape = await GET(fieldRequest());
    expect(wrongShape.status).toBe(502);
  });
});

describe("GET /api/environmental-reports validation and mock mode", () => {
  it("rejects an inverted date range with 400", async () => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1" });
    const response = await GET(new Request("http://localhost/api/environmental-reports?from=2026-09-30&to=2026-09-01", { headers: { cookie } }));
    expect(response.status).toBe(400);
  });

  it("lists the fixtures with the sanction outcome exceptions for Office", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "mock" });
    const body = await (await GET(new Request("http://localhost/api/environmental-reports?status=RECEIVED&reportType=NOISE", { headers: { cookie } }))).json();
    expect(Array.isArray(body.sanctionOutcomeIntegrationExceptions)).toBe(true);
    expect(body.data.every((report: { status: string; reportType: string }) => report.status === "RECEIVED" && report.reportType === "NOISE")).toBe(true);
  });

  it("shows a field crew in mock mode only the reports assigned to it, without exceptions", async () => {
    const cookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
    const body = await (await GET(new Request("http://localhost/api/environmental-reports", { headers: { cookie } }))).json();
    expect(body.sanctionOutcomeIntegrationExceptions).toBeUndefined();
    expect(body.data.every((report: { assignedCrewId?: string | null }) => Boolean(report.assignedCrewId))).toBe(true);
  });
});

describe("POST /api/environmental-reports", () => {
  const valid = { reportType: "NOISE", address: "Av. Siempreviva 742", lat: -34.6, lng: -58.4, description: "Ruidos molestos de madrugada." };
  const post = (cookie: string, body: unknown) => POST(new Request("http://localhost/api/environmental-reports", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }));

  it("rejects an invalid body with the validation messages", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "mock" });
    const response = await post(cookie, { ...valid, address: "   " });
    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("Debe indicar la ubicación del hallazgo.");
    expect((await post(cookie, "{no es json")).status).toBe(400);
  });

  it("creates the report in mock mode and shows it in the list", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "mock" });
    const response = await post(cookie, valid);
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject({ address: valid.address, reportType: "NOISE", status: "RECEIVED" });
    expect(environmentalReportFixtures.some((report) => report.id === created.id)).toBe(true);
  });

  it("assigns a report opened by a field crew to that crew", async () => {
    const cookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
    const response = await post(cookie, valid);
    expect(response.status).toBe(201);
    expect((await response.json()).assignedCrewId).toBeTruthy();
  });

  it("forwards the creation to the backend in real-m1 mode", async () => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "ER-2000" }, { status: 201 }));

    const response = await post(cookie, valid);

    expect(response.status).toBe(201);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("https://backend.internal/environmental-reports");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual(valid);
  });

  it("rejects a visitor without a session", async () => {
    const response = await POST(new Request("http://localhost/api/environmental-reports", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
  });
});
