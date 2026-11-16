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
import { z } from "zod";
export class BackendContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("6941")) {
      {}
    } else {
      stryCov_9fa48("6941");
      super(message, options);
      this.name = stryMutAct_9fa48("6942") ? "" : (stryCov_9fa48("6942"), "BackendContractError");
    }
  }
}
export class BackendRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    if (stryMutAct_9fa48("6943")) {
      {}
    } else {
      stryCov_9fa48("6943");
      super(message);
      this.name = stryMutAct_9fa48("6944") ? "" : (stryCov_9fa48("6944"), "BackendRequestError");
      this.status = status;
    }
  }
}
const errorResponseSchema = z.object(stryMutAct_9fa48("6945") ? {} : (stryCov_9fa48("6945"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("6946") ? [] : (stryCov_9fa48("6946"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
export async function readJsonBody(response: Response, resource: string): Promise<unknown> {
  if (stryMutAct_9fa48("6947")) {
    {}
  } else {
    stryCov_9fa48("6947");
    try {
      if (stryMutAct_9fa48("6948")) {
        {}
      } else {
        stryCov_9fa48("6948");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("6949")) {
        {}
      } else {
        stryCov_9fa48("6949");
        throw new BackendContractError(stryMutAct_9fa48("6951") ? `` : (stryCov_9fa48("6951"), `No se pudo obtener información válida de ${resource}. Reintente en unos segundos.`), stryMutAct_9fa48("6952") ? {} : (stryCov_9fa48("6952"), {
          cause
        }));
      }
    }
  }
}
export function parseBackendError(payload: unknown, resource: string): BackendRequestError | BackendContractError {
  if (stryMutAct_9fa48("6953")) {
    {}
  } else {
    stryCov_9fa48("6953");
    const parsed = errorResponseSchema.safeParse(payload);
    if (stryMutAct_9fa48("6956") ? false : stryMutAct_9fa48("6955") ? true : stryMutAct_9fa48("6954") ? parsed.success : (stryCov_9fa48("6954", "6955", "6956"), !parsed.success)) {
      if (stryMutAct_9fa48("6957")) {
        {}
      } else {
        stryCov_9fa48("6957");
        return new BackendContractError(stryMutAct_9fa48("6958") ? `` : (stryCov_9fa48("6958"), `No se pudo obtener información válida de ${resource}. Reintente en unos segundos.`), stryMutAct_9fa48("6959") ? {} : (stryCov_9fa48("6959"), {
          cause: parsed.error
        }));
      }
    }
    const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("6960") ? "" : (stryCov_9fa48("6960"), " ")) : parsed.data.message;
    return new BackendRequestError(message, parsed.data.statusCode);
  }
}