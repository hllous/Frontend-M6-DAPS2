import { NextResponse } from "next/server";

import { backendQuery } from "@/lib/bff-route";
import { fetchPublicBackend, publicMockMode, relayPublicResponse, withCacheControl } from "@/lib/public-bff";
import { queryPublicGreenPointFixtures } from "@/lib/public-green-point-fixtures";
import {
  PUBLIC_GREEN_POINTS_CACHE_CONTROL,
  PUBLIC_GREEN_POINTS_QUERY_KEYS,
  publicGreenPointsPageSchema,
} from "@/lib/public-green-points";

function positiveInt(value: string | null): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (publicMockMode()) {
    const page = queryPublicGreenPointFixtures({
      zoneId: url.searchParams.get("zoneId") ?? undefined,
      page: positiveInt(url.searchParams.get("page")),
      pageSize: positiveInt(url.searchParams.get("pageSize")),
    });
    return withCacheControl(NextResponse.json(page), PUBLIC_GREEN_POINTS_CACHE_CONTROL);
  }

  const query = backendQuery(Object.fromEntries(url.searchParams), PUBLIC_GREEN_POINTS_QUERY_KEYS);
  const response = await fetchPublicBackend(request, `/public/green-points${query}`);
  return relayPublicResponse(response, url.pathname, publicGreenPointsPageSchema, PUBLIC_GREEN_POINTS_CACHE_CONTROL);
}
