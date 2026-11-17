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
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

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
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

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
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

    await startReview(postRequest("start-review", cookie), context);

    const [, init] = backendFetch.mock.calls[0];
    expect(init?.body).toBeUndefined();
  });

  it.each([
    ["no body", undefined, undefined],
    ["an empty object", {}, undefined],
    ["a reason, trimmed", { reason: "  Regularizado por el vecino.  " }, { reason: "Regularizado por el vecino." }],
    ["a reason of exactly 500 characters", { reason: "x".repeat(500) }, { reason: "x".repeat(500) }],
  ] as const)("close with %s sends the exact backend body", async (_label, input, expected) => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ER-1001", status: "CLOSED" }), { status: 201, headers: { "content-type": "application/json" } }),
    );
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

    const response = await close(postRequest("close", cookie, input), context);

    expect(response.status).toBe(201);
    const [, init] = backendFetch.mock.calls[0];
    expect(init?.method).toBe("POST");
    if (expected === undefined) {
      expect(init?.body).toBeUndefined();
      expect(new Headers(init?.headers).get("content-type")).toBeNull();
    } else {
      expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
      expect(init?.body).toBe(JSON.stringify(expected));
    }
  });

  it.each([
    ["a blank reason", { reason: "   " }],
    ["an empty reason", { reason: "" }],
    ["a reason over 500 characters", { reason: "x".repeat(501) }],
    ["a non-string reason", { reason: 5 }],
  ] as const)("close rejects %s with 400 before reaching the backend", async (_label, input) => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

    const response = await close(postRequest("close", cookie, input), context);

    expect(response.status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("close rejects a malformed JSON body with 400", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

    const response = await close(new Request("http://localhost/api/environmental-reports/ER-1001/close", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{" }), context);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "El cuerpo de la solicitud no es un JSON válido." });
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("close in mock mode accepts a reason and still closes", async () => {
    resetEnvironmentalReportFixtures();
    const cookie = await loginAs("office-duty-queue");
    const response = await close(postRequest("close", cookie, { reason: "Archivo." }), { params: Promise.resolve({ id: "ER-1004" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "ER-1004", status: "CLOSED" });
  });

  it("close sends no body to the backend", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "ER-1001", status: "CLOSED" }), { status: 201, headers: { "content-type": "application/json" } }),
    );
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

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
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

    const response = await call(cookie, { message: "  Una foto  ", requiredBy: "2099-11-03", internalNote: "movida" });

    expect(response.status).toBe(200);
    const [url, init] = backendFetch.mock.calls[0];
    expect(url).toEqual(new URL("/environmental-reports/ER-1002/request-information", "https://backend.internal"));
    expect(JSON.parse(String(init?.body))).toEqual({ message: "Una foto", requiredBy: "2099-11-03", internalNote: "movida" });
  });

  it("rejects a missing, blank or oversized message and a malformed date before reaching the backend", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const cookie = await loginAs("office-duty-queue", { mode: "real-m1", accessToken: "header.eyJleHAiOjQxMDAwMDAwMDAsInBhZCI6ImFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIn0.signature" });

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
