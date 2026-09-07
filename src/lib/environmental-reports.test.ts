import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetEnvironmentalReportFixtures } from "./environmental-report-fixtures";
import { EnvironmentalReportContractError, environmentalReportsAdapter } from "./environmental-reports";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetEnvironmentalReportFixtures(); });
afterAll(() => server.close());

describe("environmental reports adapter", () => {
  it("requests the complete queue and preserves the eleven backend statuses", async () => {
    let requestedUrl = "";
    server.use(http.get("*/api/environmental-reports", ({ request }) => {
      requestedUrl = request.url;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } });
    }));
    const page = await environmentalReportsAdapter.list({ page: 1, pageSize: 100 });
    expect(new URL(requestedUrl).searchParams.get("pageSize")).toBe("100");
    expect(page.pageSize).toBe(100);
  });

  it("creates a received own-initiative report and posts operational details", async () => {
    const report = await environmentalReportsAdapter.create({ reportType: "DUMPING", address: "Av. Rivadavia 2200", lat: -34.61, lng: -58.42, description: "Vertido observado junto al cordón." });
    expect(report).toMatchObject({ reportType: "DUMPING", address: "Av. Rivadavia 2200", status: "RECEIVED" });
  });

  it("keeps review transitions explicit and rejects malformed success payloads", async () => {
    expect((await environmentalReportsAdapter.startReview("ER-1001")).status).toBe("UNDER_REVIEW");
    expect((await environmentalReportsAdapter.forward("ER-1001")).status).toBe("FORWARDED");
    expect((await environmentalReportsAdapter.close("ER-1001")).status).toBe("CLOSED");
    server.use(http.get("*/api/environmental-reports/ER-1001", () => HttpResponse.json({ broken: true })));
    await expect(environmentalReportsAdapter.get("ER-1001")).rejects.toBeInstanceOf(EnvironmentalReportContractError);
  });
});
