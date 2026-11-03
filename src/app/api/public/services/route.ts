import { NextResponse } from "next/server";

import { backendQuery } from "@/lib/bff-route";
import { argentinaDay } from "@/lib/argentina-date";
import { fetchPublicBackend, publicMockMode, relayPublicResponse, withCacheControl } from "@/lib/public-bff";
import { queryPublicServiceFixtures } from "@/lib/public-service-fixtures";
import { PUBLIC_SERVICES_QUERY_KEYS, publicServicesPageSchema } from "@/lib/public-services";

function positiveInt(value: string | null): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

// Los servicios cambian de etapa durante el día: nunca se cachean.
export async function GET(request: Request) {
  const url = new URL(request.url);

  if (publicMockMode()) {
    const today = argentinaDay(new Date().toISOString()) ?? "";
    const page = queryPublicServiceFixtures(today, {
      zoneId: url.searchParams.get("zoneId") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      page: positiveInt(url.searchParams.get("page")),
      pageSize: positiveInt(url.searchParams.get("pageSize")),
    });
    return withCacheControl(NextResponse.json(page));
  }

  const query = backendQuery(Object.fromEntries(url.searchParams), PUBLIC_SERVICES_QUERY_KEYS);
  const response = await fetchPublicBackend(request, `/public/services${query}`);
  return relayPublicResponse(response, url.pathname, publicServicesPageSchema);
}
