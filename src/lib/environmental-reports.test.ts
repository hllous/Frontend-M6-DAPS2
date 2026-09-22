import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetEnvironmentalReportFixtures } from "./environmental-report-fixtures";
import { createEnvironmentalReportInputSchema, environmentalInspectionCompleteInputSchema, EnvironmentalReportContractError, environmentalReportSchema, environmentalReportsAdapter, inspectionChecklist } from "./environmental-reports";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetEnvironmentalReportFixtures(); });
afterAll(() => server.close());

describe("environmental reports adapter", () => {
  it("requires the real completion timestamp and the violation next step", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T15:00:00.000Z"));
    const base = {
      inspectedAt: "2026-09-20T14:55:00.000Z",
      outcome: "VIOLATION_FOUND" as const,
      checklist: [{ id: "source", label: "Verificar la fuente", completed: true }],
      findings: "Emisión visible",
      violationType: "AIR_EMISSION" as const,
      severity: "HIGH" as const,
      suggestedAction: "FORMAL_NOTICE" as const,
    };

    expect(environmentalInspectionCompleteInputSchema.safeParse(base).success).toBe(false);
    expect(environmentalInspectionCompleteInputSchema.safeParse({ ...base, nextStep: "NOTICE_TO_BE_ISSUED" }).success).toBe(true);
    expect(environmentalInspectionCompleteInputSchema.safeParse({ ...base, inspectedAt: "2026-09-20T15:05:01.000Z", nextStep: "NOTICE_TO_BE_ISSUED" }).success).toBe(false);
    vi.useRealTimers();
  });

  it("accepts a null priority from the backend", async () => {
    server.use(http.get("*/api/environmental-reports", () => HttpResponse.json({
      data: [{ id: "ER-NULL", reportType: "NOISE", address: null, lat: null, lng: null, ticketId: null, status: "RECEIVED", priority: null, deadlineAt: null, createdAt: "2026-09-20T10:00:00.000Z", updatedAt: "2026-09-20T10:00:00.000Z" }],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    })));

    await expect(environmentalReportsAdapter.list()).resolves.toMatchObject({
      environmentalReports: [{ id: "ER-NULL", priority: null }],
    });
  });

  it("accepts description null from M2 and descriptionless reports in list and detail (#289)", async () => {
    const fromM2 = { id: "ER-M2", reportType: "NOISE", address: "Av. Corrientes 4200", lat: null, lng: null, description: null, publicId: "TK-2026-000123", ticketId: "550e8400-e29b-41d4-a716-446655440123", status: "RECEIVED", priority: null, deadlineAt: null, createdAt: "2026-09-20T10:00:00.000Z", updatedAt: "2026-09-20T10:00:00.000Z" };
    const own = { ...fromM2, id: "ER-OWN", description: "Ruido de maquinaria.", publicId: null, ticketId: null };
    server.use(
      http.get("*/api/environmental-reports", () => HttpResponse.json({ data: [own, fromM2], meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 } })),
      http.get("*/api/environmental-reports/ER-M2", () => HttpResponse.json(fromM2)),
    );

    expect(environmentalReportSchema.safeParse(fromM2).success).toBe(true);
    await expect(environmentalReportsAdapter.list()).resolves.toMatchObject({
      environmentalReports: [{ id: "ER-OWN", description: "Ruido de maquinaria." }, { id: "ER-M2", description: null }],
    });
    await expect(environmentalReportsAdapter.get("ER-M2")).resolves.toMatchObject({ id: "ER-M2", description: null });
  });

  it("caps the new report description at the backend's 2000 characters", () => {
    const input = { reportType: "DUMPING" as const, address: "Av. Rivadavia 2200", lat: -34.61, lng: -58.42 };
    expect(createEnvironmentalReportInputSchema.safeParse({ ...input, description: "a".repeat(2000) }).success).toBe(true);
    expect(createEnvironmentalReportInputSchema.safeParse({ ...input, description: "a".repeat(2001) }).success).toBe(false);
  });

  it("requests the complete queue and preserves the eleven backend statuses", async () => {
    let requestedUrl = "";
    server.use(http.get("*/api/environmental-reports", ({ request }) => {
      requestedUrl = request.url;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } });
    }));
    const page = await environmentalReportsAdapter.list({ page: 1, pageSize: 100, publicId: "TK-2026-000123" });
    expect(new URL(requestedUrl).searchParams.get("pageSize")).toBe("100");
    expect(new URL(requestedUrl).searchParams.get("publicId")).toBe("TK-2026-000123");
    expect(page.pageSize).toBe(100);
    expect(page.sanctionOutcomeIntegrationExceptions).toEqual([]);
  });

  it("creates a received own-initiative report and posts operational details", async () => {
    const report = await environmentalReportsAdapter.create({ reportType: "DUMPING", address: "Av. Rivadavia 2200", lat: -34.61, lng: -58.42, description: "Vertido observado junto al cordón." });
    expect(report).toMatchObject({ reportType: "DUMPING", address: "Av. Rivadavia 2200", status: "RECEIVED" });
  });

  it("accepts a ticket-originated report with null coordinates (M2 contract v1.6, #191)", async () => {
    const report = await environmentalReportsAdapter.get("ER-1002");
    expect(report).toMatchObject({
      id: "ER-1002",
      publicId: "TK-2026-091",
      ticketId: "550e8400-e29b-41d4-a716-446655440091",
      lat: null,
      lng: null,
      address: "Av. Corrientes 4200",
    });

    const page = await environmentalReportsAdapter.list({ publicId: "TK-2026-091" });
    expect(page.environmentalReports).toHaveLength(1);
    expect(page.environmentalReports[0]).toMatchObject({ publicId: "TK-2026-091", lat: null, lng: null });
  });

  it("keeps review transitions explicit and rejects malformed success payloads", async () => {
    expect((await environmentalReportsAdapter.startReview("ER-1001")).status).toBe("UNDER_REVIEW");
    expect((await environmentalReportsAdapter.forward("ER-1001", { reason: "Corresponde a otra dependencia." })).status).toBe("FORWARDED");
    expect((await environmentalReportsAdapter.close("ER-1001")).status).toBe("CLOSED");
    server.use(http.get("*/api/environmental-reports/ER-1001", () => HttpResponse.json({ broken: true })));
    await expect(environmentalReportsAdapter.get("ER-1001")).rejects.toBeInstanceOf(EnvironmentalReportContractError);
  });

  it("sends the required reason as JSON on forward and dismiss, and rejects an empty one before the request", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post("*/api/environmental-reports/ER-1001/forward", async ({ request }) => { bodies.push({ type: request.headers.get("content-type"), body: await request.json() }); return HttpResponse.json({ ...(await environmentalReportsAdapter.get("ER-1001")), status: "FORWARDED" }); }),
      http.post("*/api/environmental-reports/ER-1001/dismiss", async ({ request }) => { bodies.push({ type: request.headers.get("content-type"), body: await request.json() }); return HttpResponse.json({ ...(await environmentalReportsAdapter.get("ER-1001")), status: "DISMISSED" }); }),
    );
    await environmentalReportsAdapter.forward("ER-1001", { reason: "  Otra dependencia  " });
    await environmentalReportsAdapter.dismiss("ER-1001", { reason: "Duplicado" });
    expect(bodies).toEqual([
      { type: "application/json", body: { reason: "Otra dependencia" } },
      { type: "application/json", body: { reason: "Duplicado" } },
    ]);
    await expect(environmentalReportsAdapter.forward("ER-1001", { reason: "   " })).rejects.toBeInstanceOf(EnvironmentalReportContractError);
    await expect(environmentalReportsAdapter.dismiss("ER-1001", { reason: "x".repeat(501) })).rejects.toBeInstanceOf(EnvironmentalReportContractError);
    expect(bodies).toHaveLength(2);
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
      inspectedAt: "2026-09-07T11:55:00.000Z",
      outcome: "NO_VIOLATION",
      checklist: [
        { id: "emission-source", label: "Identificar la fuente de emisión", completed: true },
        { id: "visible-impact", label: "Registrar el impacto visible", completed: true },
      ],
      conclusion: "No se constató infracción durante la visita.",
    });

    expect(requestBody).toEqual({
      inspectedAt: "2026-09-07T11:55:00.000Z",
      outcome: "NO_VIOLATION",
      checklist: [
        { id: "emission-source", label: "Identificar la fuente de emisión", completed: true },
        { id: "visible-impact", label: "Registrar el impacto visible", completed: true },
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

// Respuestas reales del backend (develop, 21/09/2026): GET /environmental-inspections/:id
// de una inspección recién programada y de una cerrada con infracción.
const realCreatedInspection = {
  id: "1e2d05e0-57f3-454d-839f-9b7674e4fe2c",
  reportId: "968ed638-5ac6-441c-85e8-e0fdc2b78dca",
  serviceId: null,
  inspectorId: null,
  inspectedAt: null,
  findings: null,
  outcome: null,
  nextStep: null,
  conclusion: null,
  violationType: null,
  severity: null,
  suggestedAction: null,
  checklistItems: [],
  createdAt: "2026-09-21T19:24:07.649Z",
  updatedAt: "2026-09-21T19:24:07.649Z",
};
const realCompletedInspection = {
  ...realCreatedInspection,
  id: "530bf11c-3e96-4ccd-bc3c-52c329578cda",
  serviceId: "c842e0c1-1b66-4c35-ab6a-c389d5538d19",
  inspectorId: "user-qa246",
  inspectedAt: "2026-09-20T21:34:06.492Z",
  findings: "Acopio de residuos a cielo abierto sobre la vereda.",
  outcome: "VIOLATION_FOUND",
  nextStep: "NOTICE_TO_BE_ISSUED",
  conclusion: "QA-286 conclusión",
  violationType: "ILLEGAL_DUMPING",
  severity: "HIGH",
  suggestedAction: "FINE",
  checklistItems: [{ id: "2cf5e35f-cbd5-4708-b2ba-3b5e0acdb0c2", itemCode: "item-1", label: "Verificación del acopio", result: true, observations: null }],
};

describe("environmental inspection contract (backend InspectionResponseDto)", () => {
  it("reads a real completed inspection with its closing fields and maps checklistItems", async () => {
    server.use(http.get("*/api/environmental-inspections/:id", () => HttpResponse.json(realCompletedInspection)));
    const inspection = await environmentalReportsAdapter.getInspection(realCompletedInspection.id);
    expect(inspection).toMatchObject({ serviceId: realCompletedInspection.serviceId, conclusion: "QA-286 conclusión", violationType: "ILLEGAL_DUMPING", severity: "HIGH", suggestedAction: "FINE" });
    expect(inspectionChecklist(inspection)).toEqual([{ id: "item-1", label: "Verificación del acopio", required: true }]);
  });

  it("gives a freshly scheduled inspection (checklistItems: []) the frontend template", async () => {
    server.use(http.get("*/api/environmental-reports/:id/inspections", () => HttpResponse.json([realCompletedInspection, realCreatedInspection])));
    const inspections = await environmentalReportsAdapter.listInspections(realCompletedInspection.reportId);
    expect(inspections.map((inspection) => inspectionChecklist(inspection).length)).toEqual([1, 3]);
    expect(inspectionChecklist(inspections[1]).map((item) => item.id)).toEqual(["location", "source", "evidence"]);
  });

  it("reads the inspection Field receives, without the internal inspectorId", async () => {
    const { inspectorId: _internal, ...fieldView } = realCreatedInspection;
    server.use(http.get("*/api/environmental-inspections/:id", () => HttpResponse.json(fieldView)));
    await expect(environmentalReportsAdapter.getInspection(realCreatedInspection.id)).resolves.toMatchObject({ id: realCreatedInspection.id });
  });
});
