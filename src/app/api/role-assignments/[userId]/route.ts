import { NextResponse } from "next/server";
import { authorize, backendMode, errorResponse, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { DEMO_IDENTITIES } from "@/lib/demo-identities";
import { sealRolesIfChanged } from "@/lib/me";
import { fetchBackend } from "@/lib/bff-backend";
import { getRoles, replacementSchema, setRoles, validUserId } from "@/mocks/role-assignment-fixtures";

type Context = { params: Promise<{ userId: string }> };
async function handle(request: Request, context: Context, method: "GET" | "PUT" | "DELETE") {
  const path = new URL(request.url).pathname;
  try {
    const { session } = authorize(request, { capability: "role:manage", throwOnError: true });
    const { userId } = await context.params;
    if (!validUserId(userId)) return errorResponse(400, "El identificador de M1 debe ser numérico.", path);
    let roles: ReturnType<typeof getRoles> = [];
    if (method === "PUT") {
      let body: unknown;
      try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo no es un JSON válido.", path); }
      const parsed = replacementSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "La selección de roles no es válida.", path);
      roles = parsed.data.roles;
    }
    if (backendMode(session)) return forwardResponse(await fetchBackend(request, `/role-assignments/${userId}`, "role:manage", { method, ...(method === "PUT" ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ roles }) } : {}) }));
    if (method === "GET") return NextResponse.json({ userId, roles: getRoles(userId) });
    if (!setRoles(userId, roles)) return errorResponse(409, "No se puede quitar el último administrador.", path);
    const response = method === "DELETE" ? new NextResponse(null, { status: 204 }) : NextResponse.json({ userId, roles });
    if (userId === DEMO_IDENTITIES[session.scenarioId].sub) sealRolesIfChanged(response, request, roles);
    return response;
  } catch (error) { return mapSessionError(error, path, "No se pudieron gestionar los roles."); }
}
export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const PUT = (request: Request, context: Context) => handle(request, context, "PUT");
export const DELETE = (request: Request, context: Context) => handle(request, context, "DELETE");
