import type { Attachment, ConfirmRelocationInput, Container, ContainerQuery, ReportDamageInput, UpdateContainerInput } from "./containers";

const INITIAL_CONTAINER_FIXTURES: Container[] = [
  {
    id: "cont-1",
    code: "CONT-001",
    containerType: "HOUSEHOLD",
    zoneId: "zone-1",
    address: "Av. Cabildo 2100",
    lat: -34.562,
    lng: -58.456,
    capacityLiters: 1100,
    status: "ACTIVE",
  },
  {
    id: "cont-2",
    code: "CONT-002",
    containerType: "RECYCLABLE",
    zoneId: "zone-2",
    address: "Av. Santa Fe 3400",
    lat: -34.587,
    lng: -58.411,
    capacityLiters: 2400,
    status: "OVERFLOWED",
  },
  {
    id: "cont-3",
    code: "CONT-003",
    containerType: "BULKY",
    zoneId: "zone-3",
    address: "Av. Pueyrredón 1800",
    lat: -34.588,
    lng: -58.397,
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
    zoneId: "zone-4",
    address: "Plaza San Martín",
    lat: -34.595,
    lng: -58.376,
    capacityLiters: 1100,
    status: "UNDER_REPAIR",
  },
  {
    id: "cont-5",
    code: "CONT-005",
    containerType: "HOUSEHOLD",
    zoneId: "zone-1",
    address: "Juramento 2300",
    lat: -34.562,
    lng: -58.452,
    capacityLiters: 1100,
    status: "RELOCATING",
  },
  {
    id: "cont-6",
    code: "CONT-006",
    containerType: "HOUSEHOLD",
    zoneId: "zone-2",
    address: "Honduras 4800",
    lat: -34.587,
    lng: -58.425,
    capacityLiters: 1100,
    status: "REMOVED",
  },
  {
    id: "cont-7",
    code: "CONT-007",
    containerType: "RECYCLABLE",
    zoneId: "zone-3",
    address: "Ayacucho 1500",
    lat: -34.589,
    lng: -58.394,
    capacityLiters: 2400,
    status: "ACTIVE",
  },
  {
    id: "cont-8",
    code: "CONT-008",
    containerType: "HOUSEHOLD",
    zoneId: "zone-4",
    address: "Esmeralda 900",
    lat: -34.598,
    lng: -58.379,
    capacityLiters: 1100,
    status: "ACTIVE",
  },
];

export let containerFixtures: Container[] = INITIAL_CONTAINER_FIXTURES.map((item) => ({ ...item }));
export let containerAttachmentFixtures: Record<string, Attachment[]> = {};

export function resetContainerFixtures() {
  containerFixtures = INITIAL_CONTAINER_FIXTURES.map((item) => ({ ...item }));
  containerAttachmentFixtures = {};
}

export function addAttachmentToContainer(containerId: string, attachment: Attachment) {
  if (!containerAttachmentFixtures[containerId]) {
    containerAttachmentFixtures[containerId] = [];
  }
  containerAttachmentFixtures[containerId].push(attachment);
}

export function getContainerAttachments(containerId: string): Attachment[] {
  return containerAttachmentFixtures[containerId] ?? [];
}

export function reportOverflowFixture(id: string): Container {
  const container = getContainerFixture(id);
  if (!container) {
    throw new Error(`Contenedor ${id} no encontrado.`);
  }
  if (container.status !== "ACTIVE") {
    throw new Error(`INVALID_STATE_TRANSITION: Solo se puede reportar desborde en contenedores activos. Estado actual: ${container.status}`);
  }
  container.status = "OVERFLOWED";
  return container;
}

export function reportDamageFixture(id: string, input: ReportDamageInput): Container {
  const container = getContainerFixture(id);
  if (!container) {
    throw new Error(`Contenedor ${id} no encontrado.`);
  }
  if (container.status !== "ACTIVE") {
    throw new Error(`INVALID_STATE_TRANSITION: Solo se puede reportar daño en contenedores activos. Estado actual: ${container.status}`);
  }
  container.status = "DAMAGED";
  container.damageType = input.damageType;
  container.severity = input.severity;
  container.requiresPublicWorks = input.requiresPublicWorks ?? false;
  return container;
}

export function startRepairFixture(id: string): Container {
  const container = getContainerFixture(id);
  if (!container) {
    throw new Error(`Contenedor ${id} no encontrado.`);
  }
  if (container.status !== "DAMAGED") {
    throw new Error(
      `INVALID_STATE_TRANSITION: Solo se puede iniciar la reparación de contenedores dañados. Estado actual: ${container.status}`,
    );
  }
  container.status = "UNDER_REPAIR";
  return container;
}

export function completeRepairFixture(id: string): Container {
  const container = getContainerFixture(id);
  if (!container) {
    throw new Error(`Contenedor ${id} no encontrado.`);
  }
  if (container.status !== "UNDER_REPAIR") {
    throw new Error(
      `INVALID_STATE_TRANSITION: Solo se puede completar la reparación de contenedores en reparación. Estado actual: ${container.status}`,
    );
  }
  container.status = "ACTIVE";
  return container;
}

export function removeContainerFixture(id: string): Container {
  const container = getContainerFixture(id);
  if (!container) {
    throw new Error(`Contenedor ${id} no encontrado.`);
  }
  if (container.status !== "DAMAGED") {
    throw new Error(
      `INVALID_STATE_TRANSITION: Solo se pueden retirar contenedores dañados. Estado actual: ${container.status}`,
    );
  }
  container.status = "REMOVED";
  return container;
}

export function emptyContainerFixture(id: string): Container {
  const container = getContainerFixture(id);
  if (!container) {
    throw new Error(`Contenedor ${id} no encontrado.`);
  }
  if (container.status !== "OVERFLOWED") {
    throw new Error(`INVALID_STATE_TRANSITION: Solo se puede vaciar un contenedor en estado desbordado. Estado actual: ${container.status}`);
  }
  container.status = "ACTIVE";
  return container;
}

export function startRelocationFixture(id: string): Container {
  const container = getContainerFixture(id);
  if (!container) {
    throw new Error(`Contenedor ${id} no encontrado.`);
  }
  if (container.status !== "ACTIVE") {
    throw new Error(`INVALID_STATE_TRANSITION: Solo se puede iniciar la reubicación en contenedores activos. Estado actual: ${container.status}`);
  }
  container.status = "RELOCATING";
  return container;
}

export function confirmRelocationFixture(id: string, input: ConfirmRelocationInput): Container {
  const container = getContainerFixture(id);
  if (!container) {
    throw new Error(`Contenedor ${id} no encontrado.`);
  }
  if (container.status !== "RELOCATING") {
    throw new Error(`INVALID_STATE_TRANSITION: Solo se puede confirmar la reubicación en contenedores en estado de reubicación. Estado actual: ${container.status}`);
  }
  container.status = "ACTIVE";
  container.address = input.address;
  container.lat = input.lat;
  container.lng = input.lng;
  if (input.zoneId) {
    container.zoneId = input.zoneId;
  }
  return container;
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
