import { z } from "zod";
import { authenticatedFetch } from "./authenticated-fetch";
import { ADDRESS_SEARCH_FALLBACK_MESSAGE } from "./address-search-messages";

export { ADDRESS_SEARCH_FALLBACK_MESSAGE } from "./address-search-messages";

export const ADDRESS_SEARCH_PATH = "/api/address-search";
export const ADDRESS_SEARCH_LIMIT = 5;
export const ADDRESS_SEARCH_TIMEOUT_MS = 5000;
export const ADDRESS_SUGGEST_PATH = "/api/address-suggest";
export const ADDRESS_SUGGEST_LIMIT = 5;

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
export async function searchAddresses(query: string, options: { typeahead?: boolean } = {}) {
  const params = new URLSearchParams({ q: query });
  if (options.typeahead) params.set("typeahead", "1");
  const response = await authenticatedFetch(`${ADDRESS_SEARCH_PATH}?${params}`);
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

export type StreetSuggestionResponse = { outcome: "results" | "empty"; data: { label: string }[] };
/** Street names matching what the user has typed so far; failures resolve to no suggestions. */
export async function suggestStreets(query: string, signal?: AbortSignal): Promise<string[]> {
  const response = await authenticatedFetch(`${ADDRESS_SUGGEST_PATH}?${new URLSearchParams({ q: query })}`, { signal });
  if (!response.ok) return [];
  const payload = z.object({ data: z.array(z.object({ label: z.string().min(1) })).max(ADDRESS_SUGGEST_LIMIT) }).safeParse(await response.json());
  return payload.success ? payload.data.data.map(({ label }) => label) : [];
}
