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
import { authorize, backendMode, errorResponse, forwardResponse, mapSessionError } from "@/lib/bff-route";
import { fetchMe, sealRolesIfChanged } from "@/lib/me";
import { fetchBackend } from "@/lib/bff-backend";
import { roleAssignmentResponseSchema, validatedRoleAssignmentResponse } from "@/lib/role-assignment-bff";
import { getRoles, replacementSchema, setRoles, validUserId } from "@/mocks/role-assignment-fixtures";
import { sessionUserId } from "@/lib/session-actor";
type Context = {
  params: Promise<{
    userId: string;
  }>;
};
async function handle(request: Request, context: Context, method: "GET" | "PUT" | "DELETE") {
  if (stryMutAct_9fa48("3835")) {
    {}
  } else {
    stryCov_9fa48("3835");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3836")) {
        {}
      } else {
        stryCov_9fa48("3836");
        const {
          session
        } = authorize(request, stryMutAct_9fa48("3837") ? {} : (stryCov_9fa48("3837"), {
          capability: stryMutAct_9fa48("3838") ? "" : (stryCov_9fa48("3838"), "role:manage"),
          throwOnError: stryMutAct_9fa48("3839") ? false : (stryCov_9fa48("3839"), true)
        }));
        const {
          userId
        } = await context.params;
        if (stryMutAct_9fa48("3842") ? false : stryMutAct_9fa48("3841") ? true : stryMutAct_9fa48("3840") ? validUserId(userId) : (stryCov_9fa48("3840", "3841", "3842"), !validUserId(userId))) return errorResponse(400, stryMutAct_9fa48("3843") ? "" : (stryCov_9fa48("3843"), "El legajo debe ser numérico."), path);
        let roles: ReturnType<typeof getRoles> = stryMutAct_9fa48("3844") ? ["Stryker was here"] : (stryCov_9fa48("3844"), []);
        if (stryMutAct_9fa48("3847") ? method !== "PUT" : stryMutAct_9fa48("3846") ? false : stryMutAct_9fa48("3845") ? true : (stryCov_9fa48("3845", "3846", "3847"), method === (stryMutAct_9fa48("3848") ? "" : (stryCov_9fa48("3848"), "PUT")))) {
          if (stryMutAct_9fa48("3849")) {
            {}
          } else {
            stryCov_9fa48("3849");
            let body: unknown;
            try {
              if (stryMutAct_9fa48("3850")) {
                {}
              } else {
                stryCov_9fa48("3850");
                body = await request.json();
              }
            } catch {
              if (stryMutAct_9fa48("3851")) {
                {}
              } else {
                stryCov_9fa48("3851");
                return errorResponse(400, stryMutAct_9fa48("3852") ? "" : (stryCov_9fa48("3852"), "El cuerpo no es un JSON válido."), path);
              }
            }
            const parsed = replacementSchema.safeParse(body);
            if (stryMutAct_9fa48("3855") ? false : stryMutAct_9fa48("3854") ? true : stryMutAct_9fa48("3853") ? parsed.success : (stryCov_9fa48("3853", "3854", "3855"), !parsed.success)) return errorResponse(400, stryMutAct_9fa48("3856") ? "" : (stryCov_9fa48("3856"), "La selección de roles no es válida."), path);
            roles = parsed.data.roles;
          }
        }
        if (stryMutAct_9fa48("3858") ? false : stryMutAct_9fa48("3857") ? true : (stryCov_9fa48("3857", "3858"), backendMode(session))) {
          if (stryMutAct_9fa48("3859")) {
            {}
          } else {
            stryCov_9fa48("3859");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("3860") ? `` : (stryCov_9fa48("3860"), `/role-assignments/${userId}`), stryMutAct_9fa48("3861") ? "" : (stryCov_9fa48("3861"), "role:manage"), stryMutAct_9fa48("3862") ? {} : (stryCov_9fa48("3862"), {
              method,
              ...((stryMutAct_9fa48("3865") ? method !== "PUT" : stryMutAct_9fa48("3864") ? false : stryMutAct_9fa48("3863") ? true : (stryCov_9fa48("3863", "3864", "3865"), method === (stryMutAct_9fa48("3866") ? "" : (stryCov_9fa48("3866"), "PUT")))) ? stryMutAct_9fa48("3867") ? {} : (stryCov_9fa48("3867"), {
                headers: stryMutAct_9fa48("3868") ? {} : (stryCov_9fa48("3868"), {
                  "content-type": stryMutAct_9fa48("3869") ? "" : (stryCov_9fa48("3869"), "application/json")
                }),
                body: JSON.stringify(stryMutAct_9fa48("3870") ? {} : (stryCov_9fa48("3870"), {
                  roles
                }))
              }) : {})
            }));
            const response = (stryMutAct_9fa48("3873") ? method !== "DELETE" : stryMutAct_9fa48("3872") ? false : stryMutAct_9fa48("3871") ? true : (stryCov_9fa48("3871", "3872", "3873"), method === (stryMutAct_9fa48("3874") ? "" : (stryCov_9fa48("3874"), "DELETE")))) ? forwardResponse(backendResponse, path) : await validatedRoleAssignmentResponse(backendResponse, roleAssignmentResponseSchema, path);
            if (stryMutAct_9fa48("3877") ? method !== "GET" && backendResponse.ok || userId === sessionUserId(session) : stryMutAct_9fa48("3876") ? false : stryMutAct_9fa48("3875") ? true : (stryCov_9fa48("3875", "3876", "3877"), (stryMutAct_9fa48("3879") ? method !== "GET" || backendResponse.ok : stryMutAct_9fa48("3878") ? true : (stryCov_9fa48("3878", "3879"), (stryMutAct_9fa48("3881") ? method === "GET" : stryMutAct_9fa48("3880") ? true : (stryCov_9fa48("3880", "3881"), method !== (stryMutAct_9fa48("3882") ? "" : (stryCov_9fa48("3882"), "GET")))) && backendResponse.ok)) && (stryMutAct_9fa48("3884") ? userId !== sessionUserId(session) : stryMutAct_9fa48("3883") ? true : (stryCov_9fa48("3883", "3884"), userId === sessionUserId(session))))) {
              if (stryMutAct_9fa48("3885")) {
                {}
              } else {
                stryCov_9fa48("3885");
                const me = await fetchMe(request);
                if (stryMutAct_9fa48("3886")) {
                  ;
                } else {
                  stryCov_9fa48("3886");
                  sealRolesIfChanged(response, request, me.roles);
                }
              }
            }
            return response;
          }
        }
        if (stryMutAct_9fa48("3889") ? method !== "GET" : stryMutAct_9fa48("3888") ? false : stryMutAct_9fa48("3887") ? true : (stryCov_9fa48("3887", "3888", "3889"), method === (stryMutAct_9fa48("3890") ? "" : (stryCov_9fa48("3890"), "GET")))) return NextResponse.json(stryMutAct_9fa48("3891") ? {} : (stryCov_9fa48("3891"), {
          userId,
          roles: getRoles(userId)
        }));
        if (stryMutAct_9fa48("3894") ? false : stryMutAct_9fa48("3893") ? true : stryMutAct_9fa48("3892") ? setRoles(userId, roles) : (stryCov_9fa48("3892", "3893", "3894"), !setRoles(userId, roles))) return errorResponse(409, stryMutAct_9fa48("3895") ? "" : (stryCov_9fa48("3895"), "No se puede quitar el último administrador."), path);
        const response = (stryMutAct_9fa48("3898") ? method !== "DELETE" : stryMutAct_9fa48("3897") ? false : stryMutAct_9fa48("3896") ? true : (stryCov_9fa48("3896", "3897", "3898"), method === (stryMutAct_9fa48("3899") ? "" : (stryCov_9fa48("3899"), "DELETE")))) ? new NextResponse(null, stryMutAct_9fa48("3900") ? {} : (stryCov_9fa48("3900"), {
          status: 204
        })) : NextResponse.json(stryMutAct_9fa48("3901") ? {} : (stryCov_9fa48("3901"), {
          userId,
          roles
        }));
        if (stryMutAct_9fa48("3904") ? userId !== sessionUserId(session) : stryMutAct_9fa48("3903") ? false : stryMutAct_9fa48("3902") ? true : (stryCov_9fa48("3902", "3903", "3904"), userId === sessionUserId(session))) if (stryMutAct_9fa48("3905")) {
          ;
        } else {
          stryCov_9fa48("3905");
          sealRolesIfChanged(response, request, roles);
        }
        return response;
      }
    } catch (error) {
      if (stryMutAct_9fa48("3906")) {
        {}
      } else {
        stryCov_9fa48("3906");
        return mapSessionError(error, path, stryMutAct_9fa48("3907") ? "" : (stryCov_9fa48("3907"), "No se pudieron gestionar los roles."));
      }
    }
  }
}
export const GET = stryMutAct_9fa48("3908") ? () => undefined : (stryCov_9fa48("3908"), (() => {
  const GET = (request: Request, context: Context) => handle(request, context, stryMutAct_9fa48("3909") ? "" : (stryCov_9fa48("3909"), "GET"));
  return GET;
})());
export const PUT = stryMutAct_9fa48("3910") ? () => undefined : (stryCov_9fa48("3910"), (() => {
  const PUT = (request: Request, context: Context) => handle(request, context, stryMutAct_9fa48("3911") ? "" : (stryCov_9fa48("3911"), "PUT"));
  return PUT;
})());
export const DELETE = stryMutAct_9fa48("3912") ? () => undefined : (stryCov_9fa48("3912"), (() => {
  const DELETE = (request: Request, context: Context) => handle(request, context, stryMutAct_9fa48("3913") ? "" : (stryCov_9fa48("3913"), "DELETE"));
  return DELETE;
})());