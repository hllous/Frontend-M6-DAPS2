import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADDRESS_SEARCH_FALLBACK_MESSAGE,
  ADDRESS_SEARCH_LIMIT,
  ADDRESS_SEARCH_TIMEOUT_MS,
  type AddressSearchFailureOutcome,
  type AddressSearchResponse,
} from "@/lib/address-search";
import { errorResponse, mapSessionError } from "@/lib/bff-route";
import { georefResponseSchema } from "@/lib/georef";
import { roundCoordinate } from "@/lib/input-limits";
import { NOMINATIM_SEARCH_URL, NOMINATIM_USER_AGENT, nominatimLabels, nominatimResponseSchema } from "@/lib/nominatim";
import { getRequiredSession } from "@/lib/session";

async function searchFailure(path: string, outcome: AddressSearchFailureOutcome, status = 502) {
  const envelope = await errorResponse(status, ADDRESS_SEARCH_FALLBACK_MESSAGE, path).json();
  return NextResponse.json({ ...envelope, outcome }, { status });
}

/** Street-level fallback; any failure just means "no results", never an error for the user. */
async function nominatimFallback(query: string) {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", `${query}, CABA`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("limit", String(ADDRESS_SEARCH_LIMIT * 2));
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": NOMINATIM_USER_AGENT },
      signal: AbortSignal.timeout(ADDRESS_SEARCH_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const parsed = nominatimResponseSchema.safeParse(await response.json().catch(() => undefined));
    return parsed.success ? nominatimLabels(parsed.data).slice(0, ADDRESS_SEARCH_LIMIT) : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    getRequiredSession(request);
    const query = z.string().trim().min(1).max(200).safeParse(new URL(request.url).searchParams.get("q"));
    if (!query.success) return errorResponse(400, "Ingrese una dirección de hasta 200 caracteres.", path);
    const url = new URL("https://apis.datos.gob.ar/georef/api/direcciones");
    url.searchParams.set("direccion", query.data);
    url.searchParams.set("provincia", "02");
    url.searchParams.set("max", String(ADDRESS_SEARCH_LIMIT));
    const signal = AbortSignal.timeout(ADDRESS_SEARCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store", signal });
    } catch {
      return searchFailure(path, signal.aborted ? "timeout" : "upstream_error", signal.aborted ? 504 : 502);
    }
    if (!response.ok) return searchFailure(path, "upstream_error");
    const body: unknown = await response.json().catch(() => undefined);
    if (signal.aborted) return searchFailure(path, "timeout", 504);
    const parsed = georefResponseSchema.safeParse(body);
    if (!parsed.success) return searchFailure(path, "invalid_response");
    let data = parsed.data.direcciones.slice(0, ADDRESS_SEARCH_LIMIT).map((address) => ({
      label: address.nomenclatura,
      latitude: roundCoordinate(address.ubicacion.lat),
      longitude: roundCoordinate(address.ubicacion.lon),
    }));
    // Typeahead stays on Georef: the public Nominatim service forbids per-keystroke autocomplete.
    if (!data.length && new URL(request.url).searchParams.get("typeahead") !== "1") {
      data = (await nominatimFallback(query.data)).map((place) => ({
        label: place.label,
        latitude: roundCoordinate(place.lat),
        longitude: roundCoordinate(place.lon),
      }));
    }
    return NextResponse.json({ outcome: data.length ? "results" : "empty", data } satisfies AddressSearchResponse);
  } catch (error) {
    return mapSessionError(error, path, "No se pudo buscar la dirección.");
  }
}
