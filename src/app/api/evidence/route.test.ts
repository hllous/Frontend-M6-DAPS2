import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import {
  addZoneResultFixture,
  evidenceCache,
  resetServiceFixtures,
  resetZoneResultFixtures,
  zoneResultFixtures,
} from "@/lib/services-fixtures";
import { POST } from "./route";

beforeEach(() => {
  resetServiceFixtures();
  resetZoneResultFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  if (mode === "backend-development") {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  }
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

describe("POST /api/evidence BFF route", () => {
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
    const cookie = await authenticatedCookie("office-duty-queue");
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

    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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

  it("returns 400 when file exceeds 10 MB", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const largeFile = new File(["dummy"], "big.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", largeFile);
    formData.append("fileSize", String(11 * 1024 * 1024));
    formData.append("ownerType", "ZONE_RESULT");
    formData.append("ownerId", "ZR-1");

    const response = await POST(
      new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "key-3" },
        body: formData,
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/10 MB/i);
  });

  it("returns 400 when MIME type is not allowed", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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

    const cookie = await authenticatedCookie("field-crew-leader-route");
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

    const cookie = await authenticatedCookie("field-crew-leader-route");
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
});
