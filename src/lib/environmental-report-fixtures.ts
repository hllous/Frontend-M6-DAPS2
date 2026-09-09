import type {
  CreateEnvironmentalReportInput,
  EnvironmentalInspection,
  EnvironmentalInspectionScheduleInput,
  EnvironmentalReport,
  EnvironmentalReportQuery,
  EnvironmentalReportStatus,
  IssueViolationNoticeInput,
  SanctionOutcome,
  ViolationNotice,
} from "./environmental-reports";
import type { Attachment } from "./services";
import {
  ingestSanctionOutcome,
  type SanctionOutcomeIngestionResult,
  type SanctionOutcomeIntegrationException,
} from "./sanction-outcomes";

const reports: EnvironmentalReport[] = [
  { id: "ER-1001", reportType: "ILLEGAL_DUMPSITE", address: "Av. Warnes 1840", lat: -34.598, lng: -58.452, description: "Acumulación de residuos y escombros en la esquina.", status: "RECEIVED", priority: "HIGH", ticketId: null, deadlineAt: null, escalated: false, assignedCrewId: "crew-b", createdAt: "2026-09-06T11:20:00.000Z", updatedAt: "2026-09-06T11:20:00.000Z" },
  // ticketId present → M2 contract v1.6 (#191): backend always sends lat/lng
  // as explicit null for ticket-originated reports, address is the only location signal.
  { id: "ER-1002", reportType: "NOISE", address: "Av. Corrientes 4200", lat: null, lng: null, description: "Ruido persistente de maquinaria durante la madrugada.", status: "UNDER_REVIEW", priority: "MEDIUM", ticketId: "TK-2026-091", deadlineAt: null, escalated: true, citizenResponse: "El vecino aportó horarios del ruido.", assignedCrewId: null, createdAt: "2026-09-06T09:10:00.000Z", updatedAt: "2026-09-06T10:45:00.000Z" },
  { id: "ER-1003", reportType: "WATER_DISCHARGE", address: "Calle 12 760", lat: null, lng: null, description: "Descarga de líquido hacia el desagüe pluvial.", status: "FORWARDED", priority: "HIGH", ticketId: "TK-2026-084", deadlineAt: null, escalated: false, assignedCrewId: null, createdAt: "2026-09-05T16:00:00.000Z", updatedAt: "2026-09-06T08:30:00.000Z" },
  { id: "ER-1004", reportType: "ODOR", address: "Rondeau 215", lat: -34.616, lng: -58.431, description: "Olor intenso de origen no determinado.", status: "DISMISSED", priority: "LOW", ticketId: null, deadlineAt: null, escalated: false, assignedCrewId: null, createdAt: "2026-09-05T13:00:00.000Z", updatedAt: "2026-09-05T14:20:00.000Z" },
  { id: "ER-1005", reportType: "AIR_EMISSION", address: "Av. La Plata 1120", lat: -34.621, lng: -58.423, description: "Emisión visible desde una chimenea industrial.", status: "INSPECTION_SCHEDULED", priority: "CRITICAL", ticketId: null, deadlineAt: "2026-09-12T12:00:00.000Z", escalated: true, assignedCrewId: null, createdAt: "2026-09-04T10:00:00.000Z", updatedAt: "2026-09-05T09:00:00.000Z" },
  { id: "ER-1006", reportType: "DUMPING", address: "Maza 680", lat: -34.620, lng: -58.418, description: "Vertido de residuos líquidos en la vía pública.", status: "INSPECTED", priority: "HIGH", ticketId: null, deadlineAt: "2026-09-11T12:00:00.000Z", escalated: false, assignedCrewId: null, createdAt: "2026-09-03T12:00:00.000Z", updatedAt: "2026-09-04T15:10:00.000Z" },
  { id: "ER-1007", reportType: "PEST_INFESTATION", address: "Pavón 1400", lat: -34.625, lng: -58.406, description: "Presencia de roedores en un terreno lindero.", status: "NO_VIOLATION", priority: "MEDIUM", ticketId: null, deadlineAt: null, escalated: false, assignedCrewId: null, createdAt: "2026-09-02T11:00:00.000Z", updatedAt: "2026-09-04T12:30:00.000Z" },
  { id: "ER-1008", reportType: "ILLEGAL_DUMPSITE", address: "Av. Boedo 1880", lat: -34.627, lng: -58.419, description: "Microbasural sobre espacio verde.", status: "VIOLATION_FOUND", priority: "HIGH", ticketId: null, deadlineAt: "2026-09-13T12:00:00.000Z", escalated: false, assignedCrewId: null, createdAt: "2026-09-01T15:00:00.000Z", updatedAt: "2026-09-03T17:15:00.000Z" },
  { id: "ER-1009", reportType: "NOISE", address: "Yatay 920", lat: -34.603, lng: -58.418, description: "Actividad comercial por encima de los niveles permitidos.", status: "NOTICE_ISSUED", priority: "MEDIUM", ticketId: null, deadlineAt: "2026-09-10T12:00:00.000Z", escalated: false, assignedCrewId: null, createdAt: "2026-08-31T09:00:00.000Z", updatedAt: "2026-09-02T13:00:00.000Z" },
  { id: "ER-1010", reportType: "WATER_DISCHARGE", address: "Arias 360", lat: -34.555, lng: -58.465, description: "Descarga constatada con sanción comunicada.", status: "SANCTIONED", priority: "CRITICAL", ticketId: null, deadlineAt: null, escalated: false, assignedCrewId: null, createdAt: "2026-08-29T08:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z" },
  { id: "ER-1011", reportType: "OTHER", address: "Gavilán 1550", lat: -34.602, lng: -58.474, description: "Registro cerrado luego de completar el circuito.", status: "CLOSED", priority: "LOW", ticketId: null, deadlineAt: null, escalated: false, assignedCrewId: null, createdAt: "2026-08-28T08:00:00.000Z", updatedAt: "2026-08-31T16:00:00.000Z" },
];

