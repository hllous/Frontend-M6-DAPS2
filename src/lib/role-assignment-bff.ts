import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, forwardResponse } from "@/lib/bff-route";
import { m6RoleSchema } from "@/lib/m6-roles";

export const roleAssignmentResponseSchema = z.object({
  userId: z.string().regex(/^\d+$/),
  roles: z.array(m6RoleSchema),
});

const paginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  totalPages: z.number().int().nonnegative(),
});

export const roleAssignmentPageSchema = z.object({
  data: z.array(roleAssignmentResponseSchema),
  meta: paginationMetaSchema,
});

export async function validatedRoleAssignmentResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
  path: string,
): Promise<NextResponse> {
  if (!response.ok) return forwardResponse(response, path);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return errorResponse(502, "La respuesta de asignaciones de roles no contiene JSON válido.", path);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(502, "No se pudo obtener información válida de asignaciones de roles. Reintente en unos segundos.", path);
  }

  return NextResponse.json(parsed.data, { status: response.status });
}
