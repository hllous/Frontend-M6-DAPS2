// @ts-nocheck
import type { NextResponse } from "next/server";

import { errorResponse } from "./bff-route";
import { serviceFixtures } from "./services-fixtures";
import type { Service } from "./services";

/** Servicio del modo mock por id, o el 404 de Problem Details que usan los Route Handlers de `/services/[id]`. */
export function findServiceFixture(serviceId: string, path: string): Service | NextResponse {
  const service = serviceFixtures.find((candidate) => candidate.id === serviceId);
  return service ?? errorResponse(404, `Servicio ${serviceId} no encontrado.`, path);
}

/** Entrada de historial de estado (`yyyy-mm-dd hh:mm`, hecha) que los handlers mock agregan al cambiar un Servicio. */
export function serviceHistoryEntry(label: string): Service["history"][number] {
  return {
    label,
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    done: true,
  };
}
