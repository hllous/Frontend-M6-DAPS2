import { afterEach, describe, expect, it, vi } from "vitest";

import { PUBLIC_DEMO_TICKET_ID } from "@/lib/public-report-fixtures";
import { backendEnv, loginAs } from "@/test/session";

import { GET } from "./route";

const unknownTicketId = "11111111-2222-4333-8444-555555555555";
const backendReport = {
  ticketId: unknownTicketId,
  publicId: "TK-2026-000123",
  reportType: "NOISE",
  stage: "INSPECCIONADA",
  stageLabel: "Un inspector ya visitó el lugar y estamos evaluando lo que encontró.",
  address: "Av. Rivadavia 4500",
  openedAt: "2026-10-01T12:00:00.000Z",
  lastUpdateAt: "2026-10-05T12:00:00.000Z",
  inspectedAt: "2026-10-04",
  closed: false,
};

function call(ticketId: string, headers: HeadersInit = {}) {
  return GET(new Request(`http://localhost/api/public/reports/${ticketId}`, { headers }), {
    params: Promise.resolve({ ticketId }),
  });
}

let restoreEnv: (() => void) | undefined;
afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/public/reports/:ticketId", () => {
  it("serves the demo fixture in mock mode, without a session and uncached", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await call(PUBLIC_DEMO_TICKET_ID);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ticketId: PUBLIC_DEMO_TICKET_ID, publicId: "TK-2026-000123" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("answers 404 in mock mode for a code with no fixture", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const response = await call(unknownTicketId);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a ticketId that is not a UUID with 400 and no backend call", async () => {
    restoreEnv = backendEnv();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await call("TK-2026-000123");

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never sends Authorization to the backend, even with a valid staff cookie, and forwards the resident IP", async () => {
    restoreEnv = backendEnv();
    const cookie = await loginAs("office-duty-queue");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(backendReport));

    const response = await call(unknownTicketId, { cookie, authorization: "Bearer staff", "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain(`/public/reports/${unknownTicketId}`);
    const sent = new Headers((init as RequestInit).headers);
    expect(sent.has("authorization")).toBe(false);
    expect(sent.has("cookie")).toBe(false);
    expect(sent.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(await response.json()).toMatchObject({ ticketId: unknownTicketId });
  });

  it("passes the backend 404 through", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ statusCode: 404, message: "No encontrado", error: "Not Found", timestamp: "2026-10-01T00:00:00Z", path: "/public/reports/x" }, { status: 404 }),
    );
    const response = await call(unknownTicketId);
    expect(response.status).toBe(404);
  });

  it("passes a 429 through with its Retry-After", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ statusCode: 429, message: "Demasiadas consultas", error: "Too Many Requests", timestamp: "2026-10-01T00:00:00Z", path: "/public/reports/x" }, { status: 429, headers: { "retry-after": "42" } }),
    );
    const response = await call(unknownTicketId);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 when the backend is unreachable", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    const response = await call(unknownTicketId);
    expect(response.status).toBe(503);
  });
});