reports.push({ id: "ER-1012", reportType: "AIR_EMISSION", address: "Av. Brasil 2450", lat: -34.636, lng: -58.405, description: "Emisión visible informada en un establecimiento industrial.", status: "INSPECTION_SCHEDULED", priority: "HIGH", ticketId: null, deadlineAt: "2026-09-14T12:00:00.000Z", escalated: false, assignedCrewId: "crew-b", createdAt: "2026-09-06T08:00:00.000Z", updatedAt: "2026-09-06T08:00:00.000Z" });

const initialSanctionOutcome: SanctionOutcome = {
  violationNoticeId: "NOTICE-1010",
  decision: "FINE_ISSUED",
  decidedAt: "2026-09-01T09:30:00.000Z",
  externalRef: "M4-FINE-1010",
};
const sanctionedReport = reports.find((report) => report.id === "ER-1010");
if (sanctionedReport) sanctionedReport.sanctionOutcome = initialSanctionOutcome;

export let environmentalReportFixtures: EnvironmentalReport[] = reports.map((report) => ({ ...report }));
const initialReports = reports.map((report) => ({ ...report }));

const inspections: EnvironmentalInspection[] = [
  {
    id: "INS-1005",
    reportId: "ER-1005",
    serviceId: "SVC-1072",
    inspectedAt: null,
    scheduledDate: "2026-09-05",
    timeWindow: { start: "13:00", end: "16:00" },
    checklistVersion: "ambiental-v1",
    checklist: [
      { id: "emission-source", label: "Identificar la fuente de emisión", required: true },
      { id: "visible-impact", label: "Registrar el impacto visible", required: true },
    ],
    findings: null,
    outcome: null,
    nextStep: null,
    notes: null,
    createdAt: "2026-09-05T08:30:00.000Z",
    updatedAt: "2026-09-05T08:30:00.000Z",
  },
  {
    id: "INS-1012",
    reportId: "ER-1012",
    serviceId: "SVC-1112",
    inspectedAt: null,
    scheduledDate: "2026-09-07",
    timeWindow: { start: "10:00", end: "13:00" },
    checklistVersion: "ambiental-v1",
    checklist: [
      { id: "emission-source-1012", label: "Identificar la fuente de emisión", required: true },
      { id: "visible-impact-1012", label: "Registrar el impacto visible", required: true },
    ],
    attachments: [],
    findings: null,
    outcome: null,
    nextStep: null,
    notes: null,
    createdAt: "2026-09-06T08:30:00.000Z",
    updatedAt: "2026-09-06T08:30:00.000Z",
  },
  {
    id: "INS-1008",
    reportId: "ER-1008",
    serviceId: null,
    inspectedAt: "2026-09-03T17:15:00.000Z",
    scheduledDate: "2026-09-03",
    timeWindow: { start: "09:00", end: "11:00" },
    checklistVersion: "ambiental-v1",
    checklist: [{ id: "source-1008", label: "Identificar la fuente del impacto", required: true }],
    attachments: [{ id: "att-1008", url: "/mock/evidence/acta-1008.jpg", filename: "acta-1008.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-03T17:00:00.000Z" }],
    findings: "Vertido constatado en la vía pública.",
    violationType: "ILLEGAL_DUMPING",
    severity: "HIGH",
    suggestedAction: "FORMAL_NOTICE",
    outcome: "VIOLATION_FOUND",
    nextStep: "NOTICE_TO_BE_ISSUED",
    notes: "Se constató la infracción.",
    createdAt: "2026-09-03T08:00:00.000Z",
    updatedAt: "2026-09-03T17:15:00.000Z",
  },
];

