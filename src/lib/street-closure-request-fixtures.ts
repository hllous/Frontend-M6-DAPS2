import type { Service } from "./services";
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

export function createStreetClosureRequestFixture(
  input: CreateStreetClosureRequestInput,
  service: Service,
): StreetClosureRequest {
  const now = new Date().toISOString();
  return {
    id: `SCR-${Math.floor(1000 + Math.random() * 9000)}`,
    ...input,
    sourceContext: buildStreetClosureSourceContext(service),
    status: "REQUESTED",
    closureId: null,
    createdAt: now,
    updatedAt: now,
  };
}
