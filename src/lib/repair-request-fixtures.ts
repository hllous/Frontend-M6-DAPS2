import type { Service } from "./services";
import { environmentalReportFixtures, getEnvironmentalInspectionFixture } from "./environmental-report-fixtures";
import {
  type CreateRepairRequestInput,
  type RepairRequest,
  type RepairRequestQuery,
  type RepairRequestRecoveryInput,
} from "./repair-requests";

const sourceContext = (service: Service) => ({
  type: "SERVICE" as const,
  id: service.id,
  label: service.title,
  href: `/app?destination=services&detail=${encodeURIComponent(service.id)}`,
});

const inspectionSourceContext = (inspectionId: string) => {
  const inspection = getEnvironmentalInspectionFixture(inspectionId);
  const report = inspection
    ? environmentalReportFixtures.find((candidate) => candidate.id === inspection.reportId)
    : null;
  const reportId = report?.id ?? inspection?.reportId ?? inspectionId;

  return {
    type: "INSPECTION" as const,
    id: inspectionId,
    label: report ? `Inspección ${inspectionId} · ${report.id}` : `Inspección ambiental ${inspectionId}`,
    href: `/app?destination=environment&detail=${encodeURIComponent(reportId)}&inspectionId=${encodeURIComponent(inspectionId)}`,
  };
};

export const repairRequestFixtures: RepairRequest[] = [
  {
    id: "RR-1001",
    damageType: "BROKEN_PAVEMENT",
    address: "Bulevar Costero y Calle 12",
    severity: "HIGH",
    publicSafetyRisk: true,
    detectedInType: "SERVICE",
    detectedInId: "SVC-1050",
    sourceContext: {
      type: "SERVICE",
      id: "SVC-1050",
      label: "Barrido mecánico — Bulevar Costero",
      href: "/app?destination=services&detail=SVC-1050",
    },
    status: "REQUESTED",
    workOrderId: null,
    requestedAt: "2026-09-05T10:15:00.000Z",
  },
];

const initialRepairRequestFixtures = repairRequestFixtures.map((request) => ({ ...request, sourceContext: request.sourceContext && { ...request.sourceContext } }));

export function resetRepairRequestFixtures(): void {
  repairRequestFixtures.splice(0, repairRequestFixtures.length, ...initialRepairRequestFixtures.map((request) => ({ ...request, sourceContext: request.sourceContext && { ...request.sourceContext } })));
}

export function getRepairRequestFixture(id: string): RepairRequest | null {
  return repairRequestFixtures.find((request) => request.id === id) ?? null;
}

export function addRepairRequestFixture(request: RepairRequest): void {
  repairRequestFixtures.unshift(request);
}

export function updateRepairRequestFixture(id: string, updates: Partial<RepairRequest>): RepairRequest | null {
  const index = repairRequestFixtures.findIndex((request) => request.id === id);
  if (index === -1) return null;
  const updated = { ...repairRequestFixtures[index], ...updates, updatedAt: new Date().toISOString() };
  repairRequestFixtures[index] = updated;
  return updated;
}

export function createRepairRequestFixture(input: CreateRepairRequestInput, service?: Service): RepairRequest {
  const now = new Date().toISOString();
  return {
    id: `RR-${Date.now()}`,
    damageType: input.damageType,
    address: input.address,
    severity: input.severity,
    publicSafetyRisk: input.publicSafetyRisk,
    detectedInType: input.detectedInType,
    detectedInId: input.detectedInId,
    sourceContext: input.detectedInType === "SERVICE"
      ? service ? sourceContext(service) : undefined
      : inspectionSourceContext(input.detectedInId),
    status: "REQUESTED",
    workOrderId: null,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function filterRepairRequestFixtures(query: RepairRequestQuery): RepairRequest[] {
  return repairRequestFixtures.filter((request) =>
    (!query.status || request.status === query.status) &&
    (!query.damageType || request.damageType === query.damageType) &&
    (!query.severity || request.severity === query.severity) &&
    (!query.detectedInId || request.detectedInId === query.detectedInId),
  );
}

export function paginateRepairRequestFixtures(requests: RepairRequest[], page = 1, pageSize = 20) {
  const data = requests.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
  return {
    data,
    meta: { total: requests.length, page, pageSize, totalPages: Math.max(1, Math.ceil(requests.length / pageSize)) },
  };
}

export function transitionRepairRequestFixture(
  id: string,
  status: "IN_PROGRESS" | "CLOSED",
  input: RepairRequestRecoveryInput,
): RepairRequest | null {
  const current = getRepairRequestFixture(id);
  if (!current) return null;
  return updateRepairRequestFixture(id, {
    status,
    workOrderId: input.workOrderId ?? current.workOrderId ?? null,
  });
}