inspections.push({
  id: "INS-1010",
  reportId: "ER-1010",
  serviceId: null,
  inspectedAt: "2026-08-31T17:15:00.000Z",
  scheduledDate: "2026-08-31",
  timeWindow: { start: "09:00", end: "11:00" },
  checklistVersion: "ambiental-v1",
  checklist: [{ id: "source-1010", label: "Identificar la fuente del impacto", required: true }],
  attachments: [{ id: "att-1010", url: "/mock/evidence/acta-1010.jpg", filename: "acta-1010.jpg", contentType: "image/jpeg", uploadedAt: "2026-08-31T17:00:00.000Z" }],
  findings: "Descarga constatada en el establecimiento.",
  violationType: "UNTREATED_DISCHARGE",
  severity: "CRITICAL",
  suggestedAction: "FINE",
  outcome: "VIOLATION_FOUND",
  nextStep: "NOTICE_TO_BE_ISSUED",
  notes: "Se constatÃ³ la infracciÃ³n.",
  createdAt: "2026-08-31T08:00:00.000Z",
  updatedAt: "2026-08-31T17:15:00.000Z",
});

export let environmentalInspectionFixtures: EnvironmentalInspection[] = inspections.map((inspection) => ({
  ...inspection,
  checklist: inspection.checklist.map((item) => ({ ...item })),
  attachments: inspection.attachments?.map((attachment) => ({ ...attachment })),
}));
const initialInspections = environmentalInspectionFixtures.map((inspection) => ({
  ...inspection,
  checklist: inspection.checklist.map((item) => ({ ...item })),
  attachments: inspection.attachments?.map((attachment) => ({ ...attachment })),
}));

const knownSanctionOutcomeNotices: ViolationNotice[] = [
  {
    id: "NOTICE-1010",
    noticeNumber: "ACTA-2026-1010",
    inspectionId: "INS-1010",
    issuedAt: "2026-08-31T17:30:00.000Z",
    establishmentId: "EST-ARIAS-360",
    violationType: "UNTREATED_DISCHARGE",
    severity: "CRITICAL",
    suggestedAction: "FINE",
    priorNoticeCount: 1,
  },
];
export let violationNoticeFixtures: ViolationNotice[] = [];
const initialViolationNotices: ViolationNotice[] = [];

export let sanctionOutcomeFixtures: SanctionOutcome[] = [initialSanctionOutcome];
const initialSanctionOutcomes = sanctionOutcomeFixtures.map((outcome) => ({ ...outcome }));
export let sanctionOutcomeIntegrationExceptions: SanctionOutcomeIntegrationException[] = [];

