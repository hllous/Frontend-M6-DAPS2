import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addZoneResultFixture,
  evidenceCache,
  resetServiceFixtures,
  resetZoneResultFixtures,
  serviceFixtures,
  zoneResultFixtures,
} from "@/lib/services-fixtures";
import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { withNodeFile } from "@/mocks/node-file";
import { GET, POST as rawPost } from "./route";
import { createSessionCookie, loginAs } from "@/test/session";

const POST = (request: Request) => withNodeFile(() => rawPost(request));

beforeEach(() => {
  resetServiceFixtures();
  resetZoneResultFixtures();
  resetContainerFixtures();
  evidenceCache.clear();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
  resetServiceFixtures();
  resetZoneResultFixtures();
  resetContainerFixtures();
  evidenceCache.clear();
});


function evidenceRequest(cookie: string, ownerType: string, ownerId: string, key?: string, serviceId?: string) {
  const body = new FormData();
  body.append("file", new File(["image"], "photo.jpg", { type: "image/jpeg" }));
  body.append("ownerType", ownerType);
  body.append("ownerId", ownerId);
  if (serviceId) body.append("serviceId", serviceId);
  return new Request("http://localhost/api/evidence", {
    method: "POST", headers: { cookie, ...(key === undefined ? {} : { "Idempotency-Key": key }) }, body,
  });
}

// Build actual multipart bytes: jsdom FormData serializes its File differently from Undici.
function sizedMultipartRequest(cookie: string, fileBytes: number, contentLength: string) {
  const boundary = "evidence-size-boundary";
  const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.jpg"\r\nContent-Type: image/jpeg\r\n\r\n${"x".repeat(fileBytes)}\r\n`
    + `--${boundary}\r\nContent-Disposition: form-data; name="ownerType"\r\n\r\nSERVICE\r\n`
    + `--${boundary}\r\nContent-Disposition: form-data; name="ownerId"\r\n\r\nSVC-1050\r\n`
    + `--${boundary}\r\nContent-Disposition: form-data; name="fileSize"\r\n\r\n1\r\n--${boundary}--\r\n`;
  return new Request("http://localhost/api/evidence", {
    method: "POST", body,
    headers: { cookie, "Idempotency-Key": "actual-size", "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": contentLength },
  });
}

const backendSessionSettings = {
  mode: "backend-development" as const,
  devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
  backendOrigin: "https://backend.internal",
};

const backendFieldSession = {
  ...backendSessionSettings,
  crew: { id: "crew-real", name: "Cuadrilla real" },
};

