import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { olvidarCatalogoDeEtiquetas } from "./service-labels";
import {
  ServiceContractError,
  ServiceRequestError,
  servicesAdapter,
  type ServiceQuery,
} from "./services";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  olvidarCatalogoDeEtiquetas();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const documentedError = (statusCode: number, message: string | string[]) =>
  HttpResponse.json(
    { statusCode, message, error: "Error", timestamp: "2026-09-30T10:00:00Z", path: "/x" },
    { status: statusCode },
  );

const serviceBody = (overrides: Record<string, unknown> = {}) => ({
  id: "SVC-77",
  serviceTypeId: "st-street-cleaning",
  title: "Barrido",
  mode: "ROUTE",
  status: "SCHEDULED",
  origin: "PLANNED",
  zoneIds: ["zone-3"],
  scheduledDate: "2026-12-01",
  history: [],
  ...overrides,
});

const futureDate = "2999-01-01";

type Case = {
  name: string;
  method: "get" | "post";
  path: string;
  call: () => Promise<unknown>;
};

// Cada método del adaptador comparte el mismo contrato de errores; se prueba contra la URL real
// que llama, no contra sus helpers internos.
const cases: Case[] = [
  { name: "list", method: "get", path: "*/api/services", call: () => servicesAdapter.list() },
  { name: "get", method: "get", path: "*/api/services/SVC-77", call: () => servicesAdapter.get("SVC-77") },
  {
    name: "create",
    method: "post",
    path: "*/api/services",
    call: () =>
      servicesAdapter.create({
        serviceTypeId: "st-street-cleaning",
        origin: "PLANNED",
        zoneIds: ["zone-1"],
        scheduledDate: futureDate,
        timeWindow: { start: "08:00", end: "12:00" },
      }),
  },
  {
    name: "assignCrew",
    method: "post",
    path: "*/api/services/SVC-77/assign-crew",
    call: () => servicesAdapter.assignCrew("SVC-77", { crewId: "crew-1" }),
  },
  { name: "start", method: "post", path: "*/api/services/SVC-77/start", call: () => servicesAdapter.start("SVC-77") },
  {
    name: "suspend",
    method: "post",
    path: "*/api/services/SVC-77/suspend",
    call: () => servicesAdapter.suspend("SVC-77", { reason: "WEATHER", note: "Lluvia fuerte" }),
  },
  { name: "resume", method: "post", path: "*/api/services/SVC-77/resume", call: () => servicesAdapter.resume("SVC-77") },
  {
    name: "reschedule",
    method: "post",
    path: "*/api/services/SVC-77/reschedule",
    call: () => servicesAdapter.reschedule("SVC-77", { reason: "Falta de personal" }),
  },
  {
    name: "cancel",
    method: "post",
    path: "*/api/services/SVC-77/cancel",
    call: () => servicesAdapter.cancel("SVC-77", { reason: "Duplicado" }),
  },
  {
    name: "confirmReschedule",
    method: "post",
    path: "*/api/services/SVC-77/confirm-reschedule",
    call: () =>
      servicesAdapter.confirmReschedule("SVC-77", {
        scheduledDate: futureDate,
        timeWindow: { start: "09:00", end: "11:00" },
      }),
  },
  {
    name: "getZoneResults",
    method: "get",
    path: "*/api/services/SVC-77/zone-results",
    call: () => servicesAdapter.getZoneResults("SVC-77"),
  },
  {
    name: "recordZoneResult",
    method: "post",
    path: "*/api/services/SVC-77/zone-results",
    call: () => servicesAdapter.recordZoneResult("SVC-77", { zoneId: "zone-3", status: "SERVICED" }),
  },
  {
    name: "uploadEvidence",
    method: "post",
    path: "*/api/evidence",
    call: () =>
      servicesAdapter.uploadEvidence({
        file: new File(["x"], "foto.png", { type: "image/png" }),
        ownerType: "SERVICE",
        ownerId: "SVC-77",
      }),
  },
  {
    name: "complete",
    method: "post",
    path: "*/api/services/SVC-77/complete",
    call: () => servicesAdapter.complete("SVC-77"),
  },
];

