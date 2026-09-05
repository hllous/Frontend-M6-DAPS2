import type { Attachment, Service, ServiceQuery, ZoneResult } from "./services";

const INITIAL_SERVICE_FIXTURES: Service[] = [
  {
    id: "SVC-1042",
    serviceTypeId: "st-waste-route",
    serviceTypeName: "Recolección de residuos",
    title: "Recolección de residuos — Recorrido 4",
    mode: "ROUTE",
    status: "IN_PROGRESS",
    statusReason: null,
    origin: "PLANNED",
    zoneIds: ["zone-1"],
    zoneNames: ["Zona Norte"],
    routeId: "route-4",
    routeName: "Recorrido 4 Norte",
    scheduledDate: "2026-09-05",
    windowFrom: "09:00",
    windowTo: "13:00",
    crewId: "crew-a",
    crewName: "Cuadrilla A · López",
    vehicleId: "veh-101",
    vehiclePlate: "AF 123 CD",
    coordinates: { x: 22, y: 30 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-04 18:40", done: true },
      { label: "Asignado", at: "2026-09-04 19:05", done: true },
      { label: "En curso", at: "2026-09-05 09:02", done: true },
    ],
    notes: "Turno mañana con prioridad en avenidas principales.",
  },
  {
    id: "SVC-1043",
    serviceTypeId: "st-tree-pruning",
    serviceTypeName: "Poda y arbolado",
    title: "Poda de árbol — Av. Rivadavia 2200",
    mode: "POINT",
    status: "SCHEDULED",
    statusReason: null,
    origin: "MANUAL",
    zoneIds: ["zone-1"],
    zoneNames: ["Zona Norte"],
    targetType: "TREE",
    targetId: "tree-884",
    targetRef: "TR-0884",
    scheduledDate: "2026-09-05",
    windowFrom: "14:00",
    windowTo: "17:00",
    crewId: null,
    crewName: null,
    coordinates: { x: 28, y: 22 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 08:00", done: true },
    ],
    notes: "Poda preventiva por cercanía a cables de media tensión.",
  },
  {
    id: "SVC-1044",
    serviceTypeId: "st-container-repair",
    serviceTypeName: "Mantenimiento de contenedores",
    title: "Retiro de contenedor dañado CT-0442",
    mode: "POINT",
    status: "SUSPENDED",
    statusReason: "Acceso bloqueado por obras en calzada",
    origin: "TICKET",
    ticketId: "TK-2026-00451",
    zoneIds: ["zone-1"],
    zoneNames: ["Zona Norte"],
    targetType: "CONTAINER",
    targetId: "cont-0442",
    targetRef: "CT-0442",
    scheduledDate: "2026-09-04",
    windowFrom: "11:00",
    windowTo: "14:00",
    crewId: "crew-a",
    crewName: "Cuadrilla A · López",
    vehicleId: "veh-102",
    vehiclePlate: "AE 456 FG",
    coordinates: { x: 34, y: 34 },
    flag: "conflict",
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-03 10:00", done: true },
      { label: "En curso", at: "2026-09-04 11:05", done: true },
      { label: "Suspendido", at: "2026-09-04 11:40", done: true },
    ],
    notes: "Requiere coordinación con Tránsito para desvío.",
  },
  {
    id: "SVC-1050",
    serviceTypeId: "st-street-cleaning",
    serviceTypeName: "Barrido mecánico",
    title: "Barrido mecánico — Bulevar Costero",
    mode: "ROUTE",
    status: "SCHEDULED",
    statusReason: null,
    origin: "PLANNED",
    zoneIds: ["zone-3", "zone-1"],
    zoneNames: ["Zona Centro", "Zona Norte"],
    routeId: "route-1",
    routeName: "Recorrido 1 Centro",
    scheduledDate: "2026-09-05",
    windowFrom: "08:00",
    windowTo: "12:00",
    crewId: "crew-b",
    crewName: "Cuadrilla B · Fernández",
    vehicleId: "veh-102",
    vehiclePlate: "AE 456 FG",
    coordinates: { x: 50, y: 44 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 06:00", done: true },
      { label: "Asignado", at: "2026-09-05 06:30", done: true },
    ],
    notes: "Turno mañana. Recorrido costero.",
  },
  {
    id: "SVC-1051",
    serviceTypeId: "st-street-cleaning",
    serviceTypeName: "Barrido mecánico",
    title: "Barrido mecánico — Recorrido 1",
    mode: "ROUTE",
    status: "SCHEDULED",
    statusReason: null,
    origin: "PLANNED",
    zoneIds: ["zone-3"],
    zoneNames: ["Zona Centro"],
    routeId: "route-1",
    routeName: "Recorrido 1 Centro",
    scheduledDate: "2026-09-05",
    windowFrom: "11:30",
    windowTo: "15:00",
    crewId: "crew-b",
    crewName: "Cuadrilla B · Fernández",
    vehicleId: "veh-103",
    vehiclePlate: "AG 789 HI",
    coordinates: { x: 52, y: 46 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 07:00", done: true },
      { label: "Asignado", at: "2026-09-05 07:20", done: true },
    ],
  },
  {
    id: "SVC-1055",
    serviceTypeId: "st-street-cleaning",
    serviceTypeName: "Barrido mecánico",
    title: "Barrido mecánico — Bulevar Norte",
    mode: "ROUTE",
    status: "SCHEDULED",
    statusReason: null,
    origin: "PLANNED",
    zoneIds: ["zone-3", "zone-1"],
    zoneNames: ["Zona Centro", "Zona Norte"],
    routeId: "route-1",
    routeName: "Recorrido 1 Centro",
    scheduledDate: "2026-09-05",
    windowFrom: "09:00",
    windowTo: "13:00",
    crewId: "crew-b",
    crewName: "Cuadrilla B · Fernández",
    vehicleId: "veh-103",
    vehiclePlate: "AG 789 HI",
    coordinates: { x: 53, y: 45 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 07:00", done: true },
      { label: "Asignado", at: "2026-09-05 07:30", done: true },
    ],
    notes: "Turno mañana. Recorrido adicional norte.",
  },
  {
    id: "SVC-1052",
    serviceTypeId: "st-green-inspection",
    serviceTypeName: "Inspección ambiental",
    title: "Inspección punto verde — Plaza San Martín",
    mode: "POINT",
    status: "COMPLETED",
    statusReason: null,
    origin: "INSPECTION",
    zoneIds: ["zone-3"],
    zoneNames: ["Zona Centro"],
    targetType: "GREEN_POINT",
    targetId: "gp-002",
    targetRef: "PV-002",
    scheduledDate: "2026-09-05",
    windowFrom: "08:00",
    windowTo: "10:00",
    crewId: "crew-b",
    crewName: "Cuadrilla B · Fernández",
    coordinates: { x: 58, y: 40 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 07:00", done: true },
      { label: "En curso", at: "2026-09-05 08:05", done: true },
      { label: "Completado", at: "2026-09-05 08:45", done: true },
    ],
  },
  {
    id: "SVC-1054",
    serviceTypeId: "st-container-repair",
    serviceTypeName: "Mantenimiento de contenedores",
    title: "Reparación de contenedor CT-0112",
    mode: "POINT",
    status: "SCHEDULED",
    statusReason: null,
    origin: "MANUAL",
    zoneIds: ["zone-3"],
    zoneNames: ["Zona Centro"],
    targetType: "CONTAINER",
    targetId: "cont-0112",
    targetRef: "CT-0112",
    scheduledDate: "2026-09-05",
    windowFrom: "15:30",
    windowTo: "18:00",
    crewId: "crew-b",
    crewName: "Cuadrilla B · Fernández",
    vehicleId: null,
    vehiclePlate: null,
    coordinates: { x: 55, y: 48 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 08:00", done: true },
      { label: "Asignado", at: "2026-09-05 08:30", done: true },
    ],
    notes: "Requiere vehículo operativo para iniciar.",
  },
  {
    id: "SVC-1053",
    serviceTypeId: "st-dump-clearing",
    serviceTypeName: "Limpieza especial",
    title: "Denuncia — acumulación de residuos en microbasural",
    mode: "POINT",
    status: "RESCHEDULED",
    statusReason: "Corte de calle no habilitado por Tránsito",
    origin: "TICKET",
    ticketId: "TK-2026-00389",
    zoneIds: ["zone-3"],
    zoneNames: ["Zona Centro"],
    scheduledDate: "2026-09-05",
    windowFrom: "16:00",
    windowTo: "19:00",
    crewId: "crew-c",
    crewName: "Cuadrilla C · Ibáñez",
    coordinates: { x: 47, y: 55 },
    flag: "delayed",
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 06:30", done: true },
      { label: "A reprogramar", at: "2026-09-05 10:15", done: true },
    ],
  },
  {
    id: "SVC-1061",
    serviceTypeId: "st-waste-route",
    serviceTypeName: "Recolección de residuos",
    title: "Recolección de residuos — Recorrido 7",
    mode: "ROUTE",
    status: "PARTIALLY_COMPLETED",
    statusReason: "Zona 2 inaccesible por rotura de calzada",
    origin: "PLANNED",
    zoneIds: ["zone-2"],
    zoneNames: ["Zona Sur"],
    routeId: "route-7",
    routeName: "Recorrido 7 Sur",
    scheduledDate: "2026-09-05",
    windowFrom: "07:00",
    windowTo: "11:00",
    crewId: "crew-d",
    crewName: "Cuadrilla D · Gómez",
    vehicleId: "veh-104",
    vehiclePlate: "AE 321 ZA",
    coordinates: { x: 40, y: 74 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-04 20:00", done: true },
      { label: "En curso", at: "2026-09-05 07:05", done: true },
      { label: "Parcial", at: "2026-09-05 09:50", done: true },
    ],
  },
  {
    id: "SVC-1062",
    serviceTypeId: "st-tree-pruning",
    serviceTypeName: "Poda y arbolado",
    title: "Poda de árbol — Ribera Sur 88",
    mode: "POINT",
    status: "SCHEDULED",
    statusReason: null,
    origin: "MANUAL",
    zoneIds: ["zone-2"],
    zoneNames: ["Zona Sur"],
    targetType: "TREE",
    targetId: "tree-105",
    targetRef: "TR-0105",
    scheduledDate: "2026-09-06",
    windowFrom: "09:00",
    windowTo: "12:00",
    crewId: null,
    crewName: null,
    coordinates: { x: 46, y: 82 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 10:00", done: true },
    ],
  },
  {
    id: "SVC-1063",
    serviceTypeId: "st-container-survey",
    serviceTypeName: "Relevamiento de contenedores",
    title: "Relevamiento de contenedor — Sector 12",
    mode: "POINT",
    status: "IN_PROGRESS",
    statusReason: null,
    origin: "MANUAL",
    zoneIds: ["zone-2"],
    zoneNames: ["Zona Sur"],
    targetType: "CONTAINER",
    targetId: "cont-0911",
    targetRef: "CT-0911",
    scheduledDate: "2026-09-05",
    windowFrom: "10:00",
    windowTo: "12:30",
    crewId: "crew-d",
    crewName: "Cuadrilla D · Gómez",
    coordinates: { x: 33, y: 68 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 06:00", done: true },
      { label: "En curso", at: "2026-09-05 10:05", done: true },
    ],
  },
  {
    id: "SVC-1071",
    serviceTypeId: "st-street-cleaning",
    serviceTypeName: "Barrido mecánico",
    title: "Barrido mecánico — Costanera",
    mode: "ROUTE",
    status: "CANCELLED",
    statusReason: "Alerta meteorológica naranja por vientos fuertes",
    origin: "WEATHER_ALERT",
    zoneIds: ["zone-1", "zone-2"],
    zoneNames: ["Zona Norte", "Zona Sur"],
    routeId: "route-costa",
    routeName: "Recorrido Costanera",
    scheduledDate: "2026-09-05",
    windowFrom: "06:00",
    windowTo: "09:00",
    crewId: null,
    crewName: null,
    coordinates: { x: 70, y: 60 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-02 12:00", done: true },
      { label: "Cancelado", at: "2026-09-04 18:00", done: true },
    ],
  },
  {
    id: "SVC-1072",
    serviceTypeId: "st-env-inspection",
    serviceTypeName: "Control ambiental",
    title: "Inspección ambiental — Establecimiento Costanera km 3",
    mode: "POINT",
    status: "SCHEDULED",
    statusReason: null,
    origin: "INSPECTION",
    zoneIds: ["zone-2"],
    zoneNames: ["Zona Sur"],
    scheduledDate: "2026-09-05",
    windowFrom: "13:00",
    windowTo: "16:00",
    crewId: "crew-c",
    crewName: "Cuadrilla C · Ibáñez",
    coordinates: { x: 76, y: 50 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 08:30", done: true },
    ],
  },
  {
    id: "SVC-1073",
    serviceTypeId: "st-tree-pruning",
    serviceTypeName: "Poda y arbolado",
    title: "Retiro de ramas caídas por tormenta",
    mode: "POINT",
    status: "COMPLETED",
    statusReason: null,
    origin: "WEATHER_ALERT",
    zoneIds: ["zone-2"],
    zoneNames: ["Zona Sur"],
    scheduledDate: "2026-09-05",
    windowFrom: "07:30",
    windowTo: "09:30",
    crewId: "crew-c",
    crewName: "Cuadrilla C · Ibáñez",
    coordinates: { x: 80, y: 42 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 06:00", done: true },
      { label: "En curso", at: "2026-09-05 07:35", done: true },
      { label: "Completado", at: "2026-09-05 08:15", done: true },
    ],
  },
  {
    id: "SVC-1080",
    serviceTypeId: "st-waste-route",
    serviceTypeName: "Recolección de residuos",
    title: "Recolección de residuos — Recorrido 5",
    mode: "ROUTE",
    status: "SCHEDULED",
    statusReason: null,
    origin: "PLANNED",
    zoneIds: ["zone-1"],
    zoneNames: ["Zona Norte"],
    routeId: "route-3",
    routeName: "Recorrido 3 Norte",
    scheduledDate: "2026-09-05",
    windowFrom: "07:00",
    windowTo: "11:00",
    crewId: "crew-b",
    crewName: "Cuadrilla B · Fernández",
    vehicleId: "veh-105",
    vehiclePlate: "AB 654 LM",
    coordinates: { x: 25, y: 26 },
    flag: null,
    attachments: [],
    history: [
      { label: "Programado", at: "2026-09-05 06:00", done: true },
      { label: "Asignado", at: "2026-09-05 06:20", done: true },
    ],
    notes: "Recorrido de apoyo para casos de suspensión y reprogramación.",
  },
];

