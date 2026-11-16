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
import { backendMode, errorResponse, mapSessionError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getRepairRequestFixture, repairRequestFixtures } from "@/lib/repair-request-fixtures";
import { getReferralSourceServiceIds, isReferralVisibleToScenario, isReferralVisibleToBackendSources, referralFromRepairRequest, referralFromBackendRepairRequest, referralFromStreetClosureRequest, type Referral } from "@/lib/referrals";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { repairRequestSchema } from "@/lib/repair-requests";
import { streetClosureRequestSchema } from "@/lib/street-closure-requests";
import { getStreetClosureRequestFixture, streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
export function fixtureReferrals(): Referral[] {
  if (stryMutAct_9fa48("3233")) {
    {}
  } else {
    stryCov_9fa48("3233");
    return stryMutAct_9fa48("3234") ? [...repairRequestFixtures.map(referralFromRepairRequest), ...streetClosureRequestFixtures.map(referralFromStreetClosureRequest)] : (stryCov_9fa48("3234"), (stryMutAct_9fa48("3235") ? [] : (stryCov_9fa48("3235"), [...repairRequestFixtures.map(referralFromRepairRequest), ...streetClosureRequestFixtures.map(referralFromStreetClosureRequest)])).sort(stryMutAct_9fa48("3236") ? () => undefined : (stryCov_9fa48("3236"), (left, right) => stryMutAct_9fa48("3237") ? Date.parse(right.updatedAt) + Date.parse(left.updatedAt) : (stryCov_9fa48("3237"), Date.parse(right.updatedAt) - Date.parse(left.updatedAt)))));
  }
}
export function referralsForScenario(scenario: ReturnType<typeof getScenario>): Referral[] {
  if (stryMutAct_9fa48("3238")) {
    {}
  } else {
    stryCov_9fa48("3238");
    const serviceIds = getReferralSourceServiceIds(scenario);
    return stryMutAct_9fa48("3239") ? fixtureReferrals() : (stryCov_9fa48("3239"), fixtureReferrals().filter(stryMutAct_9fa48("3240") ? () => undefined : (stryCov_9fa48("3240"), referral => stryMutAct_9fa48("3243") ? serviceIds === undefined && isReferralVisibleToScenario(referral, scenario) : stryMutAct_9fa48("3242") ? false : stryMutAct_9fa48("3241") ? true : (stryCov_9fa48("3241", "3242", "3243"), (stryMutAct_9fa48("3245") ? serviceIds !== undefined : stryMutAct_9fa48("3244") ? false : (stryCov_9fa48("3244", "3245"), serviceIds === undefined)) || isReferralVisibleToScenario(referral, scenario)))));
  }
}

/**
 * Strict by default: any invalid record fails the collection. With `onInvalid` each record is
 * validated on its own and invalid ones are reported and dropped, so one unknown value (e.g. a new
 * backend enum member) cannot take down the rest of the list.
 */
export async function backendCollection<T>(request: Request, path: string, recordSchema: z.ZodType<T>, onInvalid?: (record: unknown) => void): Promise<T[]> {
  if (stryMutAct_9fa48("3246")) {
    {}
  } else {
    stryCov_9fa48("3246");
    const pageSchema = z.object(stryMutAct_9fa48("3247") ? {} : (stryCov_9fa48("3247"), {
      data: z.array(onInvalid ? z.unknown() : recordSchema),
      meta: z.object(stryMutAct_9fa48("3248") ? {} : (stryCov_9fa48("3248"), {
        total: z.number().int().nonnegative(),
        page: z.number().int().positive(),
        pageSize: stryMutAct_9fa48("3249") ? z.number().int().positive().min(100) : (stryCov_9fa48("3249"), z.number().int().positive().max(100)),
        totalPages: z.number().int().nonnegative()
      }))
    }));
    const records: T[] = stryMutAct_9fa48("3250") ? ["Stryker was here"] : (stryCov_9fa48("3250"), []);
    for (let page = 1; stryMutAct_9fa48("3253") ? page > 50 : stryMutAct_9fa48("3252") ? page < 50 : stryMutAct_9fa48("3251") ? false : (stryCov_9fa48("3251", "3252", "3253"), page <= 50); stryMutAct_9fa48("3254") ? page -= 1 : (stryCov_9fa48("3254"), page += 1)) {
      if (stryMutAct_9fa48("3255")) {
        {}
      } else {
        stryCov_9fa48("3255");
        const query = new URLSearchParams(path.split(stryMutAct_9fa48("3256") ? "" : (stryCov_9fa48("3256"), "?"))[1]);
        query.set(stryMutAct_9fa48("3258") ? "" : (stryCov_9fa48("3258"), "page"), String(page));
        query.set(stryMutAct_9fa48("3260") ? "" : (stryCov_9fa48("3260"), "pageSize"), stryMutAct_9fa48("3261") ? "" : (stryCov_9fa48("3261"), "100"));
        const response = await fetchBackend(request, stryMutAct_9fa48("3262") ? `` : (stryCov_9fa48("3262"), `${path.split(stryMutAct_9fa48("3263") ? "" : (stryCov_9fa48("3263"), "?"))[0]}?${query}`));
        if (stryMutAct_9fa48("3266") ? false : stryMutAct_9fa48("3265") ? true : stryMutAct_9fa48("3264") ? response.ok : (stryCov_9fa48("3264", "3265", "3266"), !response.ok)) throw new Error(stryMutAct_9fa48("3268") ? `` : (stryCov_9fa48("3268"), `Backend respondió ${response.status} al consultar derivaciones.`));
        const payload = pageSchema.parse(await response.json());
        for (const record of payload.data) {
          if (stryMutAct_9fa48("3269")) {
            {}
          } else {
            stryCov_9fa48("3269");
            if (stryMutAct_9fa48("3272") ? false : stryMutAct_9fa48("3271") ? true : stryMutAct_9fa48("3270") ? onInvalid : (stryCov_9fa48("3270", "3271", "3272"), !onInvalid)) {
              if (stryMutAct_9fa48("3273")) {
                {}
              } else {
                stryCov_9fa48("3273");
                if (stryMutAct_9fa48("3274")) {
                  ;
                } else {
                  stryCov_9fa48("3274");
                  records.push(record as T);
                }
                continue;
              }
            }
            const parsed = recordSchema.safeParse(record);
            if (stryMutAct_9fa48("3276") ? false : stryMutAct_9fa48("3275") ? true : (stryCov_9fa48("3275", "3276"), parsed.success)) {
              if (stryMutAct_9fa48("3277")) {
                ;
              } else {
                stryCov_9fa48("3277");
                records.push(parsed.data);
              }
            } else if (stryMutAct_9fa48("3278")) {
              ;
            } else {
              stryCov_9fa48("3278");
              onInvalid(record);
            }
          }
        }
        if (stryMutAct_9fa48("3282") ? page < payload.meta.totalPages : stryMutAct_9fa48("3281") ? page > payload.meta.totalPages : stryMutAct_9fa48("3280") ? false : stryMutAct_9fa48("3279") ? true : (stryCov_9fa48("3279", "3280", "3281", "3282"), page >= payload.meta.totalPages)) return records;
      }
    }
    throw new Error(stryMutAct_9fa48("3284") ? "" : (stryCov_9fa48("3284"), "La consulta de derivaciones superó el límite de páginas."));
  }
}

// Only the four fields the Field scope needs. Not `serviceSchema.pick`: that drags in the closed
// service-status/origin enums, and a new backend value would take down /referrals for Field (#638).
const referralServiceSchema = z.object(stryMutAct_9fa48("3285") ? {} : (stryCov_9fa48("3285"), {
  id: z.string(),
  crewId: z.string().nullable().optional(),
  origin: z.string(),
  inspectionId: z.string().nullable().optional()
})).passthrough();
export async function backendReferralSourceIds(request: Request, crewId: string): Promise<ReadonlySet<string>> {
  if (stryMutAct_9fa48("3286")) {
    {}
  } else {
    stryCov_9fa48("3286");
    const services = await backendCollection(request, stryMutAct_9fa48("3287") ? `` : (stryCov_9fa48("3287"), `/services?crewId=${encodeURIComponent(crewId)}`), referralServiceSchema);
    const sourceIds = new Set<string>();
    for (const service of services) {
      if (stryMutAct_9fa48("3288")) {
        {}
      } else {
        stryCov_9fa48("3288");
        if (stryMutAct_9fa48("3291") ? service.crewId === crewId : stryMutAct_9fa48("3290") ? false : stryMutAct_9fa48("3289") ? true : (stryCov_9fa48("3289", "3290", "3291"), service.crewId !== crewId)) continue;
        if (stryMutAct_9fa48("3292")) {
          ;
        } else {
          stryCov_9fa48("3292");
          sourceIds.add(service.id);
        }
        let inspectionId = service.inspectionId;
        if (stryMutAct_9fa48("3295") ? inspectionId === undefined || service.origin === "INSPECTION" : stryMutAct_9fa48("3294") ? false : stryMutAct_9fa48("3293") ? true : (stryCov_9fa48("3293", "3294", "3295"), (stryMutAct_9fa48("3297") ? inspectionId !== undefined : stryMutAct_9fa48("3296") ? true : (stryCov_9fa48("3296", "3297"), inspectionId === undefined)) && (stryMutAct_9fa48("3299") ? service.origin !== "INSPECTION" : stryMutAct_9fa48("3298") ? true : (stryCov_9fa48("3298", "3299"), service.origin === (stryMutAct_9fa48("3300") ? "" : (stryCov_9fa48("3300"), "INSPECTION")))))) {
          if (stryMutAct_9fa48("3301")) {
            {}
          } else {
            stryCov_9fa48("3301");
            const response = await fetchBackend(request, stryMutAct_9fa48("3302") ? `` : (stryCov_9fa48("3302"), `/services/${pathId(service.id)}`));
            if (stryMutAct_9fa48("3305") ? false : stryMutAct_9fa48("3304") ? true : stryMutAct_9fa48("3303") ? response.ok : (stryCov_9fa48("3303", "3304", "3305"), !response.ok)) throw new Error(stryMutAct_9fa48("3307") ? `` : (stryCov_9fa48("3307"), `Backend respondió ${response.status} al consultar el servicio.`));
            const detail = referralServiceSchema.parse(await response.json());
            if (stryMutAct_9fa48("3310") ? detail.id === service.id || detail.crewId === crewId : stryMutAct_9fa48("3309") ? false : stryMutAct_9fa48("3308") ? true : (stryCov_9fa48("3308", "3309", "3310"), (stryMutAct_9fa48("3312") ? detail.id !== service.id : stryMutAct_9fa48("3311") ? true : (stryCov_9fa48("3311", "3312"), detail.id === service.id)) && (stryMutAct_9fa48("3314") ? detail.crewId !== crewId : stryMutAct_9fa48("3313") ? true : (stryCov_9fa48("3313", "3314"), detail.crewId === crewId)))) inspectionId = detail.inspectionId;
          }
        }
        if (stryMutAct_9fa48("3316") ? false : stryMutAct_9fa48("3315") ? true : (stryCov_9fa48("3315", "3316"), inspectionId)) if (stryMutAct_9fa48("3317")) {
          ;
        } else {
          stryCov_9fa48("3317");
          sourceIds.add(inspectionId);
        }
      }
    }
    return sourceIds;
  }
}
async function backendReferralCollection(request: Request, sourceIds: ReadonlySet<string> | undefined): Promise<{
  referrals: Referral[];
  invalid: number;
}> {
  if (stryMutAct_9fa48("3318")) {
    {}
  } else {
    stryCov_9fa48("3318");
    let invalid = 0;
    const skip = stryMutAct_9fa48("3319") ? () => undefined : (stryCov_9fa48("3319"), (() => {
      const skip = (resource: string) => (record: unknown) => {
        if (stryMutAct_9fa48("3320")) {
          {}
        } else {
          stryCov_9fa48("3320");
          stryMutAct_9fa48("3321") ? invalid -= 1 : (stryCov_9fa48("3321"), invalid += 1);
          const {
            id,
            status
          } = (record ?? {}) as {
            id?: unknown;
            status?: unknown;
          };
          console.warn(stryMutAct_9fa48("3323") ? `` : (stryCov_9fa48("3323"), `Derivación ${resource} ${String(stryMutAct_9fa48("3324") ? id && "?" : (stryCov_9fa48("3324"), id ?? (stryMutAct_9fa48("3325") ? "" : (stryCov_9fa48("3325"), "?"))))} descartada: no respeta el contrato (status: ${String(stryMutAct_9fa48("3326") ? status && "?" : (stryCov_9fa48("3326"), status ?? (stryMutAct_9fa48("3327") ? "" : (stryCov_9fa48("3327"), "?"))))}).`));
        }
      };
      return skip;
    })());
    const [repairs, closures] = await Promise.all(stryMutAct_9fa48("3328") ? [] : (stryCov_9fa48("3328"), [backendCollection(request, stryMutAct_9fa48("3329") ? "" : (stryCov_9fa48("3329"), "/repair-requests"), repairRequestSchema, skip(stryMutAct_9fa48("3330") ? "" : (stryCov_9fa48("3330"), "repair-request"))), backendCollection(request, stryMutAct_9fa48("3331") ? "" : (stryCov_9fa48("3331"), "/street-closure-requests"), streetClosureRequestSchema, skip(stryMutAct_9fa48("3332") ? "" : (stryCov_9fa48("3332"), "street-closure-request")))]));
    const referrals = stryMutAct_9fa48("3334") ? [...repairs.map(referralFromBackendRepairRequest), ...closures.map(referralFromStreetClosureRequest)].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)) : stryMutAct_9fa48("3333") ? [...repairs.map(referralFromBackendRepairRequest), ...closures.map(referralFromStreetClosureRequest)].filter(referral => isReferralVisibleToBackendSources(referral, sourceIds)) : (stryCov_9fa48("3333", "3334"), (stryMutAct_9fa48("3335") ? [] : (stryCov_9fa48("3335"), [...repairs.map(referralFromBackendRepairRequest), ...closures.map(referralFromStreetClosureRequest)])).filter(stryMutAct_9fa48("3336") ? () => undefined : (stryCov_9fa48("3336"), referral => isReferralVisibleToBackendSources(referral, sourceIds))).sort(stryMutAct_9fa48("3337") ? () => undefined : (stryCov_9fa48("3337"), (left, right) => stryMutAct_9fa48("3338") ? Date.parse(right.updatedAt) + Date.parse(left.updatedAt) : (stryCov_9fa48("3338"), Date.parse(right.updatedAt) - Date.parse(left.updatedAt)))));
    return stryMutAct_9fa48("3339") ? {} : (stryCov_9fa48("3339"), {
      referrals,
      invalid
    });
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("3340")) {
    {}
  } else {
    stryCov_9fa48("3340");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3341")) {
        {}
      } else {
        stryCov_9fa48("3341");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("3344") ? scenario.actor.kind !== "OFFICE" || scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3343") ? false : stryMutAct_9fa48("3342") ? true : (stryCov_9fa48("3342", "3343", "3344"), (stryMutAct_9fa48("3346") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("3345") ? true : (stryCov_9fa48("3345", "3346"), scenario.actor.kind !== (stryMutAct_9fa48("3347") ? "" : (stryCov_9fa48("3347"), "OFFICE")))) && (stryMutAct_9fa48("3349") ? scenario.actor.kind === "FIELD" : stryMutAct_9fa48("3348") ? true : (stryCov_9fa48("3348", "3349"), scenario.actor.kind !== (stryMutAct_9fa48("3350") ? "" : (stryCov_9fa48("3350"), "FIELD")))))) {
          if (stryMutAct_9fa48("3351")) {
            {}
          } else {
            stryCov_9fa48("3351");
            return errorResponse(403, stryMutAct_9fa48("3352") ? "" : (stryCov_9fa48("3352"), "Solo Oficina o Campo puede consultar derivaciones."), path);
          }
        }
        const useBackend = backendMode(session);
        if (stryMutAct_9fa48("3355") ? useBackend && scenario.actor.kind === "FIELD" || !session.crew?.id : stryMutAct_9fa48("3354") ? false : stryMutAct_9fa48("3353") ? true : (stryCov_9fa48("3353", "3354", "3355"), (stryMutAct_9fa48("3357") ? useBackend || scenario.actor.kind === "FIELD" : stryMutAct_9fa48("3356") ? true : (stryCov_9fa48("3356", "3357"), useBackend && (stryMutAct_9fa48("3359") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3358") ? true : (stryCov_9fa48("3358", "3359"), scenario.actor.kind === (stryMutAct_9fa48("3360") ? "" : (stryCov_9fa48("3360"), "FIELD")))))) && (stryMutAct_9fa48("3361") ? session.crew?.id : (stryCov_9fa48("3361"), !(stryMutAct_9fa48("3362") ? session.crew.id : (stryCov_9fa48("3362"), session.crew?.id)))))) {
          if (stryMutAct_9fa48("3363")) {
            {}
          } else {
            stryCov_9fa48("3363");
            return errorResponse(403, stryMutAct_9fa48("3364") ? "" : (stryCov_9fa48("3364"), "Solo puede consultar derivaciones de su cuadrilla."), path);
          }
        }
        const sourceIds = (stryMutAct_9fa48("3367") ? useBackend || scenario.actor.kind === "FIELD" : stryMutAct_9fa48("3366") ? false : stryMutAct_9fa48("3365") ? true : (stryCov_9fa48("3365", "3366", "3367"), useBackend && (stryMutAct_9fa48("3369") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3368") ? true : (stryCov_9fa48("3368", "3369"), scenario.actor.kind === (stryMutAct_9fa48("3370") ? "" : (stryCov_9fa48("3370"), "FIELD")))))) ? await backendReferralSourceIds(request, session.crew!.id) : undefined;
        const {
          referrals,
          invalid
        } = useBackend ? await backendReferralCollection(request, sourceIds) : stryMutAct_9fa48("3371") ? {} : (stryCov_9fa48("3371"), {
          referrals: referralsForScenario(scenario),
          invalid: 0
        });
        return NextResponse.json(stryMutAct_9fa48("3372") ? {} : (stryCov_9fa48("3372"), {
          data: referrals,
          meta: stryMutAct_9fa48("3373") ? {} : (stryCov_9fa48("3373"), {
            total: referrals.length,
            ...(invalid ? stryMutAct_9fa48("3374") ? {} : (stryCov_9fa48("3374"), {
              invalid
            }) : {})
          })
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3375")) {
        {}
      } else {
        stryCov_9fa48("3375");
        if (stryMutAct_9fa48("3377") ? false : stryMutAct_9fa48("3376") ? true : (stryCov_9fa48("3376", "3377"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("3378") ? "" : (stryCov_9fa48("3378"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("3380") ? false : stryMutAct_9fa48("3379") ? true : (stryCov_9fa48("3379", "3380"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("3381") ? "" : (stryCov_9fa48("3381"), "No se pudieron cargar las derivaciones."));
      }
    }
  }
}
export function findFixtureReferral(id: string): Referral | null {
  if (stryMutAct_9fa48("3382")) {
    {}
  } else {
    stryCov_9fa48("3382");
    const repair = getRepairRequestFixture(id);
    if (stryMutAct_9fa48("3384") ? false : stryMutAct_9fa48("3383") ? true : (stryCov_9fa48("3383", "3384"), repair)) return referralFromRepairRequest(repair);
    const closure = getStreetClosureRequestFixture(id);
    return closure ? referralFromStreetClosureRequest(closure) : null;
  }
}