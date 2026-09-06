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

  async resolveIds(ids: string[]): Promise<Neighborhood[]> {
    return resolveNeighborhoodFixtures(ids);
  },
};
