import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { GET } from "./route";
import {
  auditEntry,
  configureIntegrationMonitorBackend,
  integrationMonitorBackend as server,
  integrationMonitorCookie,
  integrationMonitorRequest as request,
  paginatedResponse,
} from "@/test/integration-monitor-backend";

let restoreEnvironment: () => void;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => { restoreEnvironment = configureIntegrationMonitorBackend(); });
afterEach(() => {
  server.resetHandlers();
  restoreEnvironment();
});
afterAll(() => server.close());

describe("audit BFF route", () => {
  it("requires a session", async () => {
    expect((await GET(request("/api/audit"))).status).toBe(401);
  });

  it.each([
    ["admin", "office-duty-queue", ["M6_ADMIN"]],
    ["auditor", "office-limited-intake", ["M6_AUDITOR"]],
  ] as const)("allows the %s to filter the activity list", async (_label, scenarioId, roles) => {
    let forwardedUrl = "";
    server.use(http.get("https://backend.internal/audit", ({ request: backendRequest }) => {
      forwardedUrl = backendRequest.url;
      return HttpResponse.json(paginatedResponse([auditEntry]));
    }));
    const cookie = integrationMonitorCookie(scenarioId, roles);
    const response = await GET(request(`/api/audit?entityType=CONTAINER&entityId=${auditEntry.entityId}&page=2&pageSize=10`, cookie));

    expect(response.status).toBe(200);
    expect(new URL(forwardedUrl).searchParams.get("entityType")).toBe("CONTAINER");
    expect(new URL(forwardedUrl).searchParams.get("entityId")).toBe(auditEntry.entityId);
    expect(new URL(forwardedUrl).searchParams.get("pageSize")).toBe("10");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects invalid entity filters and denies other roles", async () => {
    const admin = integrationMonitorCookie();
    const invalidType = await GET(request("/api/audit?entityType=UNKNOWN", admin));
    const invalidId = await GET(request("/api/audit?entityId=not-a-uuid", admin));
    const denied = await GET(request("/api/audit", integrationMonitorCookie("field-crew-leader-route", ["M6_CAMPO_CUADRILLA"])));

    expect(invalidType.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(denied.status).toBe(403);
  });

  it("forwards backend validation errors", async () => {
    server.use(http.get("https://backend.internal/audit", () => HttpResponse.json({ statusCode: 400, message: "Filtro inválido", error: "Bad Request", timestamp: "2026-10-28T14:30:00.000Z", path: "/audit" }, { status: 400 })));
    const response = await GET(request("/api/audit", integrationMonitorCookie()));
    expect(response.status).toBe(400);
  });
});
