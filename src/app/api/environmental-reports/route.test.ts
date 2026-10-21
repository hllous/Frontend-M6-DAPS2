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
