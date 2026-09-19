import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import {
  addEnvironmentalInspectionFixture,
  getEnvironmentalReportFixture,
  resetEnvironmentalReportFixtures,
} from "@/lib/environmental-report-fixtures";
import type { EnvironmentalInspection } from "@/lib/environmental-reports";
import { GET, POST } from "./route";

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
  addEnvironmentalInspectionFixture({ ...completedViolationInspection, attachments: [...completedViolationInspection.attachments ?? []] });
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  resetEnvironmentalReportFixtures();
});

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

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
    const cookie = await authenticatedCookie("office-duty-queue");
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
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(noticeRequest(cookie, { ...noticeInput, establishmentId: null }), noticeContext);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ establishmentId: null, priorNoticeCount: 0 });
    expect(getEnvironmentalReportFixture("ER-1008")?.status).toBe("CLOSED");

    const read = await GET(new Request("http://localhost/api/environmental-inspections/INS-1008/violation-notice", { headers: { cookie } }), { params: Promise.resolve({ id: "INS-1008" }) });
    expect(read.status).toBe(200);
    expect((await read.json()).establishmentId).toBeNull();
  });

  it("rejects incomplete inspections, missing evidence, and malformed required fields", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
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
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    expect((await POST(noticeRequest(fieldCookie), noticeContext)).status).toBe(403);
    expect((await GET(readNoticeRequest(fieldCookie), { params: Promise.resolve({ id: "INS-1008" }) })).status).toBe(403);

    const limitedCookie = await authenticatedCookie("office-limited-intake");
    expect((await POST(noticeRequest(limitedCookie), noticeContext)).status).toBe(403);
    expect((await GET(readNoticeRequest(limitedCookie), { params: Promise.resolve({ id: "INS-1008" }) })).status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    expect((await POST(noticeRequest(officeCookie), noticeContext)).status).toBe(201);
    const duplicate = await POST(noticeRequest(officeCookie), noticeContext);
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).message).toMatch(/nueva inspección|acta emitida/i);
  });
});
