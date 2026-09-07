import type {
  CreateEnvironmentalReportInput,
  EnvironmentalInspection,
  EnvironmentalInspectionScheduleInput,
  EnvironmentalReport,
  EnvironmentalReportQuery,
  EnvironmentalReportStatus,
} from "./environmental-reports";
import type { Attachment } from "./services";

const reports: EnvironmentalReport[] = [
  { id: "ER-1001", reportType: "ILLEGAL_DUMPSITE", address: "Av. Warnes 1840", lat: -34.598, lng: -58.452, description: "Acumulación de residuos y escombros en la esquina.", status: "RECEIVED", priority: "HIGH", ticketId: null, deadlineAt: null, escalated: false, assignedCrewId: "crew-b", createdAt: "2026-09-06T11:20:00.000Z", updatedAt: "2026-09-06T11:20:00.000Z" },
  { id: "ER-1002", reportType: "NOISE", address: "Av. Corrientes 4200", lat: -34.600, lng: -58.428, description: "Ruido persistente de maquinaria durante la madrugada.", status: "UNDER_REVIEW", priority: "MEDIUM", ticketId: "TK-2026-091", deadlineAt: null, escalated: true, citizenResponse: "El vecino aportó horarios del ruido.", assignedCrewId: null, createdAt: "2026-09-06T09:10:00.000Z", updatedAt: "2026-09-06T10:45:00.000Z" },
  { id: "ER-1003", reportType: "WATER_DISCHARGE", address: "Calle 12 760", lat: -34.588, lng: -58.441, description: "Descarga de líquido hacia el desagüe pluvial.", status: "FORWARDED", priority: "HIGH", ticketId: "TK-2026-084", deadlineAt: null, escalated: false, assignedCrewId: null, createdAt: "2026-09-05T16:00:00.000Z", updatedAt: "2026-09-06T08:30:00.000Z" },
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
];

export let environmentalInspectionFixtures: EnvironmentalInspection[] = inspections.map((inspection) => ({
  ...inspection,
  checklist: inspection.checklist.map((item) => ({ ...item })),
}));
const initialInspections = environmentalInspectionFixtures.map((inspection) => ({
  ...inspection,
  checklist: inspection.checklist.map((item) => ({ ...item })),
}));

export function resetEnvironmentalReportFixtures() {
  environmentalReportFixtures = initialReports.map((report) => ({ ...report }));
  resetEnvironmentalInspectionFixtures();
}

export function resetEnvironmentalInspectionFixtures() {
  environmentalInspectionFixtures = initialInspections.map((inspection) => ({
    ...inspection,
    checklist: inspection.checklist.map((item) => ({ ...item })),
  }));
}

export function getEnvironmentalInspectionFixture(id: string): EnvironmentalInspection | null {
  return environmentalInspectionFixtures.find((inspection) => inspection.id === id) ?? null;
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
