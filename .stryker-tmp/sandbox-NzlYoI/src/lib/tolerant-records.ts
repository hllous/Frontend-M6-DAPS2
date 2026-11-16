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
import { recordTelemetryEvent, type TelemetryEvent } from "./telemetry";
type Resource = Extract<TelemetryEvent, {
  name: "request_malformed_response";
}>["resource"];
const droppedByPage = new WeakMap<object, number>();

/** How many records of THIS page `tolerantRecords` dropped (0 for any other array). Not derived from `meta.total`, which also differs when merely paginating. */
export function droppedRecords(records: readonly unknown[]): number {
  if (stryMutAct_9fa48("16379")) {
    {}
  } else {
    stryCov_9fa48("16379");
    return stryMutAct_9fa48("16380") ? droppedByPage.get(records) && 0 : (stryCov_9fa48("16380"), droppedByPage.get(records) ?? 0);
  }
}

/**
 * `z.array(record)` for backend list envelopes. The backend adds closed-enum members often (e.g.
 * `EXPIRED`), and with a plain array one unknown value fails the whole page. Here each record is
 * validated on its own: one whose only problem is an unknown enum value is dropped, logged and counted in telemetry, the rest are
 * shown. A malformed record (missing field, wrong type), a payload that is not an array or an envelope without `meta` still fails, and detail and
 * mutation responses stay strict. See "Closed backend enums" in CONTRACTS.md.
 */
export function tolerantRecords<T extends z.ZodType>(recordSchema: T, resource: Resource) {
  if (stryMutAct_9fa48("16381")) {
    {}
  } else {
    stryCov_9fa48("16381");
    return z.array(z.unknown()).transform((records, ctx): z.output<T>[] => {
      if (stryMutAct_9fa48("16382")) {
        {}
      } else {
        stryCov_9fa48("16382");
        const valid: z.output<T>[] = stryMutAct_9fa48("16383") ? ["Stryker was here"] : (stryCov_9fa48("16383"), []);
        let dropped = 0;
        for (const record of records) {
          if (stryMutAct_9fa48("16384")) {
            {}
          } else {
            stryCov_9fa48("16384");
            const parsed = recordSchema.safeParse(record);
            if (stryMutAct_9fa48("16386") ? false : stryMutAct_9fa48("16385") ? true : (stryCov_9fa48("16385", "16386"), parsed.success)) {
              if (stryMutAct_9fa48("16387")) {
                {}
              } else {
                stryCov_9fa48("16387");
                if (stryMutAct_9fa48("16388")) {
                  ;
                } else {
                  stryCov_9fa48("16388");
                  valid.push(parsed.data);
                }
                continue;
              }
            }
            // Only an unknown enum member is tolerated; a missing field or a wrong type is a real contract break.
            if (stryMutAct_9fa48("16391") ? parsed.error.issues.every(issue => issue.code !== "invalid_value") : stryMutAct_9fa48("16390") ? false : stryMutAct_9fa48("16389") ? true : (stryCov_9fa48("16389", "16390", "16391"), parsed.error.issues.some(stryMutAct_9fa48("16392") ? () => undefined : (stryCov_9fa48("16392"), issue => stryMutAct_9fa48("16395") ? issue.code === "invalid_value" : stryMutAct_9fa48("16394") ? false : stryMutAct_9fa48("16393") ? true : (stryCov_9fa48("16393", "16394", "16395"), issue.code !== (stryMutAct_9fa48("16396") ? "" : (stryCov_9fa48("16396"), "invalid_value"))))))) {
              if (stryMutAct_9fa48("16397")) {
                {}
              } else {
                stryCov_9fa48("16397");
                ctx.issues.push(stryMutAct_9fa48("16399") ? {} : (stryCov_9fa48("16399"), {
                  code: stryMutAct_9fa48("16400") ? "" : (stryCov_9fa48("16400"), "custom"),
                  message: stryMutAct_9fa48("16401") ? `` : (stryCov_9fa48("16401"), `Registro ${resource} malformado`),
                  input: record
                }));
                return z.NEVER;
              }
            }
            stryMutAct_9fa48("16402") ? dropped -= 1 : (stryCov_9fa48("16402"), dropped += 1);
            recordTelemetryEvent(stryMutAct_9fa48("16404") ? {} : (stryCov_9fa48("16404"), {
              name: stryMutAct_9fa48("16405") ? "" : (stryCov_9fa48("16405"), "request_malformed_response"),
              resource
            }));
            const {
              id,
              status
            } = (typeof record === "object" && record ? record : {}) as {
              id?: unknown;
              status?: unknown;
            };
            console.warn(stryMutAct_9fa48("16407") ? `` : (stryCov_9fa48("16407"), `Registro ${resource} ${String(stryMutAct_9fa48("16408") ? id && "?" : (stryCov_9fa48("16408"), id ?? (stryMutAct_9fa48("16409") ? "" : (stryCov_9fa48("16409"), "?"))))} descartado: no respeta el contrato (status: ${String(stryMutAct_9fa48("16410") ? status && "?" : (stryCov_9fa48("16410"), status ?? (stryMutAct_9fa48("16411") ? "" : (stryCov_9fa48("16411"), "?"))))}).`));
          }
        }
        if (stryMutAct_9fa48("16412")) {
          ;
        } else {
          stryCov_9fa48("16412");
          droppedByPage.set(valid, dropped);
        }
        return valid;
      }
    });
  }
}