export const serviceFixtures: Service[] = [...INITIAL_SERVICE_FIXTURES];

export function addServiceFixture(service: Service): void {
  serviceFixtures.unshift(service);
}

export function updateServiceFixture(id: string, updates: Partial<Service>): Service | null {
  const index = serviceFixtures.findIndex((s) => s.id === id);
  if (index === -1) return null;
  const existing = serviceFixtures[index];
  const updated: Service = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  serviceFixtures[index] = updated;
  return updated;
}

export function resetServiceFixtures(): void {
  serviceFixtures.splice(0, serviceFixtures.length, ...INITIAL_SERVICE_FIXTURES);
  zoneResultFixtures.splice(0, zoneResultFixtures.length, ...INITIAL_ZONE_RESULT_FIXTURES);
  evidenceCache.clear();
}

const INITIAL_ZONE_RESULT_FIXTURES: ZoneResult[] = [
  {
    id: "ZR-1052-1",
    serviceId: "SVC-1052",
    zoneId: "zone-3",
    status: "SERVICED",
    reason: null,
    notes: "Inspección ambiental completada",
    attachments: [],
    recordedAt: "2026-09-05 08:45",
  },
  {
    id: "ZR-1061-1",
    serviceId: "SVC-1061",
    zoneId: "zone-2",
    status: "PARTIAL",
    reason: "BLOCKED_ACCESS",
    notes: "Zona inaccesible por rotura de calzada",
    attachments: [
      {
        id: "att-1061-1",
        url: "/mock/evidence/calzada_bloqueada.jpg",
        filename: "calzada_bloqueada.jpg",
        contentType: "image/jpeg",
        uploadedAt: "2026-09-05 09:48",
      },
    ],
    recordedAt: "2026-09-05 09:50",
  },
];

