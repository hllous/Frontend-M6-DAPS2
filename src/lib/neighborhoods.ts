import { filterNeighborhoodFixtures, resolveNeighborhoodFixtures } from "./neighborhoods-fixtures";

export type Neighborhood = {
  id: string;
  name: string;
};
export type NeighborhoodQuery = {
  search?: string;
};

/**
 * The source behind this adapter is intentionally replaceable until the external neighborhood catalog is published.
 */
export const neighborhoodsAdapter = {
  async search(query: NeighborhoodQuery = {}): Promise<Neighborhood[]> {
    return filterNeighborhoodFixtures(query.search);
  },

  /**
   * Un barrio asignado en el backend puede no estar en este catálogo: los barrios
   * son de M9 y su catálogo todavía no se publicó (docs/bloqueantes.md), así que
   * un id como `caba-belgrano` no resuelve a un nombre. Se devuelve el id como
   * nombre en vez de descartarlo: la zona tiene ese barrio asignado y decir que no
   * tiene ninguno sería peor que mostrar el identificador.
   */
  async resolveIds(ids: string[]): Promise<Neighborhood[]> {
    const resolved = new Map(resolveNeighborhoodFixtures(ids).map((neighborhood) => [neighborhood.id, neighborhood]));
    return ids.map((id) => resolved.get(id) ?? { id, name: id });
  },
};
