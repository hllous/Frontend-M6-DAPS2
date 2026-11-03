import { NextResponse } from "next/server";
import { authorize, backendMode, backendQuery, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
import { listRoles } from "@/mocks/role-assignment-fixtures";

export async function GET(request: Request) {
  try {
    const { session } = authorize(request, { capability: "role:manage", throwOnError: true });
    const search = new URL(request.url).searchParams;
    const query = { page: pageParam(search), pageSize: pageSizeParam(search) };
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, `/role-assignments${backendQuery(query, ["page", "pageSize"])}`, "role:manage"));
    return NextResponse.json(listRoles(query.page ?? 1, query.pageSize ?? 10));
  } catch (error) { return mapSessionError(error, new URL(request.url).pathname, "No se pudieron cargar las asignaciones."); }
}
