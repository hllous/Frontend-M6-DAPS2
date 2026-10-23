import { z } from "zod";

// Fallback geocoder for streets that Georef has no numbered addresses for (e.g. Av. 9 de Julio).
export const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
export const NOMINATIM_USER_AGENT = "m6-ambiente-frontend/0.1 (address search fallback)";
const CABA_NAME = "Ciudad Autónoma de Buenos Aires";

export const nominatimResponseSchema = z.array(z.object({
  display_name: z.string().trim().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
}));

/** Keep CABA results only, and one per neighbourhood: segments of the same street repeat the label. */
export function nominatimLabels(items: z.infer<typeof nominatimResponseSchema>) {
  const seen = new Set<string>();
  return items.filter((item) => item.display_name.includes(CABA_NAME)).flatMap((item) => {
    const label = item.display_name.split(", ").slice(0, 3).join(", ");
    if (seen.has(label)) return [];
    seen.add(label);
    return [{ label, lat: item.lat, lon: item.lon }];
  });
}
