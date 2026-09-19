import { afterEach, describe, expect, it } from "vitest";

import {
  addViolationNoticeFixture,
  environmentalInspectionFixtures,
  environmentalReportFixtures,
  getEnvironmentalReportFixture,
  getSanctionOutcomeIntegrationExceptions,
  getSanctionOutcomeFixtures,
  ingestSanctionOutcomeFixture,
  resetEnvironmentalReportFixtures,
} from "./environmental-report-fixtures";
import {
  getEnvironmentalReportClosure,
  ingestSanctionOutcome,
  type SanctionOutcome,
} from "./sanction-outcomes";
import { mergeEnvironmentalReportRead, type ViolationNotice } from "./environmental-reports";

afterEach(() => resetEnvironmentalReportFixtures());

describe("SanctionOutcome read model", () => {
  it("applies a correlated M4 outcome and moves the report to SANCTIONED", () => {
    const report = environmentalReportFixtures.find((item) => item.id === "ER-1008");
    const inspection = environmentalInspectionFixtures.find((item) => item.id === "INS-1008");
    if (!report || !inspection) throw new Error("Expected the violation report fixture");

    const notice: ViolationNotice = {
      id: "NOTICE-1008",
      noticeNumber: "ACTA-2026-1008",
      inspectionId: inspection.id,
      issuedAt: "2026-09-03T17:20:00.000Z",
      establishmentId: "EST-BOEDO-1880",
      violationType: "ILLEGAL_DUMPING",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
      priorNoticeCount: 0,
    };
    const outcome: SanctionOutcome = {
      violationNoticeId: notice.id,
      decision: "FINE_ISSUED",
      decidedAt: "2026-09-08T10:00:00.000Z",
      externalRef: "M4-FINE-1008",
    };

    const result = ingestSanctionOutcome(outcome, {
      reports: [{ ...report, status: "NOTICE_ISSUED" }],
      inspections: [inspection],
      notices: [notice],
      outcomes: [],
    });

    expect(result).toMatchObject({
      disposition: "accepted",
      report: {
        id: report.id,
        status: "SANCTIONED",
        sanctionOutcome: outcome,
      },
    });
  });

  it("classifies a notice with an active deadline as waiting for M4", () => {
    const report = environmentalReportFixtures.find((item) => item.id === "ER-1009");
    if (!report) throw new Error("Expected the deadline report fixture");

    expect(getEnvironmentalReportClosure(report, new Date("2026-09-08T12:00:00.000Z"))).toMatchObject({
      kind: "waiting",
      deadlineAt: "2026-09-10T12:00:00.000Z",
    });
  });

  it("keeps the newer report when a stale read arrives after closure", () => {
    const current = environmentalReportFixtures.find((item) => item.id === "ER-1009");
    if (!current) throw new Error("Expected the deadline report fixture");
    const newer = { ...current, status: "CLOSED" as const, updatedAt: "2026-09-08T12:00:00.000Z" };
    const stale = { ...current, status: "NOTICE_ISSUED" as const, updatedAt: "2026-09-07T12:00:00.000Z" };

    expect(mergeEnvironmentalReportRead(newer, stale)).toEqual(newer);
  });

  it("retains an uncorrelated outcome as an integration exception without a report", () => {
    const outcome: SanctionOutcome = {
      violationNoticeId: "NOTICE-UNKNOWN",
      decision: "CLOSURE_ORDERED",
      decidedAt: "2026-09-08T10:00:00.000Z",
      externalRef: "M4-CLOSURE-UNKNOWN",
    };

    const result = ingestSanctionOutcome(outcome, {
      reports: environmentalReportFixtures,
      inspections: environmentalInspectionFixtures,
      notices: [],
      outcomes: [],
    }, new Date("2026-09-08T12:00:00.000Z"));

    expect(result).toMatchObject({
      disposition: "integration-exception",
      exception: {
        type: "UNCORRELATED_SANCTION_OUTCOME",
        violationNoticeId: "NOTICE-UNKNOWN",
        externalRef: "M4-CLOSURE-UNKNOWN",
      },
    });
  });

  it("ignores a duplicate outcome without replacing the existing read model", () => {
    const report = environmentalReportFixtures.find((item) => item.id === "ER-1008");
    const inspection = environmentalInspectionFixtures.find((item) => item.id === "INS-1008");
    if (!report || !inspection) throw new Error("Expected the violation report fixture");
    const notice: ViolationNotice = {
      id: "NOTICE-1008",
      noticeNumber: "ACTA-2026-1008",
      inspectionId: inspection.id,
      issuedAt: "2026-09-03T17:20:00.000Z",
      establishmentId: "EST-BOEDO-1880",
      violationType: "ILLEGAL_DUMPING",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
      priorNoticeCount: 0,
    };
    const existing: SanctionOutcome = {
      violationNoticeId: notice.id,
      decision: "FINE_ISSUED",
      decidedAt: "2026-09-08T10:00:00.000Z",
      externalRef: "M4-FINE-1008",
    };

    expect(ingestSanctionOutcome({ ...existing }, {
      reports: [{ ...report, status: "SANCTIONED", sanctionOutcome: existing }],
      inspections: [inspection],
      notices: [notice],
      outcomes: [existing],
    })).toMatchObject({ disposition: "ignored", reason: "duplicate" });
  });

  it("accepts a late outcome without reopening a CLOSED report", () => {
    const report = environmentalReportFixtures.find((item) => item.id === "ER-1008");
    const inspection = environmentalInspectionFixtures.find((item) => item.id === "INS-1008");
    if (!report || !inspection) throw new Error("Expected the report and inspection fixtures");
    const notice: ViolationNotice = {
      id: "NOTICE-1009",
      noticeNumber: "ACTA-2026-1009",
      inspectionId: inspection.id,
      issuedAt: "2026-09-03T17:20:00.000Z",
      establishmentId: "EST-BOEDO-1880",
      violationType: "ILLEGAL_DUMPING",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
      priorNoticeCount: 0,
    };
    const outcome: SanctionOutcome = {
      violationNoticeId: notice.id,
      decision: "CLOSURE_ORDERED",
      decidedAt: "2026-09-05T10:00:00.000Z",
      externalRef: "M4-CLOSURE-1009",
    };

    const result = ingestSanctionOutcome(outcome, {
      reports: [{ ...report, status: "CLOSED" }],
      inspections: [inspection],
      notices: [notice],
      outcomes: [],
    });

    expect(result).toMatchObject({
      disposition: "accepted",
      report: { id: report.id, status: "CLOSED", sanctionOutcome: outcome },
    });
  });

  it("distinguishes automatic deadline closure from local closure", () => {
    const noticeReport = environmentalReportFixtures.find((item) => item.id === "ER-1009");
    const localReport = environmentalReportFixtures.find((item) => item.id === "ER-1011");
    if (!noticeReport || !localReport) throw new Error("Expected closure fixtures");

    expect(getEnvironmentalReportClosure({
      ...noticeReport,
      status: "CLOSED",
      deadlineAt: "2026-09-01T12:00:00.000Z",
    }, new Date("2026-09-08T12:00:00.000Z"))).toMatchObject({ kind: "deadline" });
    expect(getEnvironmentalReportClosure(localReport, new Date("2026-09-08T12:00:00.000Z"))).toMatchObject({ kind: "local" });
  });

  it("persists a correlated event in the case-file read model and keeps exceptions separate", () => {
    const report = getEnvironmentalReportFixture("ER-1008");
    const inspection = environmentalInspectionFixtures.find((item) => item.id === "INS-1008");
    if (!report || !inspection) throw new Error("Expected the violation report fixture");
    addViolationNoticeFixture({
      id: "NOTICE-1008",
      noticeNumber: "ACTA-2026-1008",
      inspectionId: inspection.id,
      issuedAt: "2026-09-03T17:20:00.000Z",
      establishmentId: "EST-BOEDO-1880",
      violationType: "ILLEGAL_DUMPING",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
      priorNoticeCount: 0,
    });

    const event: SanctionOutcome = {
      violationNoticeId: "NOTICE-1008",
      decision: "FINE_ISSUED",
      decidedAt: "2026-09-08T10:00:00.000Z",
      externalRef: "M4-FINE-1008",
    };
    expect(ingestSanctionOutcomeFixture(event, new Date("2026-09-08T12:00:00.000Z"))).toMatchObject({ disposition: "accepted" });
    expect(getEnvironmentalReportFixture(report.id)).toMatchObject({ status: "SANCTIONED", sanctionOutcome: event });

    const uncorrelated: SanctionOutcome = { ...event, violationNoticeId: "NOTICE-UNKNOWN", externalRef: "M4-UNKNOWN" };
    expect(ingestSanctionOutcomeFixture(uncorrelated, new Date("2026-09-08T12:00:00.000Z"))).toMatchObject({ disposition: "integration-exception" });
    expect(getSanctionOutcomeIntegrationExceptions()).toHaveLength(1);
    expect(getSanctionOutcomeFixtures()).toHaveLength(2);
    expect(getSanctionOutcomeFixtures().some((item) => item.violationNoticeId === uncorrelated.violationNoticeId)).toBe(false);
  });
});
