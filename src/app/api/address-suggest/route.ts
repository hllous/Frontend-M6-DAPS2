import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADDRESS_SEARCH_TIMEOUT_MS,
  ADDRESS_SUGGEST_LIMIT,
  type StreetSuggestionResponse,
} from "@/lib/address-search";
import { errorResponse, mapSessionError } from "@/lib/bff-route";
import { getRequiredSession } from "@/lib/session";

const georefStreetsSchema = z.object({
  calles: z.array(z.object({ nombre: z.string().trim().min(1) })),
});

/** Street-name prefix suggestions while typing; the picker turns a chosen street into an address search. */
export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    getRequiredSession(request);
    const query = z.string().trim().min(2).max(100).safeParse(new URL(request.url).searchParams.get("q"));
    if (!query.success) return errorResponse(400, "Ingrese al menos 2 letras de la calle.", path);
    const url = new URL("https://apis.datos.gob.ar/georef/api/calles");
    url.searchParams.set("nombre", query.data);
    url.searchParams.set("provincia", "02");
    url.searchParams.set("campos", "nombre");
    url.searchParams.set("max", String(ADDRESS_SEARCH_LIMIT_FOR_STREETS));
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(ADDRESS_SEARCH_TIMEOUT_MS) });
      const parsed = response.ok ? georefStreetsSchema.safeParse(await response.json().catch(() => undefined)) : undefined;
      // Suggestions are best effort: any upstream problem is just an empty list.
      const names = parsed?.success ? [...new Set(parsed.data.calles.map((street) => street.nombre))] : [];
      return NextResponse.json({ outcome: names.length ? "results" : "empty", data: names.slice(0, ADDRESS_SUGGEST_LIMIT).map((label) => ({ label })) } as StreetSuggestionResponse);
    } catch {
      return NextResponse.json({ outcome: "empty", data: [] } satisfies StreetSuggestionResponse);
    }
  } catch (error) {
    return mapSessionError(error, path, "No se pudo sugerir calles.");
  }
}

// Georef repeats a street once per comuna, so fetch more than we show before de-duplicating.
const ADDRESS_SEARCH_LIMIT_FOR_STREETS = 20;
