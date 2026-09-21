import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { POST as dismiss } from "./dismiss/route";
import { POST as forward } from "./forward/route";
import { POST as startReview } from "./start-review/route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  if (mode === "backend-development") process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId: "office-duty-queue" }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

const context = { params: Promise.resolve({ id: "ER-1001" }) };

function postRequest(action: string, cookie: string, body?: unknown) {
  return new Request(`http://localhost/api/environmental-reports/ER-1001/${action}`, {
    method: "POST",
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("environmental report forward and dismiss BFF routes", () => {
  it.each([
    ["forward", forward, { reason: "Corresponde a otra dependencia." }],
    ["dismiss", dismiss, { reason: "Duplicado del expediente anterior." }],
  ] as const)("%s forwards the reason as ReportStatusChangeDto JSON to the backend", async (action, handler, body) => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ER-1001", status: "FORWARDED" }), { status: 201, headers: { "content-type": "application/json" } }),
    );
    const cookie = await authenticatedCookie("backend-development");

    const response = await handler(postRequest(action, cookie, { reason: `  ${body.reason}  ` }), context);

    expect(response.status).toBe(201);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    const [url, init] = backendFetch.mock.calls[0];
    expect(url).toEqual(new URL(`/environmental-reports/ER-1001/${action}`, "https://backend.internal"));
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual(body);
  });

  it.each([
    ["forward", forward],
    ["dismiss", dismiss],
  ] as const)("%s rejects a missing or blank reason before reaching the backend", async (action, handler) => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const cookie = await authenticatedCookie("backend-development");

    const missing = await handler(postRequest(action, cookie), context);
    const blank = await handler(postRequest(action, cookie, { reason: "   " }), context);
    const tooLong = await handler(postRequest(action, cookie, { reason: "x".repeat(501) }), context);

    expect([missing.status, blank.status, tooLong.status]).toEqual([400, 400, 400]);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("start-review still sends no body to the backend", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ER-1001", status: "UNDER_REVIEW" }), { status: 201, headers: { "content-type": "application/json" } }),
    );
    const cookie = await authenticatedCookie("backend-development");

    await startReview(postRequest("start-review", cookie), context);

    const [, init] = backendFetch.mock.calls[0];
    expect(init?.body).toBeUndefined();
  });
});
