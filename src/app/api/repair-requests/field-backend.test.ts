import { afterEach, describe, expect, it, vi } from "vitest";

import { backendEnv, createSessionCookie } from "@/test/session";
import { GET, POST } from "./route";

const SERVICE_ID = "ceec08ae-67e7-4739-9677-150f5085bb1a";
const INSPECTION_ID = "4d5683b8-d493-43bb-83ce-071bd074fe19";
const OWN_CREW = "c1ba1a57-6f23-4871-b6b3-1d7ce231a516";
const OTHER_CREW = "9a1d6ed2-0c0e-4a41-8b35-3a8a6f0d2f11";

let restoreEnv: (() => void) | undefined;
afterEach(() => { restoreEnv?.(); restoreEnv = undefined; vi.restoreAllMocks(); });

function fieldCookie(crewId: string | null = OWN_CREW) {
  restoreEnv = backendEnv();
  return createSessionCookie("field-crew-leader-route", { mode: "real-m1", ...(crewId ? { crew: { id: crewId, name: "Cuadrilla" } } : {}) });
}

const get = (cookie: string, query: string) => GET(new Request(`http://localhost/api/repair-requests${query}`, { headers: { cookie } }));
const body = (detectedInType: "SERVICE" | "INSPECTION", detectedInId: string) => ({ damageType: "BROKEN_SIDEWALK", address: "Av. Rivadavia 2200", severity: "LOW", publicSafetyRisk: true, detectedInType, detectedInId });
const post = (cookie: string, payload: unknown) => POST(new Request("http://localhost/api/repair-requests", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(payload) }));
const urls = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls.map((call: unknown[]) => String(call[0]).replace("https://backend.internal", ""));

describe("GET /api/repair-requests as a field crew (real-m1)", () => {
  it("requires the Service the derivations were detected in", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await get(fieldCookie(), "");
    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a session without a crew", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await get(fieldCookie(null), `?detectedInId=${SERVICE_ID}`);
    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("relays a failure to read the Service", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ message: "No existe." }, { status: 404 }));
    expect((await get(fieldCookie(), `?detectedInId=${SERVICE_ID}`)).status).toBe(404);
  });

  it("refuses the derivations of a Service that belongs to another crew", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: SERVICE_ID, crewId: OTHER_CREW }));
    expect((await get(fieldCookie(), `?detectedInId=${SERVICE_ID}`)).status).toBe(403);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("lists the derivations of a Service of the own crew", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: SERVICE_ID, crewId: OWN_CREW }))
      .mockResolvedValueOnce(Response.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 1 } }));

    const response = await get(fieldCookie(), `?detectedInId=${SERVICE_ID}`);

    expect(response.status).toBe(200);
    expect(urls(fetchSpy)).toEqual([`/services/${SERVICE_ID}`, `/repair-requests?detectedInId=${SERVICE_ID}`]);
  });
});

describe("POST /api/repair-requests as a field crew", () => {
  it("is refused: creating derivations is an Office capability", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await post(fieldCookie(), body("SERVICE", SERVICE_ID));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ message: "Su rol no permite crear derivaciones." });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/repair-requests as Office (real-m1)", () => {
  const officeCookie = () => { restoreEnv = backendEnv(); return createSessionCookie("office-duty-queue", { mode: "real-m1" }); };

  it("relays a failure other than 404 when reading the source", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ message: "Prohibido." }, { status: 403 }));
    expect((await post(officeCookie(), body("SERVICE", SERVICE_ID))).status).toBe(403);
  });

  it("validates the source of an inspection and creates the derivation", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: INSPECTION_ID, serviceId: SERVICE_ID }))
      .mockResolvedValueOnce(Response.json({ id: "rr-2" }, { status: 201 }));

    const response = await post(officeCookie(), body("INSPECTION", INSPECTION_ID));

    expect(response.status).toBe(201);
    expect(urls(fetchSpy)).toEqual([`/environmental-inspections/${INSPECTION_ID}`, "/repair-requests"]);
  });
});

describe("repair request routes in mock mode", () => {
  it("a field crew cannot list derivations without naming a source it owns", async () => {
    const cookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
    expect((await get(cookie, "")).status).toBe(403);
    expect((await get(cookie, "?detectedInId=SVC-9999")).status).toBe(403);
  });

  it("Office lists derivations filtered by status and severity", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "mock" });
    const response = await get(cookie, "?status=REQUESTED&severity=HIGH");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.every((item: { status: string; severity: string }) => item.status === "REQUESTED" && item.severity === "HIGH")).toBe(true);
  });

  it("answers 404 for a missing Service or inspection and 400 for an invalid body", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "mock" });
    expect((await post(cookie, body("SERVICE", "SVC-0000"))).status).toBe(404);
    expect((await post(cookie, body("INSPECTION", "INSP-0000"))).status).toBe(404);
    expect((await post(cookie, { ...body("SERVICE", "SVC-1001"), address: "" })).status).toBe(400);
  });

  it("a field crew cannot create a derivation from a Service that is not its own", async () => {
    const cookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
    const response = await post(cookie, body("SERVICE", "SVC-1072"));
    expect([403, 404]).toContain(response.status);
  });
});
