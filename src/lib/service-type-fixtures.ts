import type { ServiceType, ServiceTypeQuery } from "./service-types";

const initialServiceTypes: ServiceType[] = [
  { id: "st-waste-route", code: "WASTE-ROUTE", name: "Recolección domiciliaria", category: "WASTE_COLLECTION", mode: "ROUTE", requiresVehicle: true, active: true },
  { id: "st-cleaning-route", code: "CLEAN-ROUTE", name: "Limpieza de calles", category: "STREET_CLEANING", mode: "ROUTE", requiresVehicle: true, active: true },
  { id: "st-container-point", code: "CONT-POINT", name: "Mantenimiento de contenedores", category: "CONTAINERS", mode: "POINT", requiresVehicle: true, active: true },
  // Los ids "st-tree-pruning" y "st-env-inspection" coinciden con SERVICE_TYPE_CATALOG: en modo mock el BFF
  // resuelve el tipo del servicio por ese catálogo, así que el id que devuelve /service-types debe existir allí.
  { id: "st-tree-pruning", code: "ARB-POD", name: "Poda de arbolado", category: "TREES", mode: "POINT", requiresVehicle: false, active: true },
  { id: "st-green-point", code: "GREEN-POINT", name: "Mantenimiento de espacios verdes", category: "GREEN_SPACES", mode: "POINT", requiresVehicle: false, active: false },
  { id: "st-env-inspection", code: "AMB-INSP", name: "Inspección ambiental", category: "ENVIRONMENTAL_CONTROL", mode: "POINT", requiresVehicle: false, active: true },
  // Resto de los tipos que usan los servicios de fixture: el diálogo de asignar cuadrilla lee requiresVehicle
  // de /service-types/:id y, sin el tipo, no deja confirmar (#284).
  { id: "st-street-cleaning", code: "BAR-MEC", name: "Barrido mecánico", category: "STREET_CLEANING", mode: "ROUTE", requiresVehicle: true, active: true },
  { id: "st-container-repair", code: "CONT-REP", name: "Reparación de contenedores", category: "CONTAINERS", mode: "POINT", requiresVehicle: true, active: true },
  { id: "st-container-survey", code: "CONT-SRV", name: "Relevamiento de contenedores", category: "CONTAINERS", mode: "POINT", requiresVehicle: false, active: true },
  { id: "st-dump-clearing", code: "BAS-LIMP", name: "Limpieza de microbasural", category: "STREET_CLEANING", mode: "POINT", requiresVehicle: true, active: true },
  { id: "st-green-inspection", code: "PV-INSP", name: "Inspección de puntos verdes", category: "GREEN_SPACES", mode: "POINT", requiresVehicle: false, active: true },
];

export const serviceTypeFixtures: ServiceType[] = structuredClone(initialServiceTypes);

export function resetServiceTypeFixtures() {
  serviceTypeFixtures.splice(0, serviceTypeFixtures.length, ...structuredClone(initialServiceTypes));
}

export function filterServiceTypeFixtures(query: ServiceTypeQuery): ServiceType[] {
  return serviceTypeFixtures.filter((item) => {
    if (query.active !== undefined && item.active !== query.active) return false;
    if (query.category && item.category !== query.category) return false;
    if (query.mode && item.mode !== query.mode) return false;
    if (query.search) {
      const value = `${item.code} ${item.name}`.toLowerCase();
      if (!value.includes(query.search.toLowerCase())) return false;
    }
    return true;
  });
}

export function paginateServiceTypeFixtures(items: ServiceType[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { total: items.length, page, pageSize, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) },
  };
}

export function addServiceTypeFixture(item: ServiceType) {
  serviceTypeFixtures.push(item);
}

export function updateServiceTypeFixture(id: string, changes: Partial<ServiceType>) {
  const item = serviceTypeFixtures.find((candidate) => candidate.id === id);
  if (!item) return undefined;
  Object.assign(item, changes);
  return item;
}
