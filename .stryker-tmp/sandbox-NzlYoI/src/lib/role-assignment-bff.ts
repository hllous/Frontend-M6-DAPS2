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
import { errorResponse, forwardResponse } from "@/lib/bff-route";
import { m6RoleSchema } from "@/lib/m6-roles";
export const roleAssignmentResponseSchema = z.object(stryMutAct_9fa48("13274") ? {} : (stryCov_9fa48("13274"), {
  userId: z.string().regex(stryMutAct_9fa48("13278") ? /^\D+$/ : stryMutAct_9fa48("13277") ? /^\d$/ : stryMutAct_9fa48("13276") ? /^\d+/ : stryMutAct_9fa48("13275") ? /\d+$/ : (stryCov_9fa48("13275", "13276", "13277", "13278"), /^\d+$/)),
  roles: z.array(m6RoleSchema)
}));
const paginationMetaSchema = z.object(stryMutAct_9fa48("13279") ? {} : (stryCov_9fa48("13279"), {
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: stryMutAct_9fa48("13280") ? z.number().int().positive().min(100) : (stryCov_9fa48("13280"), z.number().int().positive().max(100)),
  totalPages: z.number().int().nonnegative()
}));
export const roleAssignmentPageSchema = z.object(stryMutAct_9fa48("13281") ? {} : (stryCov_9fa48("13281"), {
  data: z.array(roleAssignmentResponseSchema),
  meta: paginationMetaSchema
}));
export async function validatedRoleAssignmentResponse<T>(response: Response, schema: z.ZodType<T>, path: string): Promise<NextResponse> {
  if (stryMutAct_9fa48("13282")) {
    {}
  } else {
    stryCov_9fa48("13282");
    if (stryMutAct_9fa48("13285") ? false : stryMutAct_9fa48("13284") ? true : stryMutAct_9fa48("13283") ? response.ok : (stryCov_9fa48("13283", "13284", "13285"), !response.ok)) return forwardResponse(response, path);
    let body: unknown;
    try {
      if (stryMutAct_9fa48("13286")) {
        {}
      } else {
        stryCov_9fa48("13286");
        body = await response.json();
      }
    } catch {
      if (stryMutAct_9fa48("13287")) {
        {}
      } else {
        stryCov_9fa48("13287");
        return errorResponse(502, stryMutAct_9fa48("13288") ? "" : (stryCov_9fa48("13288"), "La respuesta de asignaciones de roles no contiene JSON válido."), path);
      }
    }
    const parsed = schema.safeParse(body);
    if (stryMutAct_9fa48("13291") ? false : stryMutAct_9fa48("13290") ? true : stryMutAct_9fa48("13289") ? parsed.success : (stryCov_9fa48("13289", "13290", "13291"), !parsed.success)) {
      if (stryMutAct_9fa48("13292")) {
        {}
      } else {
        stryCov_9fa48("13292");
        return errorResponse(502, stryMutAct_9fa48("13293") ? "" : (stryCov_9fa48("13293"), "No se pudo obtener información válida de asignaciones de roles. Reintente en unos segundos."), path);
      }
    }
    return NextResponse.json(parsed.data, stryMutAct_9fa48("13294") ? {} : (stryCov_9fa48("13294"), {
      status: response.status
    }));
  }
}