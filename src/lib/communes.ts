import { z } from "zod";

import { fetchCatalogList } from "./neighborhoods";

const neighborhoodRefSchema = z.object({
  id: z.string(),
  codigo: z.string().optional(),
  nombre: z.string().optional(),
});

export const communeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  zones: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      neighborhoods: z.array(neighborhoodRefSchema),
    }),
  ),
});

export type Commune = z.infer<typeof communeSchema>;

export const communesAdapter = {
  list(): Promise<Commune[]> {
    return fetchCatalogList("/api/communes", communeSchema, "comunas");
  },
};
