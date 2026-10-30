import { NextResponse } from "next/server";

import { fetchPublicBackend, publicMockMode, relayPublicResponse, withCacheControl } from "@/lib/public-bff";
import { publicZoneFixtures } from "@/lib/public-service-fixtures";
import { publicZonesSchema } from "@/lib/public-services";

// Las zonas cambian poco: pueden cachearse un minuto. Un error nunca se cachea.
const ZONES_CACHE_CONTROL = "public, max-age=60";

export async function GET(request: Request) {
  if (publicMockMode()) return withCacheControl(NextResponse.json(publicZoneFixtures), ZONES_CACHE_CONTROL);

  const response = await fetchPublicBackend(request, "/public/zones");
  return relayPublicResponse(response, new URL(request.url).pathname, publicZonesSchema, ZONES_CACHE_CONTROL);
}
