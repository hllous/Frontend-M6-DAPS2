import type { Vehicle, VehicleQuery } from "./vehicles";

export const vehicleFixtures: Vehicle[] = [
  { id: "vehicle-1", plate: "AA 123 AA", vehicleType: "COMPACTOR_TRUCK", capacity: 16, active: true },
  { id: "vehicle-2", plate: "AB 456 BC", vehicleType: "SWEEPER", capacity: 8, active: true },
  { id: "vehicle-3", plate: "AC 789 CD", vehicleType: "DUMP_TRUCK", capacity: 12, active: false },
  { id: "vehicle-4", plate: "AD 321 DE", vehicleType: "VAN", capacity: 5, active: true },
];

export function filterVehicleFixtures(query: VehicleQuery): Vehicle[] {
  return vehicleFixtures.filter((vehicle) => {
    if (query.active !== undefined && vehicle.active !== query.active) return false;
    if (query.vehicleType && vehicle.vehicleType !== query.vehicleType) return false;
    return true;
  });
}

export function paginateVehicleFixtures(vehicles: Vehicle[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    data: vehicles.slice(start, start + pageSize),
    meta: {
      total: vehicles.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(vehicles.length / pageSize)),
    },
  };
}

export function addVehicleFixture(vehicle: Vehicle) {
  vehicleFixtures.push(vehicle);
}
