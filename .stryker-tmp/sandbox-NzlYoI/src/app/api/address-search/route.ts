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
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADDRESS_SEARCH_FALLBACK_MESSAGE, ADDRESS_SEARCH_LIMIT, ADDRESS_SEARCH_TIMEOUT_MS, type AddressSearchFailureOutcome, type AddressSearchResponse } from "@/lib/address-search";
import { errorResponse, mapSessionError } from "@/lib/bff-route";
import { georefResponseSchema } from "@/lib/georef";
import { roundCoordinate } from "@/lib/input-limits";
import { NOMINATIM_SEARCH_URL, NOMINATIM_USER_AGENT, nominatimLabels, nominatimResponseSchema } from "@/lib/nominatim";
import { getRequiredSession } from "@/lib/session";
async function searchFailure(path: string, outcome: AddressSearchFailureOutcome, status = 502) {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    const envelope = await errorResponse(status, ADDRESS_SEARCH_FALLBACK_MESSAGE, path).json();
    return NextResponse.json(stryMutAct_9fa48("1") ? {} : (stryCov_9fa48("1"), {
      ...envelope,
      outcome
    }), stryMutAct_9fa48("2") ? {} : (stryCov_9fa48("2"), {
      status
    }));
  }
}

/** Street-level fallback; any failure just means "no results", never an error for the user. */
async function nominatimFallback(query: string) {
  if (stryMutAct_9fa48("3")) {
    {}
  } else {
    stryCov_9fa48("3");
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set(stryMutAct_9fa48("5") ? "" : (stryCov_9fa48("5"), "q"), stryMutAct_9fa48("6") ? `` : (stryCov_9fa48("6"), `${query}, CABA`));
    url.searchParams.set(stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), "format"), stryMutAct_9fa48("9") ? "" : (stryCov_9fa48("9"), "jsonv2"));
    url.searchParams.set(stryMutAct_9fa48("11") ? "" : (stryCov_9fa48("11"), "countrycodes"), stryMutAct_9fa48("12") ? "" : (stryCov_9fa48("12"), "ar"));
    url.searchParams.set(stryMutAct_9fa48("14") ? "" : (stryCov_9fa48("14"), "limit"), String(stryMutAct_9fa48("15") ? ADDRESS_SEARCH_LIMIT / 2 : (stryCov_9fa48("15"), ADDRESS_SEARCH_LIMIT * 2)));
    try {
      if (stryMutAct_9fa48("16")) {
        {}
      } else {
        stryCov_9fa48("16");
        const response = await fetch(url, stryMutAct_9fa48("17") ? {} : (stryCov_9fa48("17"), {
          cache: stryMutAct_9fa48("18") ? "" : (stryCov_9fa48("18"), "no-store"),
          headers: stryMutAct_9fa48("19") ? {} : (stryCov_9fa48("19"), {
            "user-agent": NOMINATIM_USER_AGENT
          }),
          signal: AbortSignal.timeout(ADDRESS_SEARCH_TIMEOUT_MS)
        }));
        if (stryMutAct_9fa48("22") ? false : stryMutAct_9fa48("21") ? true : stryMutAct_9fa48("20") ? response.ok : (stryCov_9fa48("20", "21", "22"), !response.ok)) return stryMutAct_9fa48("23") ? ["Stryker was here"] : (stryCov_9fa48("23"), []);
        const parsed = nominatimResponseSchema.safeParse(await response.json().catch(() => undefined));
        return parsed.success ? stryMutAct_9fa48("24") ? nominatimLabels(parsed.data) : (stryCov_9fa48("24"), nominatimLabels(parsed.data).slice(0, ADDRESS_SEARCH_LIMIT)) : stryMutAct_9fa48("25") ? ["Stryker was here"] : (stryCov_9fa48("25"), []);
      }
    } catch {
      if (stryMutAct_9fa48("26")) {
        {}
      } else {
        stryCov_9fa48("26");
        return stryMutAct_9fa48("27") ? ["Stryker was here"] : (stryCov_9fa48("27"), []);
      }
    }
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("28")) {
    {}
  } else {
    stryCov_9fa48("28");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("29")) {
        {}
      } else {
        stryCov_9fa48("29");
        if (stryMutAct_9fa48("30")) {
          ;
        } else {
          stryCov_9fa48("30");
          getRequiredSession(request);
        }
        const query = stryMutAct_9fa48("33") ? z.string().min(1).max(200).safeParse(new URL(request.url).searchParams.get("q")) : stryMutAct_9fa48("32") ? z.string().trim().max(1).max(200).safeParse(new URL(request.url).searchParams.get("q")) : stryMutAct_9fa48("31") ? z.string().trim().min(1).min(200).safeParse(new URL(request.url).searchParams.get("q")) : (stryCov_9fa48("31", "32", "33"), z.string().trim().min(1).max(200).safeParse(new URL(request.url).searchParams.get(stryMutAct_9fa48("34") ? "" : (stryCov_9fa48("34"), "q"))));
        if (stryMutAct_9fa48("37") ? false : stryMutAct_9fa48("36") ? true : stryMutAct_9fa48("35") ? query.success : (stryCov_9fa48("35", "36", "37"), !query.success)) return errorResponse(400, stryMutAct_9fa48("38") ? "" : (stryCov_9fa48("38"), "Ingrese una dirección de hasta 200 caracteres."), path);
        const url = new URL(stryMutAct_9fa48("39") ? "" : (stryCov_9fa48("39"), "https://apis.datos.gob.ar/georef/api/direcciones"));
        url.searchParams.set(stryMutAct_9fa48("41") ? "" : (stryCov_9fa48("41"), "direccion"), query.data);
        url.searchParams.set(stryMutAct_9fa48("43") ? "" : (stryCov_9fa48("43"), "provincia"), stryMutAct_9fa48("44") ? "" : (stryCov_9fa48("44"), "02"));
        url.searchParams.set(stryMutAct_9fa48("46") ? "" : (stryCov_9fa48("46"), "max"), String(ADDRESS_SEARCH_LIMIT));
        const signal = AbortSignal.timeout(ADDRESS_SEARCH_TIMEOUT_MS);
        let response: Response;
        try {
          if (stryMutAct_9fa48("47")) {
            {}
          } else {
            stryCov_9fa48("47");
            response = await fetch(url, stryMutAct_9fa48("48") ? {} : (stryCov_9fa48("48"), {
              cache: stryMutAct_9fa48("49") ? "" : (stryCov_9fa48("49"), "no-store"),
              signal
            }));
          }
        } catch {
          if (stryMutAct_9fa48("50")) {
            {}
          } else {
            stryCov_9fa48("50");
            return searchFailure(path, signal.aborted ? stryMutAct_9fa48("51") ? "" : (stryCov_9fa48("51"), "timeout") : stryMutAct_9fa48("52") ? "" : (stryCov_9fa48("52"), "upstream_error"), signal.aborted ? 504 : 502);
          }
        }
        if (stryMutAct_9fa48("55") ? false : stryMutAct_9fa48("54") ? true : stryMutAct_9fa48("53") ? response.ok : (stryCov_9fa48("53", "54", "55"), !response.ok)) return searchFailure(path, stryMutAct_9fa48("56") ? "" : (stryCov_9fa48("56"), "upstream_error"));
        const body: unknown = await response.json().catch(() => undefined);
        if (stryMutAct_9fa48("58") ? false : stryMutAct_9fa48("57") ? true : (stryCov_9fa48("57", "58"), signal.aborted)) return searchFailure(path, stryMutAct_9fa48("59") ? "" : (stryCov_9fa48("59"), "timeout"), 504);
        const parsed = georefResponseSchema.safeParse(body);
        if (stryMutAct_9fa48("62") ? false : stryMutAct_9fa48("61") ? true : stryMutAct_9fa48("60") ? parsed.success : (stryCov_9fa48("60", "61", "62"), !parsed.success)) return searchFailure(path, stryMutAct_9fa48("63") ? "" : (stryCov_9fa48("63"), "invalid_response"));
        let data = stryMutAct_9fa48("64") ? parsed.data.direcciones.map(address => ({
          label: address.nomenclatura,
          latitude: roundCoordinate(address.ubicacion.lat),
          longitude: roundCoordinate(address.ubicacion.lon)
        })) : (stryCov_9fa48("64"), parsed.data.direcciones.slice(0, ADDRESS_SEARCH_LIMIT).map(stryMutAct_9fa48("65") ? () => undefined : (stryCov_9fa48("65"), address => stryMutAct_9fa48("66") ? {} : (stryCov_9fa48("66"), {
          label: address.nomenclatura,
          latitude: roundCoordinate(address.ubicacion.lat),
          longitude: roundCoordinate(address.ubicacion.lon)
        }))));
        // Typeahead stays on Georef: the public Nominatim service forbids per-keystroke autocomplete.
        if (stryMutAct_9fa48("69") ? !data.length || new URL(request.url).searchParams.get("typeahead") !== "1" : stryMutAct_9fa48("68") ? false : stryMutAct_9fa48("67") ? true : (stryCov_9fa48("67", "68", "69"), (stryMutAct_9fa48("70") ? data.length : (stryCov_9fa48("70"), !data.length)) && (stryMutAct_9fa48("72") ? new URL(request.url).searchParams.get("typeahead") === "1" : stryMutAct_9fa48("71") ? true : (stryCov_9fa48("71", "72"), new URL(request.url).searchParams.get(stryMutAct_9fa48("73") ? "" : (stryCov_9fa48("73"), "typeahead")) !== (stryMutAct_9fa48("74") ? "" : (stryCov_9fa48("74"), "1")))))) {
          if (stryMutAct_9fa48("75")) {
            {}
          } else {
            stryCov_9fa48("75");
            data = (await nominatimFallback(query.data)).map(stryMutAct_9fa48("76") ? () => undefined : (stryCov_9fa48("76"), place => stryMutAct_9fa48("77") ? {} : (stryCov_9fa48("77"), {
              label: place.label,
              latitude: roundCoordinate(place.lat),
              longitude: roundCoordinate(place.lon)
            })));
          }
        }
        return NextResponse.json((stryMutAct_9fa48("78") ? {} : (stryCov_9fa48("78"), {
          outcome: data.length ? stryMutAct_9fa48("79") ? "" : (stryCov_9fa48("79"), "results") : stryMutAct_9fa48("80") ? "" : (stryCov_9fa48("80"), "empty"),
          data
        })) satisfies AddressSearchResponse);
      }
    } catch (error) {
      if (stryMutAct_9fa48("81")) {
        {}
      } else {
        stryCov_9fa48("81");
        return mapSessionError(error, path, stryMutAct_9fa48("82") ? "" : (stryCov_9fa48("82"), "No se pudo buscar la dirección."));
      }
    }
  }
}