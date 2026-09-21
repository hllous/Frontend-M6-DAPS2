import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET } from "./route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function backendCookie() {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId: "office-duty-queue" }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

const params = { params: Promise.resolve({ id: "REP-1" }) };
const inspection = { id: "INS-1", reportId: "REP-1", serviceId: null, checklistItems: [] };

describe("/api/environmental-reports/:id/inspections", () => {
  it("adds each inspection's evidence from GET /evidence to the list", async () => {
    const cookie = await backendCookie();
    const attachment = { id: "att-1", url: "https://r2/att-1.jpg", filename: "acta.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-21T10:00:00.000Z" };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const body = String(input).includes("/evidence?ownerType=INSPECTION&ownerId=INS-1") ? [attachment] : [inspection];
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    });

    const response = await GET(new Request("http://localhost/api/environmental-reports/REP-1/inspections", { headers: { cookie } }), params);

    expect(await response.json()).toEqual([{ ...inspection, attachments: [attachment] }]);
  });
});
