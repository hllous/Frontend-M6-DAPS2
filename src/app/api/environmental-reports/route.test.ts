import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { backendEnv, createSessionCookie } from "@/test/session";

let restoreEnv: (() => void) | undefined;
afterEach(() => { restoreEnv?.(); vi.restoreAllMocks(); });

describe("environmental report date range BFF forwarding", () => {
  it.each(["office-duty-queue", "field-crew-leader-route"] as const)("forwards from/to unchanged for %s", async (scenario) => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie(scenario, { mode: "backend-development", crew: { id: "crew-b", name: "Cuadrilla B" } });
    const backend = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 },
    }));
    const response = await GET(new Request("http://localhost/api/environmental-reports?from=2026-09-05&to=2026-09-06", { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect(backend).toHaveBeenCalled();
    const query = new URL(String(backend.mock.calls[0][0])).searchParams;
    expect(query.get("from")).toBe("2026-09-05");
    expect(query.get("to")).toBe("2026-09-06");
  });
});

describe("environmental report status BFF forwarding", () => {
  it("forwards several statuses as repeated query parameters", async () => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    const backend = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 },
    }));

    const response = await GET(new Request("http://localhost/api/environmental-reports?status=RECEIVED&status=UNDER_REVIEW&reportType=NOISE&priority=HIGH&from=2026-09-04&to=2026-09-05&search=ruido&page=2&pageSize=12", { headers: { cookie } }));

    expect(response.status).toBe(200);
    const query = new URL(String(backend.mock.calls[0][0])).searchParams;
    expect(query.getAll("status")).toEqual(["RECEIVED", "UNDER_REVIEW"]);
    expect(query.toString()).not.toContain("status=RECEIVED%2CUNDER_REVIEW");
    expect(query.get("reportType")).toBe("NOISE");
    expect(query.get("priority")).toBe("HIGH");
    expect(query.get("from")).toBe("2026-09-04");
    expect(query.get("to")).toBe("2026-09-05");
    expect(query.get("search")).toBe("ruido");
    expect(query.get("page")).toBe("2");
    expect(query.get("pageSize")).toBe("12");
  });

  it("rejects a status outside the report status enum", async () => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    const backend = vi.spyOn(globalThis, "fetch");

    const response = await GET(new Request("http://localhost/api/environmental-reports?status=NOT_A_STATUS", { headers: { cookie } }));

    expect(response.status).toBe(400);
    expect(backend).not.toHaveBeenCalled();
  });

  it("keeps Backend pagination defaults when the client omits page parameters", async () => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    const backend = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 1 },
    }));

    const response = await GET(new Request("http://localhost/api/environmental-reports?status=RECEIVED&priority=HIGH", { headers: { cookie } }));

    expect(response.status).toBe(200);
    const query = new URL(String(backend.mock.calls[0][0])).searchParams;
    expect(query.getAll("status")).toEqual(["RECEIVED"]);
    expect(query.get("priority")).toBe("HIGH");
    expect(query.has("page")).toBe(false);
    expect(query.has("pageSize")).toBe(false);
  });
});
