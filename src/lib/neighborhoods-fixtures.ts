import type { Neighborhood } from "./neighborhoods";

const NEIGHBORHOOD_FIXTURES: Neighborhood[] = [
  { id: "barrio-1", name: "Barrio Centro" },
  { id: "barrio-2", name: "Barrio Norte" },
  { id: "barrio-3", name: "Barrio Sur" },
  { id: "barrio-4", name: "Barrio Oeste" },
  { id: "barrio-5", name: "Barrio Industrial" },
];

export function filterNeighborhoodFixtures(search = ""): Neighborhood[] {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return [...NEIGHBORHOOD_FIXTURES];

  return NEIGHBORHOOD_FIXTURES.filter((neighborhood) =>
    `${neighborhood.id} ${neighborhood.name}`.toLowerCase().includes(normalizedSearch),
  );
}
export function resolveNeighborhoodFixtures(ids: string[]): Neighborhood[] {
  return ids.map((id) => NEIGHBORHOOD_FIXTURES.find((neighborhood) => neighborhood.id === id)).filter(
    (neighborhood): neighborhood is Neighborhood => Boolean(neighborhood),
  );
}
