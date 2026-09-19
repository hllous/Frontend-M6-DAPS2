import type { Service } from "./services";
import type { TreeIntervention } from "./tree-interventions";
import type {
  StreetClosureRequest,
  StreetClosureRequestQuery,
  CreateStreetClosureRequestInput,
} from "./street-closure-requests";

const INITIAL_STREET_CLOSURE_REQUESTS: StreetClosureRequest[] = [
  {
    id: "SCR-1001",
    reason: "Barrido mecánico sobre corredor costero con circulación operativa.",
    sourceType: "SERVICE",
    sourceId: "SVC-1050",
    sourceModule: "M6",
    closureType: "PARTIAL",
    requestedFrom: "2026-09-05T08:00",
    requestedTo: "2026-09-05T12:00",
    affectedSections: [
      { streetName: "Bulevar Costero", fromCross: "Av. Belgrano", toCross: "Calle 12" },
    ],
    status: "REQUESTED",
    closureId: null,
    sourceContext: {
      sourceType: "SERVICE",
      sourceId: "SVC-1050",
      title: "Barrido mecánico — Bulevar Costero",
      mode: "ROUTE",
      serviceTypeName: "Barrido mecánico",
      scheduledDate: "2026-09-05",
      windowFrom: "08:00",
      windowTo: "12:00",
    },
    createdAt: "2026-09-04T18:00:00.000Z",
    updatedAt: "2026-09-04T18:00:00.000Z",
  },
  {
    id: "SCR-1002",
    reason: "La intervención autorizada requiere ordenar la circulación durante el tratamiento del arbolado.",
    sourceType: "TREE_INTERVENTION",
    sourceId: "intervention-2",
    sourceModule: "M6",
    closureType: "PARTIAL",
    requestedFrom: "2026-09-10T09:00",
    requestedTo: "2026-09-10T11:00",
    affectedSections: [
      { streetName: "Av. Mitre", fromCross: "Calle 10", toCross: "Calle 12" },
    ],
    status: "REQUESTED",
    closureId: null,
    sourceContext: {
      sourceType: "TREE_INTERVENTION",
      sourceId: "intervention-2",
      title: "Tratamiento · Av. Mitre 1140",
      interventionType: "TREATMENT",
      address: "Av. Mitre 1140",
    },
    createdAt: "2026-09-05T08:30:00.000Z",
    updatedAt: "2026-09-05T08:30:00.000Z",
  },
];

export const streetClosureRequestFixtures: StreetClosureRequest[] = structuredClone(
  INITIAL_STREET_CLOSURE_REQUESTS,
);

export function resetStreetClosureRequestFixtures(): void {
  streetClosureRequestFixtures.splice(0, streetClosureRequestFixtures.length);
  streetClosureRequestFixtures.push(...structuredClone(INITIAL_STREET_CLOSURE_REQUESTS));
}

export function getStreetClosureRequestFixture(id: string): StreetClosureRequest | undefined {
  return streetClosureRequestFixtures.find((request) => request.id === id);
}

export function addStreetClosureRequestFixture(request: StreetClosureRequest): void {
  streetClosureRequestFixtures.unshift(request);
}

export function updateStreetClosureRequestFixture(
  id: string,
  changes: Partial<StreetClosureRequest>,
): StreetClosureRequest | undefined {
  const index = streetClosureRequestFixtures.findIndex((request) => request.id === id);
  if (index < 0) return undefined;
  const updated = { ...streetClosureRequestFixtures[index], ...changes };
  streetClosureRequestFixtures[index] = updated;
  return updated;
}

function sourceMatches(request: StreetClosureRequest, sourceId?: string): boolean {
  return !sourceId || request.sourceId === sourceId;
}

export function filterStreetClosureRequestFixtures(
  query: StreetClosureRequestQuery,
): StreetClosureRequest[] {
  return streetClosureRequestFixtures.filter(
    (request) => (!query.status || request.status === query.status) && sourceMatches(request, query.sourceId),
  );
}

export function paginateStreetClosureRequestFixtures(
  requests: StreetClosureRequest[],
  page = 1,
  pageSize = 20,
) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20;
  const total = requests.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const offset = (safePage - 1) * safePageSize;
  return {
    data: requests.slice(offset, offset + safePageSize),
    meta: { total, page: safePage, pageSize: safePageSize, totalPages },
  };
}

export function buildStreetClosureSourceContext(
  service: Service,
): StreetClosureRequest["sourceContext"] {
  return {
    sourceType: "SERVICE",
    sourceId: service.id,
    title: service.title,
    mode: service.mode,
    serviceTypeName: service.serviceTypeName,
    scheduledDate: service.scheduledDate,
    windowFrom: service.windowFrom ?? null,
    windowTo: service.windowTo ?? null,
  };
}

export function buildTreeInterventionStreetClosureSourceContext(
  intervention: TreeIntervention,
): StreetClosureRequest["sourceContext"] {
  const typeLabel: Record<TreeIntervention["interventionType"], string> = {
    FORMATION_PRUNING: "Poda de formación",
    SAFETY_PRUNING: "Poda de seguridad",
    REMOVAL: "Extracción",
    PLANTING: "Plantación",
    TREATMENT: "Tratamiento",
  };
  return {
    sourceType: "TREE_INTERVENTION",
    sourceId: intervention.id,
    title: `${typeLabel[intervention.interventionType]} · ${intervention.address}`,
    interventionType: intervention.interventionType,
    address: intervention.address,
  };
}

export function createStreetClosureRequestFixture(
  input: CreateStreetClosureRequestInput,
  source: Service | TreeIntervention,
): StreetClosureRequest {
  const sourceContext = input.sourceType === "SERVICE"
    ? buildStreetClosureSourceContext(source as Service)
    : buildTreeInterventionStreetClosureSourceContext(source as TreeIntervention);
  const now = new Date().toISOString();
  return {
    id: `SCR-${Math.floor(1000 + Math.random() * 9000)}`,
    ...input,
    sourceContext,
    status: "REQUESTED",
    closureId: null,
    createdAt: now,
    updatedAt: now,
  };
}
