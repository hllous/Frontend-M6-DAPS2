import type { Container, ContainerQuery, UpdateContainerInput } from "./containers";

const INITIAL_CONTAINER_FIXTURES: Container[] = [
  {
    id: "cont-1",
    code: "CONT-001",
    containerType: "HOUSEHOLD",
    zoneId: "zone-1",
    address: "Av. Rivadavia 1200",
    lat: -34.6083,
    lng: -58.3712,
    capacityLiters: 1100,
    status: "ACTIVE",
  },
  {
    id: "cont-2",
    code: "CONT-002",
    containerType: "RECYCLABLE",
    zoneId: "zone-2",
    address: "Av. Santa Fe 3400",
    lat: -34.588,
    lng: -58.411,
    capacityLiters: 2400,
    status: "OVERFLOWED",
  },
  {
    id: "cont-3",
    code: "CONT-003",
    containerType: "BULKY",
    zoneId: "zone-1",
    address: "Av. Montes de Oca 800",
    lat: -34.631,
    lng: -58.378,
    capacityLiters: 3200,
    status: "DAMAGED",
    damageType: "LID_BROKEN",
    severity: "MEDIUM",
    requiresPublicWorks: false,
  },
  {
    id: "cont-4",
    code: "CONT-004",
    containerType: "GREEN",
    zoneId: "zone-2",
    address: "Parque Centenario",
    lat: -34.606,
    lng: -58.435,
    capacityLiters: 1100,
    status: "UNDER_REPAIR",
  },
  {
    id: "cont-5",
    code: "CONT-005",
    containerType: "HOUSEHOLD",
    zoneId: "zone-1",
    address: "Av. Corrientes 4500",
    lat: -34.602,
    lng: -58.428,
    capacityLiters: 1100,
    status: "RELOCATING",
  },
  {
    id: "cont-6",
    code: "CONT-006",
    containerType: "HOUSEHOLD",
    zoneId: "zone-2",
    address: "Alsina 700",
    lat: -34.612,
    lng: -58.376,
    capacityLiters: 1100,
    status: "REMOVED",
  },
];

export let containerFixtures: Container[] = INITIAL_CONTAINER_FIXTURES.map((item) => ({ ...item }));

export function resetContainerFixtures() {
  containerFixtures = INITIAL_CONTAINER_FIXTURES.map((item) => ({ ...item }));
}

export function addContainerFixture(container: Container) {
  containerFixtures.push(container);
}

export function getContainerFixture(id: string): Container | null {
  return containerFixtures.find((c) => c.id === id) ?? null;
}

export function updateContainerFixture(id: string, patch: UpdateContainerInput): Container | null {
  const index = containerFixtures.findIndex((c) => c.id === id);
  if (index === -1) return null;
  const current = containerFixtures[index];
  if (!current) return null;

  // code and containerType are strictly immutable after creation.
  // Status machine transitions never go through update.
  const updated: Container = {
    ...current,
    zoneId: patch.zoneId ?? current.zoneId,
    address: patch.address ?? current.address,
    lat: patch.lat ?? current.lat,
    lng: patch.lng ?? current.lng,
    capacityLiters: patch.capacityLiters ?? current.capacityLiters,
  };
  containerFixtures[index] = updated;
  return updated;
}

export function filterContainerFixtures(query: ContainerQuery): Container[] {
  return containerFixtures.filter((container) => {
    if (query.status && container.status !== query.status) return false;
    if (query.containerType && container.containerType !== query.containerType) return false;
    if (query.zoneId && container.zoneId !== query.zoneId) return false;
    if (query.search) {
      const normalizedSearch = query.search.toLowerCase();
      const matchesCode = container.code.toLowerCase().includes(normalizedSearch);
      const matchesAddress = container.address.toLowerCase().includes(normalizedSearch);
      if (!matchesCode && !matchesAddress) return false;
    }
    return true;
  });
}

export function paginateContainerFixtures(
  items: Container[],
  page = 1,
  pageSize = 10,
): {
  data: Container[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
} {
  const resolvedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const resolvedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / resolvedPageSize));
  const start = (resolvedPage - 1) * resolvedPageSize;
  return {
    data: items.slice(start, start + resolvedPageSize),
    meta: {
      total,
      page: resolvedPage,
      pageSize: resolvedPageSize,
      totalPages,
    },
  };
}
