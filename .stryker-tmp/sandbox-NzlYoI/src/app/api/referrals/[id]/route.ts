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
import { backendMode, errorResponse, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { getScenario } from "@/lib/scenarios";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { repairRequestSchema } from "@/lib/repair-requests";
import { referralFromBackendRepairRequest, referralFromStreetClosureRequest, isReferralVisibleToScenario, isReferralVisibleToBackendSources } from "@/lib/referrals";
import { streetClosureRequestSchema } from "@/lib/street-closure-requests";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { backendReferralSourceIds, findFixtureReferral } from "../route";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("3385")) {
    {}
  } else {
    stryCov_9fa48("3385");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3386")) {
        {}
      } else {
        stryCov_9fa48("3386");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("3389") ? scenario.actor.kind !== "OFFICE" || scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3388") ? false : stryMutAct_9fa48("3387") ? true : (stryCov_9fa48("3387", "3388", "3389"), (stryMutAct_9fa48("3391") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("3390") ? true : (stryCov_9fa48("3390", "3391"), scenario.actor.kind !== (stryMutAct_9fa48("3392") ? "" : (stryCov_9fa48("3392"), "OFFICE")))) && (stryMutAct_9fa48("3394") ? scenario.actor.kind === "FIELD" : stryMutAct_9fa48("3393") ? true : (stryCov_9fa48("3393", "3394"), scenario.actor.kind !== (stryMutAct_9fa48("3395") ? "" : (stryCov_9fa48("3395"), "FIELD")))))) {
          if (stryMutAct_9fa48("3396")) {
            {}
          } else {
            stryCov_9fa48("3396");
            return errorResponse(403, stryMutAct_9fa48("3397") ? "" : (stryCov_9fa48("3397"), "Solo Oficina o Campo puede consultar derivaciones."), path);
          }
        }
        const useBackend = backendMode(session);
        if (stryMutAct_9fa48("3400") ? useBackend && scenario.actor.kind === "FIELD" || !session.crew?.id : stryMutAct_9fa48("3399") ? false : stryMutAct_9fa48("3398") ? true : (stryCov_9fa48("3398", "3399", "3400"), (stryMutAct_9fa48("3402") ? useBackend || scenario.actor.kind === "FIELD" : stryMutAct_9fa48("3401") ? true : (stryCov_9fa48("3401", "3402"), useBackend && (stryMutAct_9fa48("3404") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3403") ? true : (stryCov_9fa48("3403", "3404"), scenario.actor.kind === (stryMutAct_9fa48("3405") ? "" : (stryCov_9fa48("3405"), "FIELD")))))) && (stryMutAct_9fa48("3406") ? session.crew?.id : (stryCov_9fa48("3406"), !(stryMutAct_9fa48("3407") ? session.crew.id : (stryCov_9fa48("3407"), session.crew?.id)))))) {
          if (stryMutAct_9fa48("3408")) {
            {}
          } else {
            stryCov_9fa48("3408");
            return errorResponse(403, stryMutAct_9fa48("3409") ? "" : (stryCov_9fa48("3409"), "Solo puede consultar derivaciones de su cuadrilla."), path);
          }
        }
        let referral = useBackend ? null : findFixtureReferral(id);
        if (stryMutAct_9fa48("3411") ? false : stryMutAct_9fa48("3410") ? true : (stryCov_9fa48("3410", "3411"), useBackend)) {
          if (stryMutAct_9fa48("3412")) {
            {}
          } else {
            stryCov_9fa48("3412");
            for (const kind of ["repair-requests", "street-closure-requests"] as const) {
              if (stryMutAct_9fa48("3413")) {
                {}
              } else {
                stryCov_9fa48("3413");
                const backendResponse = await fetchBackend(request, stryMutAct_9fa48("3414") ? `` : (stryCov_9fa48("3414"), `/${kind}/${pathId(id)}`));
                if (stryMutAct_9fa48("3417") ? backendResponse.status !== 404 : stryMutAct_9fa48("3416") ? false : stryMutAct_9fa48("3415") ? true : (stryCov_9fa48("3415", "3416", "3417"), backendResponse.status === 404)) continue;
                if (stryMutAct_9fa48("3420") ? false : stryMutAct_9fa48("3419") ? true : stryMutAct_9fa48("3418") ? backendResponse.ok : (stryCov_9fa48("3418", "3419", "3420"), !backendResponse.ok)) return forwardResponse(backendResponse, path);
                const payload = await backendResponse.text();
                let backendPayload: unknown;
                try {
                  if (stryMutAct_9fa48("3421")) {
                    {}
                  } else {
                    stryCov_9fa48("3421");
                    backendPayload = JSON.parse(payload) as unknown;
                  }
                } catch {
                  if (stryMutAct_9fa48("3422")) {
                    {}
                  } else {
                    stryCov_9fa48("3422");
                    return errorResponse(502, stryMutAct_9fa48("3423") ? "" : (stryCov_9fa48("3423"), "No se pudo obtener la derivación. Reintente en unos segundos."), path);
                  }
                }
                if (stryMutAct_9fa48("3426") ? kind !== "repair-requests" : stryMutAct_9fa48("3425") ? false : stryMutAct_9fa48("3424") ? true : (stryCov_9fa48("3424", "3425", "3426"), kind === (stryMutAct_9fa48("3427") ? "" : (stryCov_9fa48("3427"), "repair-requests")))) {
                  if (stryMutAct_9fa48("3428")) {
                    {}
                  } else {
                    stryCov_9fa48("3428");
                    const parsed = repairRequestSchema.safeParse(backendPayload);
                    if (stryMutAct_9fa48("3430") ? false : stryMutAct_9fa48("3429") ? true : (stryCov_9fa48("3429", "3430"), parsed.success)) referral = referralFromBackendRepairRequest(parsed.data);else return contractMismatch(kind, id, parsed.error, path);
                  }
                } else {
                  if (stryMutAct_9fa48("3431")) {
                    {}
                  } else {
                    stryCov_9fa48("3431");
                    const parsed = streetClosureRequestSchema.safeParse(backendPayload);
                    if (stryMutAct_9fa48("3433") ? false : stryMutAct_9fa48("3432") ? true : (stryCov_9fa48("3432", "3433"), parsed.success)) referral = referralFromStreetClosureRequest(parsed.data);else return contractMismatch(kind, id, parsed.error, path);
                  }
                }
                break;
              }
            }
          }
        }
        const sourceIds = (stryMutAct_9fa48("3436") ? useBackend && referral || scenario.actor.kind === "FIELD" : stryMutAct_9fa48("3435") ? false : stryMutAct_9fa48("3434") ? true : (stryCov_9fa48("3434", "3435", "3436"), (stryMutAct_9fa48("3438") ? useBackend || referral : stryMutAct_9fa48("3437") ? true : (stryCov_9fa48("3437", "3438"), useBackend && referral)) && (stryMutAct_9fa48("3440") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3439") ? true : (stryCov_9fa48("3439", "3440"), scenario.actor.kind === (stryMutAct_9fa48("3441") ? "" : (stryCov_9fa48("3441"), "FIELD")))))) ? await backendReferralSourceIds(request, session.crew!.id) : undefined;
        const visible = stryMutAct_9fa48("3444") ? referral || (useBackend ? isReferralVisibleToBackendSources(referral, sourceIds) : isReferralVisibleToScenario(referral, scenario)) : stryMutAct_9fa48("3443") ? false : stryMutAct_9fa48("3442") ? true : (stryCov_9fa48("3442", "3443", "3444"), referral && (useBackend ? isReferralVisibleToBackendSources(referral, sourceIds) : isReferralVisibleToScenario(referral, scenario)));
        if (stryMutAct_9fa48("3447") ? !referral && !visible : stryMutAct_9fa48("3446") ? false : stryMutAct_9fa48("3445") ? true : (stryCov_9fa48("3445", "3446", "3447"), (stryMutAct_9fa48("3448") ? referral : (stryCov_9fa48("3448"), !referral)) || (stryMutAct_9fa48("3449") ? visible : (stryCov_9fa48("3449"), !visible)))) {
          if (stryMutAct_9fa48("3450")) {
            {}
          } else {
            stryCov_9fa48("3450");
            return errorResponse(404, stryMutAct_9fa48("3451") ? "" : (stryCov_9fa48("3451"), "La derivación no existe o no está disponible para esta sesión."), path);
          }
        }
        return Response.json(referral);
      }
    } catch (error) {
      if (stryMutAct_9fa48("3452")) {
        {}
      } else {
        stryCov_9fa48("3452");
        if (stryMutAct_9fa48("3454") ? false : stryMutAct_9fa48("3453") ? true : (stryCov_9fa48("3453", "3454"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("3455") ? "" : (stryCov_9fa48("3455"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("3457") ? false : stryMutAct_9fa48("3456") ? true : (stryCov_9fa48("3456", "3457"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("3458") ? "" : (stryCov_9fa48("3458"), "No se pudo cargar la derivación."));
      }
    }
  }
}
function contractMismatch(kind: string, id: string, error: {
  issues: {
    message: string;
  }[];
}, path: string) {
  if (stryMutAct_9fa48("3459")) {
    {}
  } else {
    stryCov_9fa48("3459");
    console.warn(stryMutAct_9fa48("3461") ? `` : (stryCov_9fa48("3461"), `Derivación ${kind} ${id}: la respuesta del backend no respeta el contrato.`), error.issues.map(stryMutAct_9fa48("3462") ? () => undefined : (stryCov_9fa48("3462"), issue => issue.message)));
    return errorResponse(502, stryMutAct_9fa48("3463") ? "" : (stryCov_9fa48("3463"), "No se pudo mostrar la derivación. Comuníquese con el administrador del sistema."), path);
  }
}