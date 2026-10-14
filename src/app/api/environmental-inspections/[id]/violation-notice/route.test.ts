import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addEnvironmentalInspectionFixture,
  getEnvironmentalReportFixture,
  resetEnvironmentalReportFixtures,
} from "@/lib/environmental-report-fixtures";
import type { EnvironmentalInspection } from "@/lib/environmental-reports";
import { resetEstablishmentDirectoryAdapter, setEstablishmentDirectoryAdapter } from "@/lib/establishment-directory";
import { GET, POST } from "./route";
import { createSessionCookie, loginAs } from "@/test/session";

const completedViolationInspection: EnvironmentalInspection = {
  id: "INS-1008",
  reportId: "ER-1008",
  serviceId: null,
  inspectedAt: "2026-09-07T12:00:00.000Z",
  scheduledDate: "2026-09-03",
  timeWindow: { start: "09:00", end: "11:00" },
  checklistVersion: "ambiental-v1",
  checklist: [{ id: "source", label: "Identificar la fuente", required: true }],
  attachments: [{ id: "att-1008", url: "/mock/evidence/acta.jpg", filename: "acta.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-07T11:00:00.000Z" }],
  findings: "Vertido constatado en la vía pública.",
  violationType: "ILLEGAL_DUMPING",
  severity: "HIGH",
  suggestedAction: "FORMAL_NOTICE",
  outcome: "VIOLATION_FOUND",
  nextStep: "NOTICE_TO_BE_ISSUED",
  notes: "Se constató la infracción.",
  createdAt: "2026-09-03T08:00:00.000Z",
  updatedAt: "2026-09-07T12:00:00.000Z",
};

const noticeInput = {
  establishmentId: "EST-BOEDO-1880",
  violationType: "ILLEGAL_DUMPING",
  severity: "HIGH",
  suggestedAction: "FORMAL_NOTICE",
};

beforeEach(() => {
  resetEnvironmentalReportFixtures();
  resetEstablishmentDirectoryAdapter();
  addEnvironmentalInspectionFixture({ ...completedViolationInspection, attachments: [...completedViolationInspection.attachments ?? []] });
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
  resetEnvironmentalReportFixtures();
  resetEstablishmentDirectoryAdapter();
});



function noticeRequest(cookie: string, body: unknown = noticeInput) {
  return new Request("http://localhost/api/environmental-inspections/INS-1008/violation-notice", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function readNoticeRequest(cookie: string) {
  return new Request("http://localhost/api/environmental-inspections/INS-1008/violation-notice", { headers: { cookie } });
}

const noticeContext = { params: Promise.resolve({ id: "INS-1008" }) };

describe("/api/environmental-inspections/:id/violation-notice", () => {
  it("issues a server-owned notice only from a completed violation inspection", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(noticeRequest(cookie), noticeContext);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      inspectionId: "INS-1008",
      establishmentId: "EST-BOEDO-1880",
      violationType: "ILLEGAL_DUMPING",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
      noticeNumber: expect.stringMatching(/^ACTA-/),
      issuedAt: expect.any(String),
      priorNoticeCount: 0,
    });
    expect(getEnvironmentalReportFixture("ER-1008")?.status).toBe("NOTICE_ISSUED");
  });

  it("records a non-forwarded notice and closes the M6 report locally", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(noticeRequest(cookie, { ...noticeInput, establishmentId: null }), noticeContext);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ establishmentId: null, priorNoticeCount: 0 });
    expect(getEnvironmentalReportFixture("ER-1008")?.status).toBe("CLOSED");

    const read = await GET(new Request("http://localhost/api/environmental-inspections/INS-1008/violation-notice", { headers: { cookie } }), { params: Promise.resolve({ id: "INS-1008" }) });
    expect(read.status).toBe(200);
    expect((await read.json()).establishmentId).toBeNull();
  });

  it("rejects an unknown establishment id through the local directory adapter", async () => {
    const resolve = vi.fn(async () => null);
    setEstablishmentDirectoryAdapter({ resolve });
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const establishmentId = "EST-DESCONOCIDO";
    const response = await POST(noticeRequest(cookie, { ...noticeInput, establishmentId }), noticeContext);

    expect(resolve).toHaveBeenCalledWith({ query: establishmentId });
    expect(response.status).toBe(400);
    expect((await response.json()).message).toMatch(/directorio local/i);
    expect(getEnvironmentalReportFixture("ER-1008")?.status).not.toBe("CLOSED");
  });

  it("rejects incomplete inspections, missing evidence, and malformed required fields", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    addEnvironmentalInspectionFixture({ ...completedViolationInspection, id: "INS-NO-EVIDENCE", attachments: [] });

    const noEvidence = await POST(noticeRequest(cookie, noticeInput), { params: Promise.resolve({ id: "INS-NO-EVIDENCE" }) });
    expect(noEvidence.status).toBe(400);
    expect((await noEvidence.json()).message).toMatch(/evidencia/i);

    const malformed = await POST(noticeRequest(cookie, { ...noticeInput, severity: undefined }), noticeContext);
    expect(malformed.status).toBe(400);

    addEnvironmentalInspectionFixture({ ...completedViolationInspection, id: "INS-SCHEDULED", outcome: null, nextStep: null });
    const incomplete = await POST(noticeRequest(cookie, noticeInput), { params: Promise.resolve({ id: "INS-SCHEDULED" }) });
    expect(incomplete.status).toBe(409);
  });

  it("separates the Office issuance role and reports a second notice as 409", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    expect((await POST(noticeRequest(fieldCookie), noticeContext)).status).toBe(403);
    expect((await GET(readNoticeRequest(fieldCookie), { params: Promise.resolve({ id: "INS-1008" }) })).status).toBe(403);

    const limitedCookie = await loginAs("office-limited-intake", { mode: "mock" });
    expect((await POST(noticeRequest(limitedCookie), noticeContext)).status).toBe(403);
    expect((await GET(readNoticeRequest(limitedCookie), { params: Promise.resolve({ id: "INS-1008" }) })).status).toBe(403);

    const officeCookie = await loginAs("office-duty-queue", { mode: "mock" });
    expect((await POST(noticeRequest(officeCookie), noticeContext)).status).toBe(201);
    const duplicate = await POST(noticeRequest(officeCookie), noticeContext);
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).message).toMatch(/nueva inspección|acta emitida/i);
  });

  it("forwards an authorized backend notice lookup with its id and GET method", async () => {
    const id = "inspection_42.3~";
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, noticeNumber: "ACTA-2026-001" }));

    const response = await GET(
      new Request(`http://localhost/api/environmental-inspections/${id}/violation-notice`, { headers: { cookie } }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/environmental-inspections/${id}/violation-notice`);
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });

  it("denies backend notice reads without violationNotice:view before forwarding", async () => {
    const cookie = await loginAs("office-limited-intake", {
      mode: "backend-development",
      devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
      backendOrigin: "https://backend.internal",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch");

    const response = await GET(readNoticeRequest(cookie), noticeContext);

    expect(response.status).toBe(403);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("fails closed when backend mode has no backend origin", async () => {
    const cookie = createSessionCookie("office-duty-queue", {
      mode: "backend-development",
      devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
      backendOrigin: "https://backend.internal",
    });
    delete process.env.M6_BACKEND_ORIGIN;
    const backendFetch = vi.spyOn(globalThis, "fetch");

    const response = await GET(readNoticeRequest(cookie), noticeContext);

    expect(response.status).toBe(503);
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
