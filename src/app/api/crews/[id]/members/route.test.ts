import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { POST } from "./route";
import { DELETE } from "./[userId]/route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_BACKEND_ORIGIN;
  delete process.env.M6_DEV_JWT;
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

  it("forwards the members to the real backend as { userIds } (AddCrewMembersDto), not memberUserIds (#251)", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    process.env.M6_AUTH_MODE = "backend-development";
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const backendFetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({ id: "crew-membership" }), { status: 200, headers: { "content-type": "application/json" } }));
    const login_ = await login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "office-duty-queue" }),
    }));
    const sessionCookie = login_.headers.get("set-cookie") ?? "";
    backendFetch.mockClear();

    const response = await POST(new Request("http://localhost/api/crews/crew-membership/members", {
      method: "POST",
      headers: { cookie: sessionCookie, "content-type": "application/json" },
      body: JSON.stringify({ memberUserIds: ["user-ana", "user-pedro"] }),
    }), { params: Promise.resolve({ id: "crew-membership" }) });

    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    const [url, init] = backendFetch.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe("/crews/crew-membership/members");
    expect(JSON.parse(String(init.body))).toEqual({ userIds: ["user-ana", "user-pedro"] });
  });

  it("rejects more than 100 members before reaching the backend (#251)", async () => {
    const response = await POST(new Request("http://localhost/api/crews/crew-membership/members", {
      method: "POST",
      headers: { cookie: await cookie("office-duty-queue"), "content-type": "application/json" },
      body: JSON.stringify({ memberUserIds: Array.from({ length: 101 }, (_, index) => `user-${index}`) }),
    }), { params: Promise.resolve({ id: "crew-membership" }) });

    expect(response.status).toBe(400);
  });

  it("lets Office remove one member through the member resource", async () => {
    const response = await DELETE(new Request("http://localhost/api/crews/crew-membership/members/user-pedro", {
      method: "DELETE",
      headers: { cookie: await cookie("office-duty-queue") },
    }), { params: Promise.resolve({ id: "crew-membership", userId: "user-pedro" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "crew-membership", memberUserIds: ["user-ana"] });
  });

  it("renames memberUserIds to the userIds the backend expects (#239)", async () => {
    process.env.M6_AUTH_MODE = "backend-development";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const session = await login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "office-duty-queue" }),
    }));
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 201, headers: { "content-type": "application/json" } }));

    await POST(new Request("http://localhost/api/crews/crew-real/members", {
      method: "POST",
      headers: { cookie: session.headers.get("set-cookie") ?? "", "content-type": "application/json" },
      body: JSON.stringify({ memberUserIds: ["usr-m1-0299"] }),
    }), { params: Promise.resolve({ id: "crew-real" }) });

    const init = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ userIds: ["usr-m1-0299"] });
    delete process.env.M6_DEV_JWT;
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
