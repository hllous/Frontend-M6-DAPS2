import { z } from "zod";
import { authenticatedFetch } from "./authenticated-fetch";
import { ADDRESS_SEARCH_FALLBACK_MESSAGE } from "./address-search-messages";

export { ADDRESS_SEARCH_FALLBACK_MESSAGE } from "./address-search-messages";

export const ADDRESS_SEARCH_PATH = "/api/address-search";
export const ADDRESS_SEARCH_LIMIT = 5;
export const ADDRESS_SEARCH_TIMEOUT_MS = 5000;

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

/** Validate the same-origin BFF boundary before mapping results for the picker. */
export async function searchAddresses(query: string) {
  const response = await authenticatedFetch(`${ADDRESS_SEARCH_PATH}?${new URLSearchParams({ q: query })}`);
  if (!response.ok) throw new Error(ADDRESS_SEARCH_FALLBACK_MESSAGE);
  const payload = z.discriminatedUnion("outcome", [
    z.object({ outcome: z.literal("results"), data: z.array(addressSearchResultSchema).max(ADDRESS_SEARCH_LIMIT) }),
    z.object({ outcome: z.literal("empty"), data: z.array(addressSearchResultSchema).length(0) }),
  ]).parse(await response.json());
  return payload.data.map(({ label, latitude, longitude }) => ({ label, lat: latitude, lng: longitude }));
}
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