export function resetEnvironmentalReportFixtures() {
  environmentalReportFixtures = initialReports.map((report) => ({ ...report }));
  resetEnvironmentalInspectionFixtures();
  resetViolationNoticeFixtures();
  resetSanctionOutcomeFixtures();
}

export function resetEnvironmentalInspectionFixtures() {
  environmentalInspectionFixtures = initialInspections.map((inspection) => ({
    ...inspection,
    checklist: inspection.checklist.map((item) => ({ ...item })),
    attachments: inspection.attachments?.map((attachment) => ({ ...attachment })),
  }));
}

export function resetViolationNoticeFixtures() {
  violationNoticeFixtures = initialViolationNotices.map((notice) => ({ ...notice }));
}

export function resetSanctionOutcomeFixtures() {
  sanctionOutcomeFixtures = initialSanctionOutcomes.map((outcome) => ({ ...outcome }));
  sanctionOutcomeIntegrationExceptions = [];
}

export function getSanctionOutcomeFixtures(): SanctionOutcome[] {
  return sanctionOutcomeFixtures.map((outcome) => ({ ...outcome }));
}

export function getSanctionOutcomeIntegrationExceptions(): SanctionOutcomeIntegrationException[] {
  return sanctionOutcomeIntegrationExceptions.map((exception) => ({ ...exception }));
}

export function ingestSanctionOutcomeFixture(outcome: SanctionOutcome, now = new Date()): SanctionOutcomeIngestionResult {
  const result = ingestSanctionOutcome(outcome, {
    reports: environmentalReportFixtures,
    inspections: environmentalInspectionFixtures,
    notices: [...violationNoticeFixtures, ...knownSanctionOutcomeNotices],
    outcomes: sanctionOutcomeFixtures,
  }, now);

  if (result.disposition === "accepted") {
    const index = environmentalReportFixtures.findIndex((report) => report.id === result.report.id);
    if (index !== -1) environmentalReportFixtures[index] = result.report;
    sanctionOutcomeFixtures = [result.outcome, ...sanctionOutcomeFixtures];
  } else if (result.disposition === "integration-exception") {
    sanctionOutcomeIntegrationExceptions = [result.exception, ...sanctionOutcomeIntegrationExceptions];
  }
  return result;
}

export function getEnvironmentalInspectionFixture(id: string): EnvironmentalInspection | null {
  return environmentalInspectionFixtures.find((inspection) => inspection.id === id) ?? null;
}

export function getViolationNoticeFixture(inspectionId: string): ViolationNotice | null {
  return violationNoticeFixtures.find((notice) => notice.inspectionId === inspectionId) ?? null;
}

export function addViolationNoticeFixture(notice: ViolationNotice) {
  violationNoticeFixtures.unshift(notice);
}

export function createViolationNoticeFixture(inspectionId: string, input: IssueViolationNoticeInput): ViolationNotice {
  const now = new Date().toISOString();
  const sequence = String(violationNoticeFixtures.length + 1).padStart(4, "0");
  return {
    id: `NOTICE-${Date.now()}`,
    noticeNumber: `ACTA-${new Date().getFullYear()}-${sequence}`,
    inspectionId,
    issuedAt: now,
    establishmentId: input.establishmentId,
    violationType: input.violationType,
    severity: input.severity,
    suggestedAction: input.suggestedAction,
    priorNoticeCount: input.establishmentId
      ? violationNoticeFixtures.filter((notice) => notice.establishmentId === input.establishmentId).length
      : 0,
  };
}

export function listEnvironmentalInspectionFixtures(reportId: string): EnvironmentalInspection[] {
  return environmentalInspectionFixtures.filter((inspection) => inspection.reportId === reportId);
}

export function updateEnvironmentalInspectionFixture(id: string, updates: Partial<EnvironmentalInspection>): EnvironmentalInspection | null {
  const index = environmentalInspectionFixtures.findIndex((inspection) => inspection.id === id);
  if (index === -1) return null;
  const existing = environmentalInspectionFixtures[index];
  const updated = {
    ...existing,
    ...updates,
    checklist: updates.checklist ?? existing.checklist,
    updatedAt: new Date().toISOString(),
  };
  environmentalInspectionFixtures[index] = updated;
  return updated;
}

