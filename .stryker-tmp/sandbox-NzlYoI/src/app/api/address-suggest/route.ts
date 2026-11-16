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
import { ADDRESS_SEARCH_TIMEOUT_MS, ADDRESS_SUGGEST_LIMIT, type StreetSuggestionResponse } from "@/lib/address-search";
import { errorResponse, mapSessionError } from "@/lib/bff-route";
import { getRequiredSession } from "@/lib/session";
const georefStreetsSchema = z.object(stryMutAct_9fa48("83") ? {} : (stryCov_9fa48("83"), {
  calles: z.array(z.object(stryMutAct_9fa48("84") ? {} : (stryCov_9fa48("84"), {
    nombre: stryMutAct_9fa48("86") ? z.string().min(1) : stryMutAct_9fa48("85") ? z.string().trim().max(1) : (stryCov_9fa48("85", "86"), z.string().trim().min(1))
  })))
}));

/** Street-name prefix suggestions while typing; the picker turns a chosen street into an address search. */
export async function GET(request: Request) {
  if (stryMutAct_9fa48("87")) {
    {}
  } else {
    stryCov_9fa48("87");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("88")) {
        {}
      } else {
        stryCov_9fa48("88");
        if (stryMutAct_9fa48("89")) {
          ;
        } else {
          stryCov_9fa48("89");
          getRequiredSession(request);
        }
        const query = stryMutAct_9fa48("92") ? z.string().min(2).max(100).safeParse(new URL(request.url).searchParams.get("q")) : stryMutAct_9fa48("91") ? z.string().trim().max(2).max(100).safeParse(new URL(request.url).searchParams.get("q")) : stryMutAct_9fa48("90") ? z.string().trim().min(2).min(100).safeParse(new URL(request.url).searchParams.get("q")) : (stryCov_9fa48("90", "91", "92"), z.string().trim().min(2).max(100).safeParse(new URL(request.url).searchParams.get(stryMutAct_9fa48("93") ? "" : (stryCov_9fa48("93"), "q"))));
        if (stryMutAct_9fa48("96") ? false : stryMutAct_9fa48("95") ? true : stryMutAct_9fa48("94") ? query.success : (stryCov_9fa48("94", "95", "96"), !query.success)) return errorResponse(400, stryMutAct_9fa48("97") ? "" : (stryCov_9fa48("97"), "Ingrese al menos 2 letras de la calle."), path);
        const url = new URL(stryMutAct_9fa48("98") ? "" : (stryCov_9fa48("98"), "https://apis.datos.gob.ar/georef/api/calles"));
        url.searchParams.set(stryMutAct_9fa48("100") ? "" : (stryCov_9fa48("100"), "nombre"), query.data);
        url.searchParams.set(stryMutAct_9fa48("102") ? "" : (stryCov_9fa48("102"), "provincia"), stryMutAct_9fa48("103") ? "" : (stryCov_9fa48("103"), "02"));
        url.searchParams.set(stryMutAct_9fa48("105") ? "" : (stryCov_9fa48("105"), "campos"), stryMutAct_9fa48("106") ? "" : (stryCov_9fa48("106"), "nombre"));
        url.searchParams.set(stryMutAct_9fa48("108") ? "" : (stryCov_9fa48("108"), "max"), String(ADDRESS_SEARCH_LIMIT_FOR_STREETS));
        try {
          if (stryMutAct_9fa48("109")) {
            {}
          } else {
            stryCov_9fa48("109");
            const response = await fetch(url, stryMutAct_9fa48("110") ? {} : (stryCov_9fa48("110"), {
              cache: stryMutAct_9fa48("111") ? "" : (stryCov_9fa48("111"), "no-store"),
              signal: AbortSignal.timeout(ADDRESS_SEARCH_TIMEOUT_MS)
            }));
            const parsed = response.ok ? georefStreetsSchema.safeParse(await response.json().catch(() => undefined)) : undefined;
            // Suggestions are best effort: any upstream problem is just an empty list.
            const names = (stryMutAct_9fa48("112") ? parsed.success : (stryCov_9fa48("112"), parsed?.success)) ? stryMutAct_9fa48("113") ? [] : (stryCov_9fa48("113"), [...new Set(parsed.data.calles.map(stryMutAct_9fa48("114") ? () => undefined : (stryCov_9fa48("114"), street => street.nombre)))]) : stryMutAct_9fa48("115") ? ["Stryker was here"] : (stryCov_9fa48("115"), []);
            return NextResponse.json({
              outcome: names.length ? "results" : "empty",
              data: names.slice(0, ADDRESS_SUGGEST_LIMIT).map(label => ({
                label
              }))
            } as StreetSuggestionResponse);
          }
        } catch {
          if (stryMutAct_9fa48("116")) {
            {}
          } else {
            stryCov_9fa48("116");
            return NextResponse.json((stryMutAct_9fa48("117") ? {} : (stryCov_9fa48("117"), {
              outcome: stryMutAct_9fa48("118") ? "" : (stryCov_9fa48("118"), "empty"),
              data: stryMutAct_9fa48("119") ? ["Stryker was here"] : (stryCov_9fa48("119"), [])
            })) satisfies StreetSuggestionResponse);
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("120")) {
        {}
      } else {
        stryCov_9fa48("120");
        return mapSessionError(error, path, stryMutAct_9fa48("121") ? "" : (stryCov_9fa48("121"), "No se pudo sugerir calles."));
      }
    }
  }
}

// Georef repeats a street once per comuna, so fetch more than we show before de-duplicating.
const ADDRESS_SEARCH_LIMIT_FOR_STREETS = 20;