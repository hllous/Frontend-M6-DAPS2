import { NextResponse } from "next/server";
import { authorize, backendMode, errorResponse, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { fetchMe, sealRolesIfChanged } from "@/lib/me";
import { fetchBackend } from "@/lib/bff-backend";
import { roleAssignmentResponseSchema, validatedRoleAssignmentResponse } from "@/lib/role-assignment-bff";
import { getRoles, replacementSchema, setRoles, validUserId } from "@/mocks/role-assignment-fixtures";
import { sessionUserId } from "@/lib/session-actor";

type Context = { params: Promise<{ userId: string }> };
async function handle(request: Request, context: Context, method: "GET" | "PUT" | "DELETE") {
  const path = new URL(request.url).pathname;
  try {
    const { session } = authorize(request, { capability: "role:manage", throwOnError: true });
    const { userId } = await context.params;
    if (!validUserId(userId)) return errorResponse(400, "El legajo debe ser numérico.", path);
    let roles: ReturnType<typeof getRoles> = [];
    if (method === "PUT") {
      let body: unknown;
      try { body = await request.json(); } catch { return errorResponse(400, "El cuerpo no es un JSON válido.", path); }
      const parsed = replacementSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "La selección de roles no es válida.", path);
      roles = parsed.data.roles;
    }
    if (backendMode(session)) {
      const backendResponse = await fetchBackend(request, `/role-assignments/${userId}`, "role:manage", { method, ...(method === "PUT" ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ roles }) } : {}) });
      const response = method === "DELETE"
        ? forwardResponse(backendResponse, path)
        : await validatedRoleAssignmentResponse(backendResponse, roleAssignmentResponseSchema, path);
      if (method !== "GET" && backendResponse.ok && userId === sessionUserId(session)) {
        const me = await fetchMe(request);
        sealRolesIfChanged(response, request, me.roles);
      }
      return response;
    }
    if (method === "GET") return NextResponse.json({ userId, roles: getRoles(userId) });
    if (!setRoles(userId, roles)) return errorResponse(409, "No se puede quitar el último administrador.", path);
    const response = method === "DELETE" ? new NextResponse(null, { status: 204 }) : NextResponse.json({ userId, roles });
    if (userId === sessionUserId(session)) sealRolesIfChanged(response, request, roles);
    return response;
  } catch (error) { return mapSessionError(error, path, "No se pudieron gestionar los roles."); }
}
export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const PUT = (request: Request, context: Context) => handle(request, context, "PUT");
export const DELETE = (request: Request, context: Context) => handle(request, context, "DELETE");
