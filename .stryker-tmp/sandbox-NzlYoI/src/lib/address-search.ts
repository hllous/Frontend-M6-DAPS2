// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { z } from "zod";
import { authenticatedFetch } from "./authenticated-fetch";
import { ADDRESS_SEARCH_FALLBACK_MESSAGE } from "./address-search-messages";
export { ADDRESS_SEARCH_FALLBACK_MESSAGE } from "./address-search-messages";
export const ADDRESS_SEARCH_PATH = stryMutAct_9fa48("6722") ? "" : (stryCov_9fa48("6722"), "/api/address-search");
export const ADDRESS_SEARCH_LIMIT = 5;
export const ADDRESS_SEARCH_TIMEOUT_MS = 5000;
export const ADDRESS_SUGGEST_PATH = stryMutAct_9fa48("6723") ? "" : (stryCov_9fa48("6723"), "/api/address-suggest");
export const ADDRESS_SUGGEST_LIMIT = 5;
export const addressSearchResultSchema = z.object(stryMutAct_9fa48("6724") ? {} : (stryCov_9fa48("6724"), {
  label: stryMutAct_9fa48("6726") ? z.string().min(1) : stryMutAct_9fa48("6725") ? z.string().trim().max(1) : (stryCov_9fa48("6725", "6726"), z.string().trim().min(1)),
  latitude: stryMutAct_9fa48("6728") ? z.number().max(-90).max(90) : stryMutAct_9fa48("6727") ? z.number().min(-90).min(90) : (stryCov_9fa48("6727", "6728"), z.number().min(stryMutAct_9fa48("6729") ? +90 : (stryCov_9fa48("6729"), -90)).max(90)),
  longitude: stryMutAct_9fa48("6731") ? z.number().max(-180).max(180) : stryMutAct_9fa48("6730") ? z.number().min(-180).min(180) : (stryCov_9fa48("6730", "6731"), z.number().min(stryMutAct_9fa48("6732") ? +180 : (stryCov_9fa48("6732"), -180)).max(180))
}));
export type AddressSearchResult = z.infer<typeof addressSearchResultSchema>;
export type AddressSearchResponse = {
  outcome: "results" | "empty";
  data: AddressSearchResult[];
};

/** Validate the same-origin BFF boundary before mapping results for the picker. */
export async function searchAddresses(query: string, options: {
  typeahead?: boolean;
} = {}) {
  if (stryMutAct_9fa48("6733")) {
    {}
  } else {
    stryCov_9fa48("6733");
    const params = new URLSearchParams(stryMutAct_9fa48("6734") ? {} : (stryCov_9fa48("6734"), {
      q: query
    }));
    if (stryMutAct_9fa48("6736") ? false : stryMutAct_9fa48("6735") ? true : (stryCov_9fa48("6735", "6736"), options.typeahead)) params.set(stryMutAct_9fa48("6738") ? "" : (stryCov_9fa48("6738"), "typeahead"), stryMutAct_9fa48("6739") ? "" : (stryCov_9fa48("6739"), "1"));
    const response = await authenticatedFetch(stryMutAct_9fa48("6740") ? `` : (stryCov_9fa48("6740"), `${ADDRESS_SEARCH_PATH}?${params}`));
    if (stryMutAct_9fa48("6743") ? false : stryMutAct_9fa48("6742") ? true : stryMutAct_9fa48("6741") ? response.ok : (stryCov_9fa48("6741", "6742", "6743"), !response.ok)) if (stryMutAct_9fa48("6744")) {
      ;
    } else {
      stryCov_9fa48("6744");
      throw new Error(ADDRESS_SEARCH_FALLBACK_MESSAGE);
    }
    const payload = z.discriminatedUnion(stryMutAct_9fa48("6745") ? "" : (stryCov_9fa48("6745"), "outcome"), stryMutAct_9fa48("6746") ? [] : (stryCov_9fa48("6746"), [z.object(stryMutAct_9fa48("6747") ? {} : (stryCov_9fa48("6747"), {
      outcome: z.literal(stryMutAct_9fa48("6748") ? "" : (stryCov_9fa48("6748"), "results")),
      data: stryMutAct_9fa48("6749") ? z.array(addressSearchResultSchema).min(ADDRESS_SEARCH_LIMIT) : (stryCov_9fa48("6749"), z.array(addressSearchResultSchema).max(ADDRESS_SEARCH_LIMIT))
    })), z.object(stryMutAct_9fa48("6750") ? {} : (stryCov_9fa48("6750"), {
      outcome: z.literal(stryMutAct_9fa48("6751") ? "" : (stryCov_9fa48("6751"), "empty")),
      data: z.array(addressSearchResultSchema).length(0)
    }))])).parse(await response.json());
    return payload.data.map(stryMutAct_9fa48("6752") ? () => undefined : (stryCov_9fa48("6752"), ({
      label,
      latitude,
      longitude
    }) => stryMutAct_9fa48("6753") ? {} : (stryCov_9fa48("6753"), {
      label,
      lat: latitude,
      lng: longitude
    })));
  }
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
export type StreetSuggestionResponse = {
  outcome: "results" | "empty";
  data: {
    label: string;
  }[];
};
/** Street names matching what the user has typed so far; failures resolve to no suggestions. */
export async function suggestStreets(query: string, signal?: AbortSignal): Promise<string[]> {
  if (stryMutAct_9fa48("6754")) {
    {}
  } else {
    stryCov_9fa48("6754");
    const response = await authenticatedFetch(stryMutAct_9fa48("6755") ? `` : (stryCov_9fa48("6755"), `${ADDRESS_SUGGEST_PATH}?${new URLSearchParams(stryMutAct_9fa48("6756") ? {} : (stryCov_9fa48("6756"), {
      q: query
    }))}`), stryMutAct_9fa48("6757") ? {} : (stryCov_9fa48("6757"), {
      signal
    }));
    if (stryMutAct_9fa48("6760") ? false : stryMutAct_9fa48("6759") ? true : stryMutAct_9fa48("6758") ? response.ok : (stryCov_9fa48("6758", "6759", "6760"), !response.ok)) return stryMutAct_9fa48("6761") ? ["Stryker was here"] : (stryCov_9fa48("6761"), []);
    const payload = z.object(stryMutAct_9fa48("6762") ? {} : (stryCov_9fa48("6762"), {
      data: stryMutAct_9fa48("6763") ? z.array(z.object({
        label: z.string().min(1)
      })).min(ADDRESS_SUGGEST_LIMIT) : (stryCov_9fa48("6763"), z.array(z.object(stryMutAct_9fa48("6764") ? {} : (stryCov_9fa48("6764"), {
        label: stryMutAct_9fa48("6765") ? z.string().max(1) : (stryCov_9fa48("6765"), z.string().min(1))
      }))).max(ADDRESS_SUGGEST_LIMIT))
    })).safeParse(await response.json());
    return payload.success ? payload.data.data.map(stryMutAct_9fa48("6766") ? () => undefined : (stryCov_9fa48("6766"), ({
      label
    }) => label)) : stryMutAct_9fa48("6767") ? ["Stryker was here"] : (stryCov_9fa48("6767"), []);
  }
}