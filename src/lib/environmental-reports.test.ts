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
    expect(page.sanctionOutcomeIntegrationExceptions).toEqual([]);
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

  it("schedules an inspection with the selected checklist version and snapshot", async () => {
    const inspection = await environmentalReportsAdapter.schedule("ER-1002", {
      scheduledDate: "2026-09-10",
      timeWindow: { start: "09:00", end: "11:00" },
      checklistVersion: "ambiental-v2",
      checklist: [
        { id: "noise-level", label: "Medir nivel sonoro", required: true },
      ],
    });

    expect(inspection).toMatchObject({
      reportId: "ER-1002",
      checklistVersion: "ambiental-v2",
      checklist: [{ id: "noise-level", label: "Medir nivel sonoro", required: true }],
      outcome: null,
    });
  });

  it("completes an inspection with its checklist and outcome details", async () => {
    let requestBody: unknown;
    server.use(http.post("*/api/environmental-inspections/INS-1005/complete", async ({ request }) => {
      requestBody = await request.json();
      return HttpResponse.json({
        id: "INS-1005",
        reportId: "ER-1005",
        serviceId: "SVC-1072",
        inspectedAt: "2026-09-07T12:00:00.000Z",
        scheduledDate: "2026-09-05",
        timeWindow: { start: "13:00", end: "16:00" },
        checklistVersion: "ambiental-v1",
        checklist: [
          { id: "emission-source", label: "Identificar la fuente de emisión", required: true },
          { id: "visible-impact", label: "Registrar el impacto visible", required: true },
        ],
        findings: null,
        outcome: "NO_VIOLATION",
        nextStep: "CASE_CLOSED",
        notes: null,
        createdAt: "2026-09-05T08:30:00.000Z",
        updatedAt: "2026-09-07T12:00:00.000Z",
      });
    }));

    const inspection = await environmentalReportsAdapter.completeInspection("INS-1005", {
      outcome: "NO_VIOLATION",
      checklist: [
        { id: "emission-source", completed: true },
        { id: "visible-impact", completed: true },
      ],
      conclusion: "No se constató infracción durante la visita.",
    });

    expect(requestBody).toEqual({
      outcome: "NO_VIOLATION",
      checklist: [
        { id: "emission-source", completed: true },
        { id: "visible-impact", completed: true },
      ],
      conclusion: "No se constató infracción durante la visita.",
    });
    expect(inspection).toMatchObject({ outcome: "NO_VIOLATION", nextStep: "CASE_CLOSED" });
  });

  it("issues and reads an immutable violation notice through the dedicated inspection endpoints", async () => {
    let requestBody: unknown;
    server.use(
      http.post("*/api/environmental-inspections/INS-1008/violation-notice", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          id: "NOTICE-1008",
          noticeNumber: "ACTA-2026-0008",
          inspectionId: "INS-1008",
          issuedAt: "2026-09-07T15:00:00.000Z",
          establishmentId: "EST-BOEDO-1880",
          violationType: "ILLEGAL_DUMPING",
          severity: "HIGH",
          suggestedAction: "FORMAL_NOTICE",
          priorNoticeCount: 2,
        }, { status: 201 });
      }),
      http.get("*/api/environmental-inspections/INS-1008/violation-notice", () => HttpResponse.json({
        id: "NOTICE-1008",
        noticeNumber: "ACTA-2026-0008",
        inspectionId: "INS-1008",
        issuedAt: "2026-09-07T15:00:00.000Z",
        establishmentId: "EST-BOEDO-1880",
        violationType: "ILLEGAL_DUMPING",
        severity: "HIGH",
        suggestedAction: "FORMAL_NOTICE",
        priorNoticeCount: 2,
      })),
    );

    const input = {
      establishmentId: "EST-BOEDO-1880",
      violationType: "ILLEGAL_DUMPING" as const,
      severity: "HIGH" as const,
      suggestedAction: "FORMAL_NOTICE" as const,
    };
    const issued = await environmentalReportsAdapter.issueViolationNotice("INS-1008", input);
    const read = await environmentalReportsAdapter.getViolationNotice("INS-1008");

    expect(requestBody).toEqual(input);
    expect(issued).toMatchObject({ noticeNumber: "ACTA-2026-0008", priorNoticeCount: 2 });
    expect(read).toMatchObject({ inspectionId: "INS-1008", establishmentId: "EST-BOEDO-1880" });
  });

  it("preserves a 409 as a request conflict and rejects an empty establishment identifier", async () => {
    server.use(http.post("*/api/environmental-inspections/INS-1008/violation-notice", () => HttpResponse.json({
      statusCode: 409,
      message: "La inspección ya tiene un acta emitida.",
      error: "Conflict",
      timestamp: new Date().toISOString(),
      path: "/api/environmental-inspections/INS-1008/violation-notice",
    }, { status: 409 })));

    await expect(environmentalReportsAdapter.issueViolationNotice("INS-1008", {
      establishmentId: "",
      violationType: "ILLEGAL_DUMPING",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
    })).rejects.toBeInstanceOf(EnvironmentalReportContractError);

    await expect(environmentalReportsAdapter.issueViolationNotice("INS-1008", {
      establishmentId: "EST-BOEDO-1880",
      violationType: "ILLEGAL_DUMPING",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
    })).rejects.toMatchObject({ status: 409 });
  });
});
