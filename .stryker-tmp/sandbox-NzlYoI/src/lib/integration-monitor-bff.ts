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
import { pageParam, pageSizeParam } from "@/lib/input-limits";
import { auditQuerySchema, inboxQuerySchema, outboxQuerySchema } from "@/lib/integration-monitor";
export function noStore<T extends NextResponse>(response: T): T {
  if (stryMutAct_9fa48("10410")) {
    {}
  } else {
    stryCov_9fa48("10410");
    response.headers.set(stryMutAct_9fa48("10412") ? "" : (stryCov_9fa48("10412"), "Cache-Control"), stryMutAct_9fa48("10413") ? "" : (stryCov_9fa48("10413"), "no-store, private, max-age=0"));
    return response;
  }
}
export function jsonNoStore(body: unknown, status = 200): NextResponse {
  if (stryMutAct_9fa48("10414")) {
    {}
  } else {
    stryCov_9fa48("10414");
    return noStore(NextResponse.json(body, stryMutAct_9fa48("10415") ? {} : (stryCov_9fa48("10415"), {
      status
    })));
  }
}
export function parseOutboxQuery(url: URL) {
  if (stryMutAct_9fa48("10416")) {
    {}
  } else {
    stryCov_9fa48("10416");
    const params = url.searchParams;
    return outboxQuerySchema.safeParse(stryMutAct_9fa48("10417") ? {} : (stryCov_9fa48("10417"), {
      status: stryMutAct_9fa48("10418") ? params.get("status") && undefined : (stryCov_9fa48("10418"), params.get(stryMutAct_9fa48("10419") ? "" : (stryCov_9fa48("10419"), "status")) ?? undefined),
      eventType: stryMutAct_9fa48("10420") ? params.get("eventType") && undefined : (stryCov_9fa48("10420"), params.get(stryMutAct_9fa48("10421") ? "" : (stryCov_9fa48("10421"), "eventType")) ?? undefined),
      from: stryMutAct_9fa48("10422") ? params.get("from") && undefined : (stryCov_9fa48("10422"), params.get(stryMutAct_9fa48("10423") ? "" : (stryCov_9fa48("10423"), "from")) ?? undefined),
      to: stryMutAct_9fa48("10424") ? params.get("to") && undefined : (stryCov_9fa48("10424"), params.get(stryMutAct_9fa48("10425") ? "" : (stryCov_9fa48("10425"), "to")) ?? undefined),
      page: pageParam(params),
      pageSize: pageSizeParam(params)
    }));
  }
}
export function parseInboxQuery(url: URL) {
  if (stryMutAct_9fa48("10426")) {
    {}
  } else {
    stryCov_9fa48("10426");
    const params = url.searchParams;
    return inboxQuerySchema.safeParse(stryMutAct_9fa48("10427") ? {} : (stryCov_9fa48("10427"), {
      status: stryMutAct_9fa48("10428") ? params.get("status") && undefined : (stryCov_9fa48("10428"), params.get(stryMutAct_9fa48("10429") ? "" : (stryCov_9fa48("10429"), "status")) ?? undefined),
      eventType: stryMutAct_9fa48("10430") ? params.get("eventType") && undefined : (stryCov_9fa48("10430"), params.get(stryMutAct_9fa48("10431") ? "" : (stryCov_9fa48("10431"), "eventType")) ?? undefined),
      sourceModule: stryMutAct_9fa48("10432") ? params.get("sourceModule") && undefined : (stryCov_9fa48("10432"), params.get(stryMutAct_9fa48("10433") ? "" : (stryCov_9fa48("10433"), "sourceModule")) ?? undefined),
      from: stryMutAct_9fa48("10434") ? params.get("from") && undefined : (stryCov_9fa48("10434"), params.get(stryMutAct_9fa48("10435") ? "" : (stryCov_9fa48("10435"), "from")) ?? undefined),
      to: stryMutAct_9fa48("10436") ? params.get("to") && undefined : (stryCov_9fa48("10436"), params.get(stryMutAct_9fa48("10437") ? "" : (stryCov_9fa48("10437"), "to")) ?? undefined),
      page: pageParam(params),
      pageSize: pageSizeParam(params)
    }));
  }
}
export function parseAuditQuery(url: URL) {
  if (stryMutAct_9fa48("10438")) {
    {}
  } else {
    stryCov_9fa48("10438");
    const params = url.searchParams;
    return auditQuerySchema.safeParse(stryMutAct_9fa48("10439") ? {} : (stryCov_9fa48("10439"), {
      entityType: stryMutAct_9fa48("10440") ? params.get("entityType") && undefined : (stryCov_9fa48("10440"), params.get(stryMutAct_9fa48("10441") ? "" : (stryCov_9fa48("10441"), "entityType")) ?? undefined),
      entityId: stryMutAct_9fa48("10442") ? params.get("entityId") && undefined : (stryCov_9fa48("10442"), params.get(stryMutAct_9fa48("10443") ? "" : (stryCov_9fa48("10443"), "entityId")) ?? undefined),
      page: pageParam(params),
      pageSize: pageSizeParam(params)
    }));
  }
}
export async function validatedBackendResponse<T>(response: Response, schema: z.ZodType<T>, path: string, invalidMessage: string): Promise<NextResponse> {
  if (stryMutAct_9fa48("10444")) {
    {}
  } else {
    stryCov_9fa48("10444");
    if (stryMutAct_9fa48("10447") ? false : stryMutAct_9fa48("10446") ? true : stryMutAct_9fa48("10445") ? response.ok : (stryCov_9fa48("10445", "10446", "10447"), !response.ok)) return noStore(forwardResponse(response));
    let body: unknown;
    try {
      if (stryMutAct_9fa48("10448")) {
        {}
      } else {
        stryCov_9fa48("10448");
        body = await response.json();
      }
    } catch {
      if (stryMutAct_9fa48("10449")) {
        {}
      } else {
        stryCov_9fa48("10449");
        return noStore(errorResponse(502, invalidMessage, path));
      }
    }
    const parsed = schema.safeParse(body);
    if (stryMutAct_9fa48("10452") ? false : stryMutAct_9fa48("10451") ? true : stryMutAct_9fa48("10450") ? parsed.success : (stryCov_9fa48("10450", "10451", "10452"), !parsed.success)) return noStore(errorResponse(502, invalidMessage, path));
    return jsonNoStore(parsed.data, response.status);
  }
}
export function invalidQueryResponse(path: string, message: string): NextResponse {
  if (stryMutAct_9fa48("10453")) {
    {}
  } else {
    stryCov_9fa48("10453");
    return noStore(errorResponse(400, message, path));
  }
}
export function invalidContractResponse(path: string, message: string): NextResponse {
  if (stryMutAct_9fa48("10454")) {
    {}
  } else {
    stryCov_9fa48("10454");
    return noStore(errorResponse(502, message, path));
  }
}