export const zoneResultFixtures: ZoneResult[] = [...INITIAL_ZONE_RESULT_FIXTURES];

export const evidenceCache = new Map<string, Attachment>();

export function sanitizeFilename(originalName: string, mimeType: string): string {
  const baseName = originalName.replace(/^.*[\\/]/, "");
  const strippedDots = baseName.replace(/^\.+/, "");
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };
  const expectedExt = extMap[mimeType] ?? "";
  const nameWithoutExt = strippedDots.replace(/\.[^/.]+$/, "");
  const cleanName = nameWithoutExt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);

  return `${cleanName || "archivo"}${expectedExt}`;
}

export function addZoneResultFixture(result: ZoneResult): void {
  zoneResultFixtures.push(result);
}

export function addAttachmentToService(serviceId: string, attachment: Attachment): boolean {
  const index = serviceFixtures.findIndex((s) => s.id === serviceId);
  if (index === -1) return false;
  serviceFixtures[index] = {
    ...serviceFixtures[index],
    attachments: [...(serviceFixtures[index].attachments ?? []), attachment],
  };
  return true;
}

export function getZoneResultsByServiceId(serviceId: string): ZoneResult[] {
  return zoneResultFixtures.filter((r) => r.serviceId === serviceId);
}

export function addAttachmentToZoneResult(zoneResultId: string, attachment: Attachment): boolean {
  const index = zoneResultFixtures.findIndex((r) => r.id === zoneResultId);
  if (index === -1) return false;
  zoneResultFixtures[index] = {
    ...zoneResultFixtures[index],
    attachments: [...zoneResultFixtures[index].attachments, attachment],
  };
  return true;
}

