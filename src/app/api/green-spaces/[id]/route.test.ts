import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { DELETE, GET, PATCH } from "./route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

const params = Promise.resolve({ id: "green-space-108-2" });

describe("GreenSpace detail BFF route", () => {
  it("returns a GreenSpace detail to authenticated actors", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/green-spaces/green-space-108-2", { headers: { cookie } }), { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "green-space-108-2", name: expect.any(String), active: true });
  });

  it("updates and logically deletes a GreenSpace only for Office", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const update = await PATCH(new Request("http://localhost/api/green-spaces/green-space-108-2", {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "Rambla editada #108" }),
    }), { params });
    expect(update.status).toBe(200);
    expect(await update.json()).toMatchObject({ id: "green-space-108-2", name: "Rambla editada #108" });

    const removal = await DELETE(new Request("http://localhost/api/green-spaces/green-space-108-2", { method: "DELETE", headers: { cookie } }), { params });
    expect(removal.status).toBe(200);
    expect(await removal.json()).toMatchObject({ id: "green-space-108-2", active: false });
  });

  it("rejects Field edits and missing GreenSpaces", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-member-route");
    const forbidden = await PATCH(new Request("http://localhost/api/green-spaces/green-space-108-1", {
      method: "PATCH",
      headers: { cookie: fieldCookie, "content-type": "application/json" },
      body: JSON.stringify({ areaM2: 12 }),
    }), { params: Promise.resolve({ id: "green-space-108-1" }) });
    expect(forbidden.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const missing = await GET(new Request("http://localhost/api/green-spaces/missing", { headers: { cookie: officeCookie } }), { params: Promise.resolve({ id: "missing" }) });
    expect(missing.status).toBe(404);
  });
});
