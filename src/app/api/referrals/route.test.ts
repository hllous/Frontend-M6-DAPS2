import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { GET } from "./route";
import { createSessionCookie, loginAs } from "@/test/session";

beforeEach(() => {
  process.env.M6_AUTH_MODE = "mock";
  resetRepairRequestFixtures();
  resetStreetClosureRequestFixtures();
  resetServiceFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("referral workspace BFF", () => {
  it("returns both referral kinds to Office", async () => {
    const cookie = await loginAs("office-duty-queue");
    const response = await GET(new Request("http://localhost/api/referrals", { headers: { cookie } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "REPAIR_REQUEST", destination: "M3", id: "RR-1001" }),
      expect.objectContaining({ kind: "STREET_CLOSURE_REQUEST", destination: "M7", id: "SCR-1001" }),
    ]));
  });

  it("returns only referrals attached to the Field crew's Services", async () => {
    const cookie = await loginAs("field-crew-leader-route");
    const response = await GET(new Request("http://localhost/api/referrals", { headers: { cookie } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.every((referral: { sourceServiceId: string }) => ["SVC-1050", "SVC-1051", "SVC-1055", "SVC-1052", "SVC-1054", "SVC-1094", "SVC-1095", "SVC-1096", "SVC-1097", "SVC-1080"].includes(referral.sourceServiceId))).toBe(true);
  });

  it("forwards backend referral collections with GET and the session bearer token", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", {
      mode: "backend-development",
      devJwt,
      backendOrigin: "https://backend.internal",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({
      data: [],
      meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 },
    }));

    const response = await GET(new Request("http://localhost/api/referrals", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(backendFetch.mock.calls.map(([url, init]) => [String(url), init?.method ?? "GET"])).toEqual(expect.arrayContaining([
      ["https://backend.internal/repair-requests?page=1&pageSize=100", "GET"],
      ["https://backend.internal/street-closure-requests?page=1&pageSize=100", "GET"],
    ]));
    expect(backendFetch.mock.calls).toHaveLength(2);
    expect(backendFetch.mock.calls.every(([, init]) =>
      new Headers(init?.headers).get("authorization") === `Bearer ${devJwt}`,
    )).toBe(true);
  });

  it("fails closed when backend referral mode has no backend origin", async () => {
    const cookie = createSessionCookie("office-duty-queue", {
      mode: "backend-development",
      devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
      backendOrigin: "https://backend.internal",
    });
    delete process.env.M6_BACKEND_ORIGIN;
    const backendFetch = vi.spyOn(globalThis, "fetch");

    const response = await GET(new Request("http://localhost/api/referrals", { headers: { cookie } }));

    expect(response.status).toBe(503);
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