export function resetZoneResultFixtures(): void {
  zoneResultFixtures.splice(0, zoneResultFixtures.length, ...INITIAL_ZONE_RESULT_FIXTURES);
  evidenceCache.clear();
}

export const EMPTY_SERVICES_QUERY: ServiceQuery = { search: "zzz-sin-servicios" };

export function filterServiceFixtures(query: ServiceQuery): Service[] {
  return serviceFixtures.filter((service) => {
    if (query.status) {
      if (Array.isArray(query.status)) {
        if (!query.status.includes(service.status)) return false;
      } else if (service.status !== query.status) {
        return false;
      }
    }
    if (query.mode && service.mode !== query.mode) return false;
    if (query.origin && service.origin !== query.origin) return false;
    if (query.zoneId && !service.zoneIds.includes(query.zoneId)) return false;
    if (query.crewId) {
      if (query.crewId === "unassigned") {
        if (service.crewId !== null) return false;
      } else if (service.crewId !== query.crewId) {
        return false;
      }
    }
    if (query.timeFrom && service.windowFrom && service.windowFrom < query.timeFrom) {
      return false;
    }
    if (query.timeTo && service.windowTo && service.windowTo > query.timeTo) {
      return false;
    }
    if (query.scheduledFrom && service.scheduledDate < query.scheduledFrom) {
      return false;
    }
    if (query.scheduledTo && service.scheduledDate > query.scheduledTo) {
      return false;
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      const haystack = [
        service.id,
        service.title,
        service.serviceTypeName,
        service.crewName ?? "sin asignar",
        service.routeName ?? "",
        service.targetRef ?? "",
        ...service.zoneNames,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function paginateServiceFixtures(services: Service[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  const data = services.slice(start, start + pageSize);
  return {
    data,
    meta: {
      total: services.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(services.length / pageSize)),
    },
  };
}
