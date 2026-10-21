import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as dismiss } from "./dismiss/route";
import { POST as forward } from "./forward/route";
import { POST as close } from "./close/route";
import { POST as requestInformation } from "./request-information/route";
import { POST as startReview } from "./start-review/route";
import { resetEnvironmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



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
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });

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
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });

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
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });

    await startReview(postRequest("start-review", cookie), context);

    const [, init] = backendFetch.mock.calls[0];
    expect(init?.body).toBeUndefined();
  });

  it("close sends no body to the backend", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ER-1001", status: "CLOSED" }), { status: 201, headers: { "content-type": "application/json" } }),
    );
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });

    const response = await close(postRequest("close", cookie), context);

    expect(response.status).toBe(201);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    const [url, init] = backendFetch.mock.calls[0];
    expect(url).toEqual(new URL("/environmental-reports/ER-1001/close", "https://backend.internal"));
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });
});

describe("environmental report request-information BFF route", () => {
  const ER_1002 = { params: Promise.resolve({ id: "ER-1002" }) };
  const call = (cookie: string, body?: unknown) => requestInformation(new Request("http://localhost/api/environmental-reports/ER-1002/request-information", {
    method: "POST",
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), ER_1002);

  it("forwards RequestInformationDto JSON to the backend", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "ER-1002", informationRequestPending: true }), { status: 200, headers: { "content-type": "application/json" } }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });

    const response = await call(cookie, { message: "  Una foto  ", requiredBy: "2099-11-03", internalNote: "movida" });

    expect(response.status).toBe(200);
    const [url, init] = backendFetch.mock.calls[0];
    expect(url).toEqual(new URL("/environmental-reports/ER-1002/request-information", "https://backend.internal"));
    expect(JSON.parse(String(init?.body))).toEqual({ message: "Una foto", requiredBy: "2099-11-03", internalNote: "movida" });
  });

  it("rejects a missing, blank or oversized message and a malformed date before reaching the backend", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });

    const statuses = [
      (await call(cookie)).status,
      (await call(cookie, { message: "  " })).status,
      (await call(cookie, { message: "x".repeat(501) })).status,
      (await call(cookie, { message: "ok", requiredBy: "mañana" })).status,
    ];

    expect(statuses).toEqual([400, 400, 400, 400]);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("in mock mode marks the request pending once and answers 409 to a second one", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const first = await call(cookie, { message: "Una foto", requiredBy: "2099-11-03" });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ informationRequestPending: true, informationRequestMessage: "Una foto" });
    expect((await call(cookie, { message: "Otra" })).status).toBe(409);
    resetEnvironmentalReportFixtures();
  });

  it("answers 409 in mock mode when the report is not under review", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await requestInformation(new Request("http://localhost/x", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ message: "Una foto" }) }), context);
    expect(response.status).toBe(409);
  });
});
