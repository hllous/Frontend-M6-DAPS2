import type { PublicService, PublicServicesPage, PublicZone } from "./public-services";

export const publicZoneFixtures: readonly PublicZone[] = [
  { id: "7b0c4f1e-2d3a-4b5c-8d6e-0a1b2c3d4e5f", code: "Z-CENTRO", name: "Centro" },
  { id: "1c2d3e4f-5a6b-4c7d-9e8f-b1c2d3e4f5a6", code: "Z-NORTE", name: "Norte" },
  { id: "2d3e4f5a-6b7c-4d8e-8f9a-c2d3e4f5a6b7", code: "Z-SUR", name: "Sur" },
  { id: "3e4f5a6b-7c8d-4e9f-9a0b-d3e4f5a6b7c8", code: "Z-OESTE", name: "Oeste" },
];

// Zona vacía a propósito: la demo muestra el estado "sin servicios" eligiendo Oeste.
type Template = Omit<PublicService, "scheduledDate"> & { inDays: number };
const templates: readonly Template[] = [
  { id: "a1000000-0000-4000-8000-000000000001", serviceTypeName: "Recolección domiciliaria", category: "WASTE_COLLECTION", inDays: 0, windowFrom: "06:00", windowTo: "10:00", stage: "EN_CURSO", zones: ["Centro"] },
  { id: "a1000000-0000-4000-8000-000000000002", serviceTypeName: "Barrido y limpieza de calles", category: "STREET_CLEANING", inDays: 0, windowFrom: "14:00", windowTo: "18:00", stage: "PROGRAMADO", zones: ["Centro", "Norte"] },
  { id: "a1000000-0000-4000-8000-000000000003", serviceTypeName: "Recolección domiciliaria", category: "WASTE_COLLECTION", inDays: 2, windowFrom: "06:00", windowTo: "10:00", stage: "PROGRAMADO", zones: ["Centro"] },
  { id: "a1000000-0000-4000-8000-000000000004", serviceTypeName: "Poda de arbolado", category: "TREES", inDays: 5, windowFrom: "08:00", windowTo: "13:00", stage: "REPROGRAMADO", zones: ["Centro"] },
  { id: "a1000000-0000-4000-8000-000000000005", serviceTypeName: "Recolección domiciliaria", category: "WASTE_COLLECTION", inDays: 1, windowFrom: "20:00", windowTo: "23:30", stage: "PROGRAMADO", zones: ["Norte"] },
  { id: "a1000000-0000-4000-8000-000000000006", serviceTypeName: "Lavado de contenedores", category: "CONTAINERS", inDays: 9, windowFrom: null, windowTo: null, stage: "PROGRAMADO", zones: ["Norte", "Sur"] },
  { id: "a1000000-0000-4000-8000-000000000007", serviceTypeName: "Recolección domiciliaria", category: "WASTE_COLLECTION", inDays: 3, windowFrom: "06:00", windowTo: "10:00", stage: "PROGRAMADO", zones: ["Sur"] },
  { id: "a1000000-0000-4000-8000-000000000008", serviceTypeName: "Mantenimiento de espacios verdes", category: "GREEN_SPACES", inDays: 12, windowFrom: "07:00", windowTo: "12:00", stage: "PROGRAMADO", zones: ["Sur"] },
];

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function publicServiceFixtures(today: string): PublicService[] {
  return templates.map(({ inDays, ...service }) => ({ ...service, scheduledDate: `${addDays(today, inDays)}T00:00:00.000Z` }));
}

export type PublicServicesFixtureQuery = { zoneId?: string; from?: string; to?: string; page?: number; pageSize?: number };

/** Mismo criterio que el backend: zona, ventana (por defecto hoy + 30 días) y paginado. */
export function queryPublicServiceFixtures(today: string, query: PublicServicesFixtureQuery): PublicServicesPage {
  const zone = publicZoneFixtures.find((candidate) => candidate.id === query.zoneId);
  const from = query.from ?? today;
  const to = query.to ?? addDays(from, 30);
  const matching = publicServiceFixtures(today).filter((service) => {
    const day = service.scheduledDate.slice(0, 10);
    return (!query.zoneId || (zone && service.zones.includes(zone.name))) && day >= from && day <= to;
  });
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return {
    data: matching.slice((page - 1) * pageSize, page * pageSize),
    meta: { total: matching.length, page, pageSize, totalPages: Math.max(1, Math.ceil(matching.length / pageSize)) },
  };
}
