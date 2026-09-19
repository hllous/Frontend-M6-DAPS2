import type {
  ServiceFrequency,
  ServiceFrequencyQuery,
  ServiceFrequencyUpdateInput,
} from "./service-frequencies";

const INITIAL_SERVICE_FREQUENCIES: ServiceFrequency[] = [
  {
    id: "freq-1",
    serviceTypeId: "st-waste-route",
    routeId: "route-1",
    weekdays: [1, 3, 5],
    shift: "MORNING",
    validFrom: "2026-09-01",
    validTo: null,
  },
  {
    id: "freq-2",
    serviceTypeId: "st-cleaning-route",
    routeId: "route-2",
    weekdays: [2, 4],
    shift: "NIGHT",
    validFrom: "2026-09-10",
    validTo: null,
  },
  {
    id: "freq-3",
    serviceTypeId: "st-waste-route",
    routeId: "route-4",
    weekdays: [6],
    shift: "AFTERNOON",
    validFrom: "2026-08-01",
    validTo: "2026-08-31",
  },
];

export let serviceFrequencyFixtures: ServiceFrequency[] = structuredClone(INITIAL_SERVICE_FREQUENCIES);

export function resetServiceFrequencyFixtures() {
  serviceFrequencyFixtures = structuredClone(INITIAL_SERVICE_FREQUENCIES);
}

export function filterServiceFrequencyFixtures(query: ServiceFrequencyQuery): ServiceFrequency[] {
  return serviceFrequencyFixtures.filter((item) => {
    if (query.serviceTypeId && item.serviceTypeId !== query.serviceTypeId) return false;
    if (query.routeId && item.routeId !== query.routeId) return false;
    if (query.shift && item.shift !== query.shift) return false;
    if (query.weekday !== undefined && !item.weekdays.includes(query.weekday)) return false;
    if (query.validOn && (item.validFrom > query.validOn || (item.validTo !== null && item.validTo < query.validOn))) return false;
    return true;
  });
}

export function paginateServiceFrequencyFixtures(items: ServiceFrequency[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { total: items.length, page, pageSize, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) },
  };
}

export function addServiceFrequencyFixture(item: ServiceFrequency) {
  serviceFrequencyFixtures.push(item);
}

export function updateServiceFrequencyFixture(id: string, changes: ServiceFrequencyUpdateInput) {
  const item = serviceFrequencyFixtures.find((candidate) => candidate.id === id);
  if (!item) return undefined;
  Object.assign(item, changes);
  if ("validTo" in changes) item.validTo = changes.validTo ?? null;
  return item;
}

export function closeServiceFrequencyFixture(id: string, today = new Date().toISOString().slice(0, 10)) {
  const item = serviceFrequencyFixtures.find((candidate) => candidate.id === id);
  if (!item) return undefined;
  item.validTo = item.validFrom > today ? item.validFrom : today;
  return item;
}
