import { Blob as NodeBlob } from "node:buffer";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";

import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { evidenceCache, resetServiceFixtures } from "@/lib/services-fixtures";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { createSessionCookie } from "@/test/session";

import { handlers } from "./handlers";
import { withNodeFile } from "./node-file";

const server = setupServer(...handlers);

const officeCookie = createSessionCookie("office-duty-queue", { mode: "mock" });
const crewCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
  resetStreetClosureRequestFixtures();
  resetRepairRequestFixtures();
  resetServiceFixtures();
  evidenceCache.clear();
});
afterAll(() => server.close());

function call(method: string, path: string, cookie?: string, body?: unknown) {
  return fetch(`http://localhost${path}`, {
    method,
    headers: { ...(method === "GET" ? {} : SESSION_MUTATION_HEADERS), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function uploadEvidence(ownerId: string, options: { cookie?: string; key?: string } = {}) {
  const boundary = "street-repair-boundary";
  const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n${"x".repeat(8)}\r\n`
    + `--${boundary}\r\nContent-Disposition: form-data; name="ownerType"\r\n\r\nSERVICE\r\n`
    + `--${boundary}\r\nContent-Disposition: form-data; name="ownerId"\r\n\r\n${ownerId}\r\n--${boundary}--\r\n`;
  vi.stubGlobal("Blob", NodeBlob);
  return withNodeFile(() => fetch("http://localhost/api/evidence", {
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      ...(options.key === undefined ? {} : { "Idempotency-Key": options.key }),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body,
  }));
}

describe("street closure handlers delegate to the real BFF routes", () => {
  it("lists requests for Office and rejects a Field crew session creating one with the real 403", async () => {
    const list = await call("GET", "/api/street-closure-requests");
    expect(list.status).toBe(200);
    expect((await list.json()).data.length).toBeGreaterThan(0);

    const denied = await call("POST", "/api/street-closure-requests", crewCookie, {});
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ statusCode: 403 });
  });

  it("returns the real 404 for an unknown request and 400 for an invalid approval", async () => {
    expect((await call("GET", "/api/street-closure-requests/SCR-UNKNOWN")).status).toBe(404);
    expect((await call("POST", "/api/street-closure-requests/SCR-1001/approve", undefined, {})).status).toBe(400);
  });
});

describe("repair request handlers delegate to the real BFF routes", () => {
  it("lists repair requests for Office and rejects a Field crew session reconciling one with the real 403", async () => {
    const list = await call("GET", "/api/repair-requests");
    expect(list.status).toBe(200);

    const denied = await call("POST", "/api/repair-requests/RR-1001/start", crewCookie, {});
    expect(denied.status).toBe(403);
  });

  it("lets a Field crew create a repair request from its own service and rejects another crew's with the real 403", async () => {
    const body = { damageType: "BROKEN_SIDEWALK", address: "Av. Rivadavia 2200", severity: "LOW", publicSafetyRisk: false, detectedInType: "SERVICE" };

    expect((await call("POST", "/api/repair-requests", crewCookie, { ...body, detectedInId: "SVC-1050" })).status).toBe(201);
    expect((await call("POST", "/api/repair-requests", crewCookie, { ...body, detectedInId: "SVC-1042" })).status).toBe(403);
  });

  it("returns the real 404 for an unknown repair request", async () => {
    expect((await call("GET", "/api/repair-requests/RR-UNKNOWN")).status).toBe(404);
  });
});

describe("evidence handlers delegate to the real BFF routes", () => {
  it("requires the Idempotency-Key header", async () => {
    expect((await uploadEvidence("SVC-1050")).status).toBe(400);
  });

  it("uploads as the assigned Field crew and replays the same Idempotency-Key", async () => {
    const first = await uploadEvidence("SVC-1050", { key: "street-repair-key" });
    expect(first.status).toBe(201);
    const attachment = await first.json();

    const replay = await uploadEvidence("SVC-1050", { key: "street-repair-key" });
    expect(await replay.json()).toEqual(attachment);
  });

  it("rejects a Field crew uploading to a service of another crew with the real 403", async () => {
    const response = await uploadEvidence("SVC-1042", { key: "other-crew-key" });

    expect(response.status).toBe(403);
  });

  it("lists evidence for Office and returns 400 without the owner", async () => {
    expect((await call("GET", "/api/evidence")).status).toBe(400);
    expect((await call("GET", "/api/evidence?ownerType=SERVICE&ownerId=SVC-1050")).status).toBe(200);
  });
});