describe.each(cases)("servicesAdapter.$name error contract", ({ method, path, call }) => {
  const reply = (resolver: () => Response) => server.use(http[method](path, resolver));

  it("joins an array message of a documented error into a ServiceRequestError with its status", async () => {
    reply(() => documentedError(409, ["La zona ya está tomada.", "Revise la agenda."]));

    const error = await call().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceRequestError);
    expect(error).toMatchObject({
      message: "La zona ya está tomada. Revise la agenda.",
      status: 409,
    });
  });

  it("keeps a plain string message of a documented error", async () => {
    reply(() => documentedError(403, "No autorizado."));

    await expect(call()).rejects.toMatchObject({ message: "No autorizado.", status: 403 });
  });

  it("raises a contract error when the error body does not follow the documented shape", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    reply(() => HttpResponse.json({ oops: true }, { status: 500 }));

    await expect(call()).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("raises a contract error when the body is not JSON", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    reply(() => new HttpResponse("<html>502</html>", { status: 502 }));

    await expect(call()).rejects.toBeInstanceOf(ServiceContractError);
    expect(infoSpy).toHaveBeenCalledWith("[m6-telemetry]", {
      name: "request_malformed_response",
      resource: "services",
    });
  });

  it("raises a contract error when a successful response breaks the contract", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    reply(() => HttpResponse.json({ nope: true }, { status: 200 }));

    await expect(call()).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("exposes a transport failure as a NetworkFailureError and records telemetry", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    reply(() => HttpResponse.error());

    await expect(call()).rejects.toBeInstanceOf(NetworkFailureError);
    expect(infoSpy).toHaveBeenCalledWith("[m6-telemetry]", {
      name: "request_network_failure",
      resource: "services",
    });
  });
});

describe("servicesAdapter.list query string", () => {
  it("serializes every filter and repeats status for several values", async () => {
    let seen: URL | undefined;
    server.use(
      http.get("*/api/services", ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json({
          data: [],
          meta: { page: 2, pageSize: 5, total: 0, totalPages: 0 },
        });
      }),
    );
    const query: ServiceQuery = {
      status: ["SCHEDULED", "IN_PROGRESS"],
      mode: "POINT",
      origin: "INSPECTION",
      zoneId: "z1",
      crewId: "c1",
      serviceTypeId: "t1",
      vehicleId: "v1",
      ticketId: "tk1",
      search: "barrido sur",
      timeFrom: "08:00",
      timeTo: "12:00",
      scheduledFrom: "2026-10-01",
      scheduledTo: "2026-10-31",
      page: 2,
      pageSize: 5,
    };

    const page = await servicesAdapter.list(query);

    expect(seen?.searchParams.getAll("status")).toEqual(["SCHEDULED", "IN_PROGRESS"]);
    const { status: _status, ...scalars } = query;
    for (const [key, value] of Object.entries(scalars)) {
      expect(seen?.searchParams.get(key)).toBe(String(value));
    }
    expect(page).toMatchObject({ services: [], page: 2, pageSize: 5, total: 0, totalPages: 0 });
  });

  it("sends a single status as a scalar and no query string when the query is empty", async () => {
    const urls: string[] = [];
    server.use(
      http.get("*/api/services", ({ request }) => {
        urls.push(new URL(request.url).search);
        return HttpResponse.json({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });
      }),
    );

    await servicesAdapter.list({ status: "SUSPENDED" });
    await servicesAdapter.list({});

    expect(urls).toEqual(["?status=SUSPENDED", ""]);
  });

  it("sends page 0 instead of dropping it as falsy", async () => {
    let search = "";
    server.use(
      http.get("*/api/services", ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ data: [], meta: { page: 0, pageSize: 10, total: 0, totalPages: 0 } });
      }),
    );

    await servicesAdapter.list({ page: 0, pageSize: 10 });

    expect(search).toBe("?page=0&pageSize=10");
  });
});

