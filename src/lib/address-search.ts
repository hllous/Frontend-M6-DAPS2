import { z } from "zod";

export const ADDRESS_SEARCH_PATH = "/api/address-search";
export const ADDRESS_SEARCH_LIMIT = 5;
export const ADDRESS_SEARCH_TIMEOUT_MS = 5000;
export const ADDRESS_SEARCH_FALLBACK_MESSAGE = "No se encontró esa dirección. Márquela en el mapa.";

export const addressSearchResultSchema = z.object({
  label: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type AddressSearchResult = z.infer<typeof addressSearchResultSchema>;
export type AddressSearchResponse = {
  outcome: "results" | "empty";
  data: AddressSearchResult[];
};
export type AddressSearchFailureOutcome = "upstream_error" | "invalid_response" | "timeout";
/** Existing BFF error envelope plus a stable discriminator for search failures. */
export type AddressSearchFailure = {
  outcome: AddressSearchFailureOutcome;
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
};