describe("POST /api/evidence BFF route", () => {
  it("denies another Field crew replaying an authorized upload key", async () => {
    const cookieA = await loginAs("field-crew-leader-route", { mode: "mock" });
    const first = await POST(evidenceRequest(cookieA, "SERVICE", "SVC-1050", "shared-key"));
    expect(first.status).toBe(201);
    const cookieB = createSessionCookie("field-crew-leader-route", {
      mode: "mock",
      crew: { id: "crew-a", name: "Otra cuadrilla" },
    });

    const replay = await POST(evidenceRequest(cookieB, "SERVICE", "SVC-1050", "shared-key"));

    expect(replay.status).toBe(403);
  });

  it("rechecks the Service assignment before replaying a cached upload", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    expect((await POST(evidenceRequest(cookie, "SERVICE", "SVC-1050", "reassigned-key"))).status).toBe(201);
    serviceFixtures.find((service) => service.id === "SVC-1050")!.crewId = "crew-a";

    expect((await POST(evidenceRequest(cookie, "SERVICE", "SVC-1050", "reassigned-key"))).status).toBe(403);
  });

  it("scopes authorized container retries to the actor and crew", async () => {
    const field = await loginAs("field-crew-leader-route", { mode: "mock" });
    const otherCrewMember = await loginAs("field-crew-member-route", { mode: "mock" });
    expect((await POST(evidenceRequest(field, "CONTAINER", "cont-1", "actor-key"))).status).toBe(201);
    expect((await POST(evidenceRequest(otherCrewMember, "CONTAINER", "cont-1", "actor-key"))).status).toBe(201);
    expect((await POST(evidenceRequest(field, "CONTAINER", "cont-1", "actor-key"))).status).toBe(200);
  });

  it.each(["a".repeat(129), "key:bad", "key/bad", "key bad"])("rejects invalid Idempotency-Key %s", async (key) => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    expect((await POST(evidenceRequest(cookie, "SERVICE", "SVC-1050", key))).status).toBe(400);
  });

  it.each(["a".repeat(101), "../service", "service/1", "service bad"])("rejects malformed ownerId %s", async (ownerId) => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    expect((await POST(evidenceRequest(cookie, "SERVICE", ownerId, "owner-key"))).status).toBe(400);
  });

  it("requires Idempotency-Key in backend-development without contacting the backend", async () => {
    const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
    const backendFetch = vi.spyOn(globalThis, "fetch");

    expect((await POST(evidenceRequest(cookie, "SERVICE", "d8a3a8e5-f7d7-4453-9095-e22478e0fc01"))).status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("checks the real Service crew before forwarding an upload", async () => {
    const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
    const ownerId = "d8a3a8e5-f7d7-4453-9095-e22478e0fc01";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: ownerId, crewId: "another-crew" }));

    const response = await POST(evidenceRequest(cookie, "SERVICE", ownerId, "backend-crew-key"));

    expect(response.status).toBe(403);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/services/${ownerId}`);
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
  });

  it("proxies GET /evidence to the backend instead of 404ing on real container ids (#732)", async () => {
    const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
    const containerId = "79bcdbd4-e9fe-48e5-b011-643f6d13857b";
    const attachments = [{ id: "att-1", url: "https://cdn/x.jpg", filename: "x.jpg", contentType: "image/jpeg", uploadedAt: "2026-10-28T12:00:00.000Z" }];
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(attachments));

    const response = await GET(new Request(`http://localhost/api/evidence?ownerType=CONTAINER&ownerId=${containerId}`, { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(attachments);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/evidence?ownerType=CONTAINER&ownerId=${containerId}`);
  });

  describe("backend GET /evidence", () => {
    const get = (cookie: string, query: string) => GET(new Request(`http://localhost/api/evidence?${query}`, { headers: { cookie } }));
    const uuid = "79bcdbd4-e9fe-48e5-b011-643f6d13857b";

    it.each(["a/../b", "a".repeat(101)])("rejects ownerId %s without calling the backend", async (ownerId) => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch");

      expect((await get(cookie, `ownerType=CONTAINER&ownerId=${encodeURIComponent(ownerId)}`)).status).toBe(400);
      expect(backendFetch).not.toHaveBeenCalled();
    });

    it("rejects an invalid ownerType without calling the backend", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch");

      expect((await get(cookie, `ownerType=NOPE&ownerId=${uuid}`)).status).toBe(400);
      expect(backendFetch).not.toHaveBeenCalled();
    });

    it("forwards a backend 404 as 404", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ statusCode: 404, message: "No existe", error: "Not Found", timestamp: "2026-10-29T00:00:00.000Z", path: "/evidence" }, { status: 404 }));

      expect((await get(cookie, `ownerType=CONTAINER&ownerId=${uuid}`)).status).toBe(404);
    });

    it("denies Field reading evidence of a Service assigned to another crew", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: uuid, crewId: "another-crew" }));

      expect((await get(cookie, `ownerType=SERVICE&ownerId=${uuid}`)).status).toBe(403);
      expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/services/${uuid}`);
    });
  });

  describe("backend owner scope", () => {
    const serviceId = "d8a3a8e5-f7d7-4453-9095-e22478e0fc01";
    const ownerId = "79bcdbd4-e9fe-48e5-b011-643f6d13857b";

    it("checks Inspection ownership through its real Service", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ id: ownerId, serviceId }))
        .mockResolvedValueOnce(Response.json({ id: serviceId, crewId: "another-crew" }));

      expect((await POST(evidenceRequest(cookie, "INSPECTION", ownerId, "inspection-scope"))).status).toBe(403);
      expect(backendFetch.mock.calls.map(([url]) => String(url))).toEqual([
        `https://backend.internal/environmental-inspections/${ownerId}`,
        `https://backend.internal/services/${serviceId}`,
      ]);
    });

    it("uploads an owned ZoneResult with the optional serviceId fast path", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ id: serviceId, crewId: "crew-real" }))
        .mockResolvedValueOnce(Response.json([{ id: ownerId }]))
        .mockResolvedValueOnce(Response.json({ id: "attachment-real" }, { status: 201 }));
      const response = await POST(evidenceRequest(cookie, "ZONE_RESULT", ownerId, "zone-fast", serviceId));

      expect(response.status).toBe(201);
      expect(backendFetch.mock.calls.map(([url]) => String(url))).toEqual([
        `https://backend.internal/services/${serviceId}`,
        `https://backend.internal/services/${serviceId}/zone-results`,
        "https://backend.internal/evidence",
      ]);
      expect([...(backendFetch.mock.calls[2]?.[1]?.body as FormData).keys()]).toEqual(["file", "ownerType", "ownerId"]);
    });

    it("rejects another crew's Service on the ZoneResult fast path", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id: serviceId, crewId: "another-crew" }));

      expect((await POST(evidenceRequest(cookie, "ZONE_RESULT", ownerId, "zone-fast-foreign", serviceId))).status).toBe(403);
      expect(backendFetch).toHaveBeenCalledTimes(1);
    });

    it("rejects a ZoneResult absent from the assigned-services fallback", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ data: [], meta: { totalPages: 0 } }));

      expect((await POST(evidenceRequest(cookie, "ZONE_RESULT", ownerId, "zone-not-found"))).status).toBe(403);
      expect(backendFetch).toHaveBeenCalledTimes(1);
    });

    it("rejects malformed optional serviceId before contacting the backend", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch");

      expect((await POST(evidenceRequest(cookie, "ZONE_RESULT", ownerId, "zone-invalid-parent", "../service"))).status).toBe(400);
      expect(backendFetch).not.toHaveBeenCalled();
    });

    it("rejects a Field session without a resolved backend crew", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendSessionSettings);
      const backendFetch = vi.spyOn(globalThis, "fetch");

      expect((await POST(evidenceRequest(cookie, "SERVICE", serviceId, "missing-crew"))).status).toBe(403);
      expect(backendFetch).not.toHaveBeenCalled();
    });

    it("never reuses a stale mock cache entry in backend-development", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      evidenceCache.set(`SERVICE:${serviceId}:stale-key`, {
        id: "mock-attachment", url: "/mock/evidence/photo.jpg", filename: "photo.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-05T10:00:00Z",
      });
      const backendFetch = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ id: serviceId, crewId: "crew-real" }))
        .mockResolvedValueOnce(Response.json({ id: "backend-attachment" }, { status: 201 }));

      const response = await POST(evidenceRequest(cookie, "SERVICE", serviceId, "stale-key"));

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: "backend-attachment" });
      expect(backendFetch).toHaveBeenCalledTimes(2);
      expect(backendFetch.mock.calls[1]?.[1]?.method).toBe("POST");
    });

    it("finds an owned ZoneResult across assigned service pages without serviceId", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ data: [], meta: { totalPages: 2 } }))
        .mockResolvedValueOnce(Response.json({ data: [{ id: serviceId, crewId: "crew-real" }], meta: { totalPages: 2 } }))
        .mockResolvedValueOnce(Response.json([{ id: ownerId }]))
        .mockResolvedValueOnce(Response.json({ id: "attachment-real" }, { status: 201 }));

      expect((await POST(evidenceRequest(cookie, "ZONE_RESULT", ownerId, "zone-fallback"))).status).toBe(201);
      expect(backendFetch.mock.calls.map(([url]) => String(url))).toEqual([
        "https://backend.internal/services?crewId=crew-real&pageSize=100&page=1",
        "https://backend.internal/services?crewId=crew-real&pageSize=100&page=2",
        `https://backend.internal/services/${serviceId}/zone-results`,
        "https://backend.internal/evidence",
      ]);
    });

    it("does not trust an unrelated crew returned by the assigned-services filter", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({
        data: [{ id: serviceId, crewId: "another-crew" }], meta: { totalPages: 1 },
      }));

      expect((await POST(evidenceRequest(cookie, "ZONE_RESULT", ownerId, "zone-foreign"))).status).toBe(403);
      expect(backendFetch).toHaveBeenCalledTimes(1);
    });

    it("rejects a ZoneResult absent from the selected assigned Service", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ id: serviceId, crewId: "crew-real" }))
        .mockResolvedValueOnce(Response.json([]));
      const form = new FormData();
      form.append("file", new File(["image"], "photo.jpg", { type: "image/jpeg" }));
      form.append("ownerType", "ZONE_RESULT");
      form.append("ownerId", ownerId);
      form.append("serviceId", serviceId);

      expect((await POST(new Request("http://localhost/api/evidence", { method: "POST", headers: { cookie, "Idempotency-Key": "zone-absent" }, body: form }))).status).toBe(403);
      expect(backendFetch).toHaveBeenCalledTimes(2);
    });

    it("stops the ZoneResult fallback after ten service pages", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ data: [], meta: { totalPages: 11 } }));

      expect((await POST(evidenceRequest(cookie, "ZONE_RESULT", ownerId, "zone-page-cap"))).status).toBe(403);
      expect(backendFetch).toHaveBeenCalledTimes(10);
      expect(String(backendFetch.mock.calls[9]?.[0])).toContain("page=10");
    });

    it.each([401, 403, 404, 503])("preserves owner lookup HTTP %s without uploading", async (status) => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ message: "Error de origen" }, { status }));

      expect((await POST(evidenceRequest(cookie, "SERVICE", serviceId, "upstream-error"))).status).toBe(status);
      expect(backendFetch).toHaveBeenCalledTimes(1);
    });

    it.each([{ crewId: 42 }, { id: serviceId }, "not-json"])("rejects malformed owner responses without uploading: %j", async (payload) => {
      const cookie = createSessionCookie("field-crew-leader-route", backendFieldSession);
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        typeof payload === "string" ? new Response(payload) : Response.json(payload),
      );

      expect((await POST(evidenceRequest(cookie, "SERVICE", serviceId, "malformed-owner"))).status).toBe(502);
      expect(backendFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("evicts old mock retries when the bounded cache fills", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    for (let index = 0; index <= 256; index++) {
      expect((await POST(evidenceRequest(cookie, "SERVICE", "SVC-1050", `bounded-${index}`))).status).toBe(201);
    }
    expect((await POST(evidenceRequest(cookie, "SERVICE", "SVC-1050", "bounded-256"))).status).toBe(200);
    expect((await POST(evidenceRequest(cookie, "SERVICE", "SVC-1050", "bounded-0"))).status).toBe(201);
  });

  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { "Idempotency-Key": "key-1" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for an actor without service:execute (Evidence is a Crew Leader action)", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const formData = new FormData();
    formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
    formData.append("ownerType", "ZONE_RESULT");
    formData.append("ownerId", "ZR-1");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "key-office" },
        body: formData,
      }),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/cuadrilla/i);
  });

  it("returns 403 when the Field actor's crew does not own the target Service", async () => {
    // SVC-1042 belongs to crew-a; field-crew-leader-route is crew-b
    addZoneResultFixture({
      id: "ZR-OTHER-CREW",
      serviceId: "SVC-1042",
      zoneId: "zone-1",
      status: "SERVICED",
      reason: null,
      notes: null,
      attachments: [],
      recordedAt: "2026-09-05 10:00",
    });

    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const formData = new FormData();
    formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
    formData.append("ownerType", "ZONE_RESULT");
    formData.append("ownerId", "ZR-OTHER-CREW");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "key-other-crew" },
        body: formData,
      }),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/cuadrilla asignada/i);
  });

  it("requires Idempotency-Key header and returns 400 when missing", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const formData = new FormData();
    formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
    formData.append("ownerType", "ZONE_RESULT");
    formData.append("ownerId", "ZR-1");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie },
        body: formData,
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/Idempotency-Key/i);
  });

  it("returns 400 when ownerType is invalid", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const formData = new FormData();
    formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
    formData.append("ownerType", "INVALID_TYPE");
    formData.append("ownerId", "ZR-1");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "key-2" },
        body: formData,
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 413 when file exceeds 4 MB despite understated size hints", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(sizedMultipartRequest(cookie, 4 * 1024 * 1024 + 1, "1"));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: "Payload Too Large", message: "El archivo supera el tamaño máximo permitido de 4 MB." });
  });

  it("accepts a file exactly 4 MB with room for multipart metadata", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(sizedMultipartRequest(cookie, 4 * 1024 * 1024, String(4 * 1024 * 1024 + 64 * 1024)));

    expect(response.status).toBe(201);
  });

  it("rejects an oversized Content-Length before reading the multipart body", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const request = new Request("http://localhost/api/evidence", {
      method: "POST",
      headers: { cookie, "Idempotency-Key": "large-body", "content-length": String(4 * 1024 * 1024 + 64 * 1024 + 1) },
      body: "unparsed body",
    });
    const parseBody = vi.spyOn(request, "formData");

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(parseBody).not.toHaveBeenCalled();
  });

  it("returns 400 when more than one file is sent", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const formData = new FormData();
    formData.append("file", new File(["first"], "first.jpg", { type: "image/jpeg" }));
    formData.append("file", new File(["second"], "second.jpg", { type: "image/jpeg" }));
    formData.append("ownerType", "ZONE_RESULT");
    formData.append("ownerId", "ZR-1");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "key-multiple-files" },
        body: formData,
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Solo se permite un archivo por solicitud de evidencia.");
  });

  it("returns 400 when MIME type is not allowed", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const formData = new FormData();
    formData.append("file", new Blob(["text content"], { type: "text/plain" }), "test.txt");
    formData.append("ownerType", "ZONE_RESULT");
    formData.append("ownerId", "ZR-1");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "key-4" },
        body: formData,
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/JPEG, PNG, WebP o PDF/i);
  });

  it("returns 404 when owner ZONE_RESULT does not exist", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const formData = new FormData();
    formData.append("file", new Blob(["image-bytes"], { type: "image/jpeg" }), "photo.jpg");
    formData.append("ownerType", "ZONE_RESULT");
    formData.append("ownerId", "ZR-NONEXISTENT");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "key-5" },
        body: formData,
      }),
    );
    expect(response.status).toBe(404);
  });

  it("uploads evidence successfully, returns sanitized canonical filename, and attaches to owner", async () => {
    addZoneResultFixture({
      id: "ZR-TEST-1",
      serviceId: "SVC-1050",
      zoneId: "zone-3",
      status: "PARTIAL",
      reason: "WEATHER",
      notes: null,
      attachments: [],
      recordedAt: "2026-09-05 10:00",
    });

    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const formData = new FormData();
    const file = new File(
      ["image-bytes"],
      "Foto Calle Con Agua #12 (final).jpg",
      { type: "image/jpeg" },
    );
    formData.append("file", file);
    formData.append("fileName", "Foto Calle Con Agua #12 (final).jpg");
    formData.append("ownerType", "ZONE_RESULT");
    formData.append("ownerId", "ZR-TEST-1");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "idemp-unique-1" },
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toMatch(/^att-/);
    // Sanitized canonical filename has stripped special chars and spaces
    expect(body.filename).toBe("Foto_Calle_Con_Agua_12_final.jpg");
    expect(body.contentType).toBe("image/jpeg");

    // Attached to the ZoneResult
    const zr = zoneResultFixtures.find((r) => r.id === "ZR-TEST-1");
    expect(zr?.attachments).toHaveLength(1);
    expect(zr?.attachments[0].filename).toBe("Foto_Calle_Con_Agua_12_final.jpg");
  });

  it("forwards only the UploadEvidenceDto fields to the backend (no fileName or fileSize)", async () => {
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", crew: { id: "crew-real", name: "Cuadrilla Belgrano — Recolección", role: "LEADER" }, devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature", backendOrigin: "https://backend.internal" });
    backendFetch.mockClear();
    let sentKeys: string[] = [];
    backendFetch.mockImplementation(async (input, init) => {
      if (String(input).includes("/environmental-inspections/")) {
        return Response.json({ id: "8d5bc42e-b6e5-404e-aea4-b1654f6c6baa", serviceId: "real-service" });
      }
      if (String(input).endsWith("/services/real-service")) {
        return Response.json({ id: "real-service", crewId: "crew-real" });
      }
      sentKeys = [...(init?.body as FormData).keys()];
      return new Response(JSON.stringify({ id: "att-1" }), { status: 201, headers: { "content-type": "application/json" } });
    });
    const formData = new FormData();
    formData.append("file", new File(["img"], "acta.png", { type: "image/png" }));
    formData.append("fileName", "acta.png");
    formData.append("fileSize", "3");
    formData.append("ownerType", "INSPECTION");
    formData.append("ownerId", "8d5bc42e-b6e5-404e-aea4-b1654f6c6baa");

    const response = await POST(new Request("http://localhost/api/evidence", { method: "POST", headers: { cookie, "Idempotency-Key": "idemp-backend-1" }, body: formData }));

    expect(response.status).toBe(201);
    expect(sentKeys).toEqual(["file", "ownerType", "ownerId"]);
  });

  it("returns cached existing attachment when same Idempotency-Key is reused", async () => {
    addZoneResultFixture({
      id: "ZR-TEST-2",
      serviceId: "SVC-1050",
      zoneId: "zone-3",
      status: "SERVICED",
      reason: null,
      notes: null,
      attachments: [],
      recordedAt: "2026-09-05 10:00",
    });

    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const formData1 = new FormData();
    formData1.append("file", new Blob(["image-bytes"], { type: "image/png" }), "foto.png");
    formData1.append("ownerType", "ZONE_RESULT");
    formData1.append("ownerId", "ZR-TEST-2");

    const response1 = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "same-key-123" },
        body: formData1,
      }),
    );
    expect(response1.status).toBe(201);
    const body1 = await response1.json();

    // Second call with same idempotency key
    const formData2 = new FormData();
    formData2.append("file", new Blob(["image-bytes"], { type: "image/png" }), "foto.png");
    formData2.append("ownerType", "ZONE_RESULT");
    formData2.append("ownerId", "ZR-TEST-2");

    const response2 = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "same-key-123" },
        body: formData2,
      }),
    );
    expect(response2.status).toBe(200);
    const body2 = await response2.json();
    expect(body2.id).toBe(body1.id);
    expect(body2.filename).toBe(body1.filename);
  });

  describe("ownerType=CONTAINER evidence flow", () => {
    it("allows Field crew member to upload evidence for a container without service assignment", async () => {
      const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
      const formData = new FormData();
      const file = new File(["img-data"], "desborde.jpg", { type: "image/jpeg" });
      formData.append("file", file);
      formData.append("fileName", "desborde.jpg");
      formData.append("ownerType", "CONTAINER");
      formData.append("ownerId", "cont-1");

      const response = await POST(
        new Request("http://localhost/api/evidence", {
          method: "POST",
          headers: { cookie, "Idempotency-Key": "cont-key-1" },
          body: formData,
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toMatchObject({
        filename: "desborde.jpg",
        contentType: "image/jpeg",
      });
    });

    it("denies Office uploading evidence for a container: only the crew does (Backend #161)", async () => {
      const cookie = await loginAs("office-duty-queue", { mode: "mock" });
      const formData = new FormData();
      const file = new File(["img-data"], "dano.webp", { type: "image/webp" });
      formData.append("file", file);
      formData.append("fileName", "dano.webp");
      formData.append("ownerType", "CONTAINER");
      formData.append("ownerId", "cont-1");

      const response = await POST(
        new Request("http://localhost/api/evidence", {
          method: "POST",
          headers: { cookie, "Idempotency-Key": "cont-key-2" },
          body: formData,
        }),
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: "ROLE_REQUIRED" });
    });

    it("blocks actors without container:report from uploading container evidence", async () => {
      const cookie = await loginAs("office-limited-intake", { mode: "mock" });
      const formData = new FormData();
      const file = new File(["img-data"], "test.jpg", { type: "image/jpeg" });
      formData.append("file", file);
      formData.append("fileName", "test.jpg");
      formData.append("ownerType", "CONTAINER");
      formData.append("ownerId", "cont-1");

      const response = await POST(
        new Request("http://localhost/api/evidence", {
          method: "POST",
          headers: { cookie, "Idempotency-Key": "cont-key-3" },
          body: formData,
        }),
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toMatch(/contenedores/i);
    });

    it("returns 404 if container ownerId does not exist", async () => {
      const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
      const formData = new FormData();
      const file = new File(["img-data"], "test.jpg", { type: "image/jpeg" });
      formData.append("file", file);
      formData.append("fileName", "test.jpg");
      formData.append("ownerType", "CONTAINER");
      formData.append("ownerId", "cont-non-existent");

      const response = await POST(
        new Request("http://localhost/api/evidence", {
          method: "POST",
          headers: { cookie, "Idempotency-Key": "cont-key-4" },
          body: formData,
        }),
      );

      expect(response.status).toBe(404);
    });

    it("retrieves flat list of container attachments via GET /api/evidence", async () => {
      const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
      // First upload an attachment
      const formData = new FormData();
      const file = new File(["img-data"], "vista.jpg", { type: "image/jpeg" });
      formData.append("file", file);
      formData.append("fileName", "vista.jpg");
      formData.append("ownerType", "CONTAINER");
      formData.append("ownerId", "cont-1");

      await POST(
        new Request("http://localhost/api/evidence", {
          method: "POST",
          headers: { cookie, "Idempotency-Key": "cont-key-5" },
          body: formData,
        }),
      );

      // Now GET attachments
      const getRes = await GET(
        new Request("http://localhost/api/evidence?ownerType=CONTAINER&ownerId=cont-1", {
          headers: { cookie },
        }),
      );

      expect(getRes.status).toBe(200);
      const list = await getRes.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].filename).toBe("vista.jpg");
    });
  });
});
