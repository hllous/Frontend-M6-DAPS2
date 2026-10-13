import { z } from "zod";

type ResponseCoordinates = { lat: number | null; lng: number | null };

// Out-of-range or non-finite values and the exact (0, 0) pair (a cleared
// coordinate stored as zero, see #410) become "no coordinate" at the adapter
// boundary, so the map never plots them or fits its viewport to them.
export const responseCoordinatesSchema = z.object({
  lat: z.number().finite().min(-90).max(90).nullable().catch(null),
  lng: z.number().finite().min(-180).max(180).nullable().catch(null),
}).transform(({ lat, lng }): ResponseCoordinates => lat === null || lng === null || (lat === 0 && lng === 0)
  ? { lat: null, lng: null }
  : { lat, lng });

export function withResponseCoordinates<T extends z.ZodRawShape>(fields: T) {
  return z.object({
    ...fields,
    lat: z.unknown(),
    lng: z.unknown(),
  }).transform((entity) => ({
    ...entity,
    ...responseCoordinatesSchema.parse(entity),
  }));
}
