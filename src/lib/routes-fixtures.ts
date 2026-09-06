import type { Route, RouteQuery, RouteReferenceReport } from "./routes";

const INITIAL_ROUTE_FIXTURES: Route[] = [
  {
    id: "route-1",
    code: "REC-001",
    name: "Recorrido Casco Histórico",
    active: true,
    stops: [
      {
        id: "stop-1",
        routeId: "route-1",
        sequence: 1,
        zoneId: "zone-1",
        estimatedDurationMin: 45,
        zone: { id: "zone-1", code: "Z-01", name: "Zona Norte" },
      },
      {
        id: "stop-2",
        routeId: "route-1",
        sequence: 2,
        zoneId: "zone-2",
        estimatedDurationMin: 60,
        zone: { id: "zone-2", code: "Z-02", name: "Zona Sur" },
      },
    ],
  },
  {
    id: "route-2",
    code: "REC-002",
    name: "Recorrido Costanera",
    active: true,
    stops: [
      {
        id: "stop-3",
        routeId: "route-2",
        sequence: 1,
        zoneId: "zone-2",
        estimatedDurationMin: 30,
        zone: { id: "zone-2", code: "Z-02", name: "Zona Sur" },
      },
    ],
  },
  {
    id: "route-3",
    code: "REC-003",
    name: "Recorrido Sin Frecuencia",
    active: false,
    stops: [],
  },
];

export let routeFixtures: Route[] = INITIAL_ROUTE_FIXTURES.map((item) => ({
  ...item,
  stops: item.stops.map((stop) => ({ ...stop })),
}));

export function resetRouteFixtures() {
  routeFixtures = INITIAL_ROUTE_FIXTURES.map((item) => ({
    ...item,
    stops: item.stops.map((stop) => ({ ...stop })),
  }));
}

export function addRouteFixture(route: Route) {
  routeFixtures.push(route);
}

export function updateRouteFixture(id: string, patch: Partial<Route>): Route | null {
  const index = routeFixtures.findIndex((candidate) => candidate.id === id);
  if (index === -1) return null;
  // Code is immutable per contract
  const { code: _ignored, ...allowedPatch } = patch;
  const current = routeFixtures[index];
  if (!current) return null;
  const updated: Route = {
    ...current,
    ...allowedPatch,
  };
  routeFixtures[index] = updated;
  return updated;
}

export function getRouteFixture(id: string): Route | null {
  return routeFixtures.find((candidate) => candidate.id === id) ?? null;
}

export const EMPTY_ROUTES_QUERY: RouteQuery = { search: "zzz-sin-resultados" };

export function filterRouteFixtures(query: RouteQuery): Route[] {
  return routeFixtures.filter((route) => {
    if (query.active !== undefined && route.active !== query.active) return false;
    if (query.zoneId && !route.stops.some((stop) => stop.zoneId === query.zoneId)) return false;
    if (
      query.search &&
      !route.name.toLowerCase().includes(query.search.toLowerCase()) &&
      !route.code.toLowerCase().includes(query.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

export function paginateRouteFixtures(routes: Route[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  const data = routes.slice(start, start + pageSize);
  return {
    data,
    meta: {
      total: routes.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(routes.length / pageSize)),
    },
  };
}

/**
 * References check fixture data:
 * Simulates active ServiceFrequencies referencing a Route.
 * Deactivating a Route referenced by an active ServiceFrequency is allowed
 * but warns first — the backend performs no referential check against ServiceFrequencies at all.
 */
export function getRouteReferences(routeId: string): RouteReferenceReport {
  if (routeId === "route-1") {
    return {
      routeId,
      activeServiceFrequencies: [
        {
          id: "freq-1",
          serviceTypeName: "Recolección Domiciliaria",
          shift: "MAÑANA",
          weekdays: ["LUNES", "MIERCOLES", "VIERNES"],
        },
      ],
      totalReferences: 1,
    };
  }

  if (routeId === "route-2") {
    return {
      routeId,
      activeServiceFrequencies: [
        {
          id: "freq-2",
          serviceTypeName: "Barrido Mecánico",
          shift: "NOCHE",
          weekdays: ["MARTES", "JUEVES"],
        },
      ],
      totalReferences: 1,
    };
  }

  return {
    routeId,
    activeServiceFrequencies: [],
    totalReferences: 0,
  };
}
