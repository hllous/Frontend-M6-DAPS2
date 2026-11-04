import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getCrews } from "@/app/api/crews/route";
import { GET as getServices } from "@/app/api/public/services/route";
import { backendEnv, loginAs } from "@/test/session";

import { fetchPublicBackend } from "./public-bff";

const KEY = "test-placeholder-key-0123456789abcdef-xyz";
const BACKEND_PAGE = { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };
const publicRequest = () => new Request("http://localhost/api/public/services", { headers: { "x-forwarded-for": "203.0.113.7" } });

let restoreEnv: (() => void) | undefined;
afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function sentHeaders(spy: ReturnType<typeof vi.spyOn>): Headers {
  return new Headers((spy.mock.calls[0]?.[1] as RequestInit).headers);
}

describe("fetchPublicBackend BFF_SHARED_KEY", () => {
  it("sends x-m6-bff-key (trimmed) with the resident IP when the variable is set", async () => {
    restoreEnv = backendEnv();
    vi.stubEnv("BFF_SHARED_KEY", `  ${KEY}\n`);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(BACKEND_PAGE));

    await fetchPublicBackend(publicRequest(), "/public/services");

    const headers = sentHeaders(fetchSpy);
    expect(headers.get("x-m6-bff-key")).toBe(KEY);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it.each([undefined, "", "   "])("sends nothing when the variable is %j", async (value) => {
    restoreEnv = backendEnv();
    if (value === undefined) vi.stubEnv("BFF_SHARED_KEY", undefined as unknown as string);
    else vi.stubEnv("BFF_SHARED_KEY", value);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(BACKEND_PAGE));

    await fetchPublicBackend(publicRequest(), "/public/services");

    expect(sentHeaders(fetchSpy).has("x-m6-bff-key")).toBe(false);
  });

  it("does not leak the key in the public response nor in logs", async () => {
    restoreEnv = backendEnv();
    vi.stubEnv("BFF_SHARED_KEY", KEY);
    const logs = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
    const responses = [
      Response.json(BACKEND_PAGE),
      Response.json({ message: "boom" }, { status: 500 }),
      Response.json({}, { status: 429, headers: { "retry-after": "5" } }),
    ];
    const bodies: string[] = [];
    for (const upstream of responses) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(upstream);
      const response = await getServices(publicRequest());
      bodies.push(JSON.stringify([...response.headers.entries()]), await response.text());
    }
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"));
    const down = await getServices(publicRequest());
    bodies.push(JSON.stringify([...down.headers.entries()]), await down.text());

    for (const text of [...bodies, ...logs.map((l) => JSON.stringify(l.mock.calls))]) expect(text).not.toContain(KEY);
  });

  it("never sends the key on authenticated routes", async () => {
    restoreEnv = backendEnv();
    vi.stubEnv("BFF_SHARED_KEY", KEY);
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature", backendOrigin: "https://backend.internal" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [] }));

    await getCrews(new Request("http://localhost/api/crews", { headers: { cookie } }));

    const headers = sentHeaders(fetchSpy);
    expect(headers.get("authorization")).toMatch(/^Bearer /);
    expect(headers.has("x-m6-bff-key")).toBe(false);
    expect(JSON.stringify([...headers.entries()])).not.toContain(KEY);
  });
});