export function getInspectionAttachments(inspectionId: string): Attachment[] | null {
  const inspection = getEnvironmentalInspectionFixture(inspectionId);
  return inspection ? [...(inspection.attachments ?? [])] : null;
}

export function addAttachmentToInspection(inspectionId: string, attachment: Attachment): boolean {
  const inspection = getEnvironmentalInspectionFixture(inspectionId);
  if (!inspection) return false;
  updateEnvironmentalInspectionFixture(inspectionId, {
    attachments: [...(inspection.attachments ?? []), attachment],
  });
  return true;
}

export function linkEnvironmentalInspectionService(inspectionId: string, serviceId: string): EnvironmentalInspection | null {
  return updateEnvironmentalInspectionFixture(inspectionId, { serviceId });
}

export function createEnvironmentalInspectionFixture(reportId: string, input: EnvironmentalInspectionScheduleInput): EnvironmentalInspection {
  const now = new Date().toISOString();
  return {
    id: `INS-${Date.now()}`,
    reportId,
    serviceId: null,
    inspectedAt: null,
    scheduledDate: input.scheduledDate,
    timeWindow: { ...input.timeWindow },
    checklistVersion: input.checklistVersion,
    checklist: input.checklist.map((item) => ({ ...item })),
    attachments: [],
    findings: null,
    outcome: null,
    nextStep: null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function addEnvironmentalInspectionFixture(inspection: EnvironmentalInspection) {
  environmentalInspectionFixtures.unshift(inspection);
}

export function getEnvironmentalReportFixture(id: string): EnvironmentalReport | null {
  return environmentalReportFixtures.find((report) => report.id === id) ?? null;
}

export function updateEnvironmentalReportFixture(id: string, updates: Partial<EnvironmentalReport>): EnvironmentalReport | null {
  const index = environmentalReportFixtures.findIndex((report) => report.id === id);
  if (index === -1) return null;
  const updated = { ...environmentalReportFixtures[index], ...updates, updatedAt: new Date().toISOString() };
  environmentalReportFixtures[index] = updated;
  return updated;
}

export function addEnvironmentalReportFixture(report: EnvironmentalReport) {
  environmentalReportFixtures.unshift(report);
}

export function createEnvironmentalReportFixture(input: CreateEnvironmentalReportInput, assignedCrewId?: string): EnvironmentalReport {
  const now = new Date().toISOString();
  return {
    id: `ER-${Date.now()}`,
    ...input,
    status: "RECEIVED",
    priority: "MEDIUM",
    ticketId: null,
    deadlineAt: null,
    escalated: false,
    assignedCrewId: assignedCrewId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function filterEnvironmentalReportFixtures(query: EnvironmentalReportQuery): EnvironmentalReport[] {
  const search = query.search?.trim().toLowerCase();
  return environmentalReportFixtures.filter((report) => {
    if (query.status && report.status !== query.status) return false;
    if (query.reportType && report.reportType !== query.reportType) return false;
    if (query.priority && report.priority !== query.priority) return false;
    if (query.ticketId && report.ticketId !== query.ticketId) return false;
    if (search && ![report.id, report.address ?? "", report.description ?? "", report.ticketId ?? ""].some((value) => value.toLowerCase().includes(search))) return false;
    return true;
  });
}

export function paginateEnvironmentalReportFixtures(items: EnvironmentalReport[], page = 1, pageSize = 100) {
  const resolvedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const resolvedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 100;
  return {
    data: items.slice((resolvedPage - 1) * resolvedPageSize, (resolvedPage - 1) * resolvedPageSize + resolvedPageSize),
    meta: { total: items.length, page: resolvedPage, pageSize: resolvedPageSize, totalPages: Math.max(1, Math.ceil(items.length / resolvedPageSize)) },
  };
}

export function transitionEnvironmentalReportFixture(id: string, status: EnvironmentalReportStatus): EnvironmentalReport | null {
  const report = getEnvironmentalReportFixture(id);
  if (!report) return null;
  report.status = status;
  report.updatedAt = new Date().toISOString();
  return report;
}