describe("servicesAdapter write responses", () => {
  it("unwraps a { data } envelope on create but keeps a bare service", async () => {
    server.use(
      http.post("*/api/services", () => HttpResponse.json({ data: serviceBody({ id: "SVC-ENV" }) }, { status: 201 })),
    );
    const input = {
      serviceTypeId: "st-street-cleaning",
      origin: "PLANNED" as const,
      zoneIds: ["zone-1"],
      scheduledDate: futureDate,
      timeWindow: { start: "08:00", end: "12:00" },
    };

    expect((await servicesAdapter.create(input)).id).toBe("SVC-ENV");

    server.use(http.post("*/api/services", () => HttpResponse.json(serviceBody({ id: "SVC-BARE" }), { status: 201 })));
    expect((await servicesAdapter.create(input)).id).toBe("SVC-BARE");
  });

  it("sends the container location on complete only when it is provided", async () => {
    const bodies: Array<string | null> = [];
    server.use(
      http.post("*/api/services/SVC-77/complete", async ({ request }) => {
        bodies.push(request.headers.get("content-type") ? await request.text() : null);
        return HttpResponse.json(serviceBody({ status: "COMPLETED" }));
      }),
    );

    await servicesAdapter.complete("SVC-77");
    await servicesAdapter.complete("SVC-77", {
      containerLocation: { address: "  Av. Siempre Viva 742 ", lat: -34.6, lng: -58.4 },
    });

    expect(bodies[0]).toBeNull();
    expect(JSON.parse(bodies[1] as string)).toEqual({
      containerLocation: { address: "Av. Siempre Viva 742", lat: -34.6, lng: -58.4 },
    });
  });

  it("rejects a container location with a blank address before calling the backend", async () => {
    const hit = vi.fn();
    server.use(http.post("*/api/services/SVC-77/complete", () => (hit(), HttpResponse.json(serviceBody()))));

    await expect(
      servicesAdapter.complete("SVC-77", { containerLocation: { address: "   ", lat: -34.6, lng: -58.4 } }),
    ).rejects.toBeInstanceOf(ServiceContractError);
    expect(hit).not.toHaveBeenCalled();
  });

  it("rejects a zone result that is not SERVICED and has no reason, and one SERVICED with a reason", async () => {
    const hit = vi.fn();
    server.use(http.post("*/api/services/SVC-77/zone-results", () => (hit(), HttpResponse.json({}))));

    await expect(
      servicesAdapter.recordZoneResult("SVC-77", { zoneId: "zone-3", status: "PARTIAL" }),
    ).rejects.toBeInstanceOf(ServiceContractError);
    await expect(
      servicesAdapter.recordZoneResult("SVC-77", { zoneId: "zone-3", status: "SERVICED", reason: "WEATHER" }),
    ).rejects.toBeInstanceOf(ServiceContractError);
    expect(hit).not.toHaveBeenCalled();
  });
});

describe("servicesAdapter.uploadEvidence", () => {
  const attachment = {
    id: "att-1",
    url: "https://evidence.example.com/foto.png",
    filename: "foto.png",
    contentType: "image/png",
    uploadedAt: "2026-09-30T10:00:00Z",
  };

  it("sends the file with its owner and the caller's idempotency key, and adds serviceId only for a ZONE_RESULT", async () => {
    const seen: Array<{ key: string | null; form: FormData }> = [];
    server.use(
      http.post("*/api/evidence", async ({ request }) => {
        seen.push({ key: request.headers.get("Idempotency-Key"), form: await request.formData() });
        return HttpResponse.json(attachment, { status: 201 });
      }),
    );
    const file = new File(["x"], "foto.png", { type: "image/png" });

    const stored = await servicesAdapter.uploadEvidence({
      file,
      ownerType: "ZONE_RESULT",
      ownerId: "ZR-1",
      serviceId: "SVC-77",
      idempotencyKey: "clave-fija",
    });
    await servicesAdapter.uploadEvidence({ file, ownerType: "SERVICE", ownerId: "SVC-77", serviceId: "SVC-77" });

    expect(stored).toEqual(attachment);
    expect(seen[0].key).toBe("clave-fija");
    expect(seen[0].form.get("ownerType")).toBe("ZONE_RESULT");
    expect(seen[0].form.get("ownerId")).toBe("ZR-1");
    expect(seen[0].form.get("serviceId")).toBe("SVC-77");
    expect(seen[0].form.get("fileName")).toBe("foto.png");
    expect(seen[1].form.has("serviceId")).toBe(false);
    expect(seen[1].key).toBeTruthy();
    expect(seen[1].key).not.toBe("clave-fija");
  });
});

describe("servicesAdapter.getZoneResultEvidence errors", () => {
  it("surfaces a documented error with its status", async () => {
    server.use(http.get("*/api/evidence", () => documentedError(404, "Sin evidencia.")));

    await expect(servicesAdapter.getZoneResultEvidence("ZR-9")).rejects.toMatchObject({
      message: "Sin evidencia.",
      status: 404,
    });
  });

  it("raises a contract error when the error body is undocumented", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    server.use(http.get("*/api/evidence", () => HttpResponse.json({ x: 1 }, { status: 500 })));

    await expect(servicesAdapter.getZoneResultEvidence("ZR-9")).rejects.toBeInstanceOf(ServiceContractError);
  });
});
