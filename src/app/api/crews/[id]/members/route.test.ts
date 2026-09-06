import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { POST } from "./route";
import { DELETE } from "./[userId]/route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function cookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

describe("crew membership BFF route", () => {
  it("lets Office add members without using the crew update resource", async () => {
    const response = await POST(new Request("http://localhost/api/crews/crew-membership/members", {
      method: "POST",
      headers: { cookie: await cookie("office-duty-queue"), "content-type": "application/json" },
      body: JSON.stringify({ memberUserIds: ["user-ana", "user-pedro"] }),
    }), { params: Promise.resolve({ id: "crew-membership" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "crew-membership", memberUserIds: ["user-ana", "user-pedro"] });
  });

  it("lets Office remove one member through the member resource", async () => {
    const response = await DELETE(new Request("http://localhost/api/crews/crew-membership/members/user-pedro", {
      method: "DELETE",
      headers: { cookie: await cookie("office-duty-queue") },
    }), { params: Promise.resolve({ id: "crew-membership", userId: "user-pedro" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "crew-membership", memberUserIds: ["user-ana"] });
  });

  it("keeps membership management Office-only, including for a Field actor's own crew", async () => {
    const request = new Request("http://localhost/api/crews/crew-b/members", {
      method: "POST",
      headers: { cookie: await cookie("field-crew-member-route"), "content-type": "application/json" },
      body: JSON.stringify({ memberUserIds: ["user-pedro"] }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "crew-b" }) });

    expect(response.status).toBe(403);
    expect((await response.json()).message).toMatch(/Oficina/i);
  });
});
