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
import { fetchBackend, isJsonMediaType, pathId } from "./bff-backend";
import { getScenario, type Capability, type OperationalScenario } from "./scenarios";
import { bffPathForResponse } from "./bff-response-path";
import { recordTelemetryEvent } from "./telemetry";
import { AuthUnavailableError, BackendUnavailableError, CitizenForbiddenError, ForbiddenSessionError, AUTH_COOKIE_NAME, InvalidSessionError, getRequiredSession, renewedRequestForResponse, renewedSessionForResponse, requireCapability, sealSession, sessionCookieRemovalOptions, sessionCookieOptions, type Session } from "./session";
const ERROR_LABELS: Record<number, string> = stryMutAct_9fa48("7198") ? {} : (stryCov_9fa48("7198"), {
  400: stryMutAct_9fa48("7199") ? "" : (stryCov_9fa48("7199"), "Bad Request"),
  401: stryMutAct_9fa48("7200") ? "" : (stryCov_9fa48("7200"), "Unauthorized"),
  403: stryMutAct_9fa48("7201") ? "" : (stryCov_9fa48("7201"), "Forbidden"),
  404: stryMutAct_9fa48("7202") ? "" : (stryCov_9fa48("7202"), "Not Found"),
  405: stryMutAct_9fa48("7203") ? "" : (stryCov_9fa48("7203"), "Method Not Allowed"),
  409: stryMutAct_9fa48("7204") ? "" : (stryCov_9fa48("7204"), "Conflict"),
  413: stryMutAct_9fa48("7205") ? "" : (stryCov_9fa48("7205"), "Payload Too Large"),
  415: stryMutAct_9fa48("7206") ? "" : (stryCov_9fa48("7206"), "Unsupported Media Type"),
  422: stryMutAct_9fa48("7207") ? "" : (stryCov_9fa48("7207"), "Unprocessable Entity"),
  429: stryMutAct_9fa48("7208") ? "" : (stryCov_9fa48("7208"), "Too Many Requests"),
  500: stryMutAct_9fa48("7209") ? "" : (stryCov_9fa48("7209"), "Internal Server Error"),
  501: stryMutAct_9fa48("7210") ? "" : (stryCov_9fa48("7210"), "Not Implemented"),
  502: stryMutAct_9fa48("7211") ? "" : (stryCov_9fa48("7211"), "Bad Gateway"),
  503: stryMutAct_9fa48("7212") ? "" : (stryCov_9fa48("7212"), "Service Unavailable"),
  504: stryMutAct_9fa48("7213") ? "" : (stryCov_9fa48("7213"), "Gateway Timeout")
});
export function authorize(request: Request, options: {
  office?: true;
  officeMessage?: string;
  capability: Capability;
  capabilityMessage?: string;
  fallbackMessage?: string;
  throwOnError: true;
}): {
  session: Session;
  scenario: OperationalScenario;
};
export function authorize(request: Request, options: {
  office?: true;
  officeMessage?: string;
  capability: Capability;
  capabilityMessage?: string;
  fallbackMessage?: string;
  throwOnError?: false;
}): {
  session: Session;
  scenario: OperationalScenario;
} | NextResponse;
/** Reuses a session already read by a route while sharing its capability checks. */
export function authorize(session: Session, options: {
  office?: true;
  officeMessage?: string;
  capability: Capability;
  capabilityMessage?: string;
  fallbackMessage?: string;
  throwOnError: true;
}): {
  session: Session;
  scenario: OperationalScenario;
};
export function authorize(requestOrSession: Request | Session, options: {
  office?: true;
  officeMessage?: string;
  capability: Capability;
  capabilityMessage?: string;
  fallbackMessage?: string;
  throwOnError?: boolean;
}): {
  session: Session;
  scenario: OperationalScenario;
} | NextResponse {
  if (stryMutAct_9fa48("7214")) {
    {}
  } else {
    stryCov_9fa48("7214");
    const request = requestOrSession instanceof Request ? requestOrSession : undefined;
    try {
      if (stryMutAct_9fa48("7215")) {
        {}
      } else {
        stryCov_9fa48("7215");
        const session: Session = request ? getRequiredSession(request) : requestOrSession as Session;
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("7218") ? options.office || scenario.actor.kind !== "OFFICE" : stryMutAct_9fa48("7217") ? false : stryMutAct_9fa48("7216") ? true : (stryCov_9fa48("7216", "7217", "7218"), options.office && (stryMutAct_9fa48("7220") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("7219") ? true : (stryCov_9fa48("7219", "7220"), scenario.actor.kind !== (stryMutAct_9fa48("7221") ? "" : (stryCov_9fa48("7221"), "OFFICE")))))) {
          if (stryMutAct_9fa48("7222")) {
            {}
          } else {
            stryCov_9fa48("7222");
            throw new ForbiddenSessionError(stryMutAct_9fa48("7224") ? options.officeMessage && "Esta acción requiere una sesión de Oficina." : (stryCov_9fa48("7224"), options.officeMessage ?? (stryMutAct_9fa48("7225") ? "" : (stryCov_9fa48("7225"), "Esta acción requiere una sesión de Oficina."))));
          }
        }
        if (stryMutAct_9fa48("7228") ? options.capabilityMessage || !scenario.capabilities.includes(options.capability) : stryMutAct_9fa48("7227") ? false : stryMutAct_9fa48("7226") ? true : (stryCov_9fa48("7226", "7227", "7228"), options.capabilityMessage && (stryMutAct_9fa48("7229") ? scenario.capabilities.includes(options.capability) : (stryCov_9fa48("7229"), !scenario.capabilities.includes(options.capability))))) {
          if (stryMutAct_9fa48("7230")) {
            {}
          } else {
            stryCov_9fa48("7230");
            if (stryMutAct_9fa48("7231")) {
              ;
            } else {
              stryCov_9fa48("7231");
              throw new ForbiddenSessionError(options.capabilityMessage);
            }
          }
        }
        if (stryMutAct_9fa48("7232")) {
          ;
        } else {
          stryCov_9fa48("7232");
          requireCapability(session, options.capability);
        }
        return stryMutAct_9fa48("7233") ? {} : (stryCov_9fa48("7233"), {
          session,
          scenario
        });
      }
    } catch (error) {
      if (stryMutAct_9fa48("7234")) {
        {}
      } else {
        stryCov_9fa48("7234");
        if (stryMutAct_9fa48("7236") ? false : stryMutAct_9fa48("7235") ? true : (stryCov_9fa48("7235", "7236"), options.throwOnError)) throw error;
        if (stryMutAct_9fa48("7239") ? false : stryMutAct_9fa48("7238") ? true : stryMutAct_9fa48("7237") ? request : (stryCov_9fa48("7237", "7238", "7239"), !request)) throw error;
        return mapSessionError(error, new URL(request.url).pathname, stryMutAct_9fa48("7240") ? options.fallbackMessage && "No se pudo autorizar la solicitud." : (stryCov_9fa48("7240"), options.fallbackMessage ?? (stryMutAct_9fa48("7241") ? "" : (stryCov_9fa48("7241"), "No se pudo autorizar la solicitud."))));
      }
    }
  }
}
export function backendQuery<T extends object>(query: T, allowedKeys: readonly string[]): string {
  if (stryMutAct_9fa48("7242")) {
    {}
  } else {
    stryCov_9fa48("7242");
    const params = new URLSearchParams();
    const values = query as Record<string, unknown>;
    for (const key of allowedKeys) {
      if (stryMutAct_9fa48("7243")) {
        {}
      } else {
        stryCov_9fa48("7243");
        const value = values[key];
        if (stryMutAct_9fa48("7246") ? (value === undefined || value === null) && value === "" : stryMutAct_9fa48("7245") ? false : stryMutAct_9fa48("7244") ? true : (stryCov_9fa48("7244", "7245", "7246"), (stryMutAct_9fa48("7248") ? value === undefined && value === null : stryMutAct_9fa48("7247") ? false : (stryCov_9fa48("7247", "7248"), (stryMutAct_9fa48("7250") ? value !== undefined : stryMutAct_9fa48("7249") ? false : (stryCov_9fa48("7249", "7250"), value === undefined)) || (stryMutAct_9fa48("7252") ? value !== null : stryMutAct_9fa48("7251") ? false : (stryCov_9fa48("7251", "7252"), value === null)))) || (stryMutAct_9fa48("7254") ? value !== "" : stryMutAct_9fa48("7253") ? false : (stryCov_9fa48("7253", "7254"), value === (stryMutAct_9fa48("7255") ? "Stryker was here!" : (stryCov_9fa48("7255"), "")))))) continue;
        if (stryMutAct_9fa48("7257") ? false : stryMutAct_9fa48("7256") ? true : (stryCov_9fa48("7256", "7257"), Array.isArray(value))) {
          if (stryMutAct_9fa48("7258")) {
            {}
          } else {
            stryCov_9fa48("7258");
            for (const item of value) if (stryMutAct_9fa48("7259")) {
              ;
            } else {
              stryCov_9fa48("7259");
              params.append(key, String(item));
            }
          }
        } else {
          if (stryMutAct_9fa48("7260")) {
            {}
          } else {
            stryCov_9fa48("7260");
            if (stryMutAct_9fa48("7261")) {
              ;
            } else {
              stryCov_9fa48("7261");
              params.set(key, String(value));
            }
          }
        }
      }
    }
    const value = params.toString();
    return value ? stryMutAct_9fa48("7262") ? `` : (stryCov_9fa48("7262"), `?${value}`) : stryMutAct_9fa48("7263") ? "Stryker was here!" : (stryCov_9fa48("7263"), "");
  }
}

// Scope checks need the ownership fields, not the view adapter's enriched Service.
// Preserve the remaining wire fields so callers can reuse this single read.
const crewScopedServiceSchema = z.object(stryMutAct_9fa48("7264") ? {} : (stryCov_9fa48("7264"), {
  id: z.string(),
  crewId: z.string().nullable().optional()
})).passthrough();
export type CrewScopedService = z.infer<typeof crewScopedServiceSchema>;

/** Office has no crew restriction; undefined means no scope lookup was necessary. */
export async function requireCrewScope(request: Request, session: Session, {
  serviceId
}: {
  serviceId: string;
}): Promise<CrewScopedService | NextResponse | undefined> {
  if (stryMutAct_9fa48("7265")) {
    {}
  } else {
    stryCov_9fa48("7265");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("7266")) {
        {}
      } else {
        stryCov_9fa48("7266");
        const useBackend = backendMode(session);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("7269") ? scenario.actor.kind !== "OFFICE" : stryMutAct_9fa48("7268") ? false : stryMutAct_9fa48("7267") ? true : (stryCov_9fa48("7267", "7268", "7269"), scenario.actor.kind === (stryMutAct_9fa48("7270") ? "" : (stryCov_9fa48("7270"), "OFFICE")))) return undefined;
        const crewId = useBackend ? stryMutAct_9fa48("7271") ? session.crew.id : (stryCov_9fa48("7271"), session.crew?.id) : scenario.actor.crewId;
        if (stryMutAct_9fa48("7274") ? scenario.actor.kind !== "FIELD" && !crewId : stryMutAct_9fa48("7273") ? false : stryMutAct_9fa48("7272") ? true : (stryCov_9fa48("7272", "7273", "7274"), (stryMutAct_9fa48("7276") ? scenario.actor.kind === "FIELD" : stryMutAct_9fa48("7275") ? false : (stryCov_9fa48("7275", "7276"), scenario.actor.kind !== (stryMutAct_9fa48("7277") ? "" : (stryCov_9fa48("7277"), "FIELD")))) || (stryMutAct_9fa48("7278") ? crewId : (stryCov_9fa48("7278"), !crewId)))) {
          if (stryMutAct_9fa48("7279")) {
            {}
          } else {
            stryCov_9fa48("7279");
            return errorResponse(403, stryMutAct_9fa48("7280") ? "" : (stryCov_9fa48("7280"), "El servicio no pertenece a la cuadrilla asignada a este usuario."), path, FORBIDDEN_CODES.notAssigned);
          }
        }
        let service: CrewScopedService;
        if (stryMutAct_9fa48("7282") ? false : stryMutAct_9fa48("7281") ? true : (stryCov_9fa48("7281", "7282"), useBackend)) {
          if (stryMutAct_9fa48("7283")) {
            {}
          } else {
            stryCov_9fa48("7283");
            const response = await fetchBackend(request, stryMutAct_9fa48("7284") ? `` : (stryCov_9fa48("7284"), `/services/${pathId(serviceId)}`));
            if (stryMutAct_9fa48("7287") ? false : stryMutAct_9fa48("7286") ? true : stryMutAct_9fa48("7285") ? response.ok : (stryCov_9fa48("7285", "7286", "7287"), !response.ok)) return forwardResponse(response);
            const payload: unknown = await response.json().catch(() => undefined);
            const parsed = crewScopedServiceSchema.safeParse(payload);
            if (stryMutAct_9fa48("7290") ? false : stryMutAct_9fa48("7289") ? true : stryMutAct_9fa48("7288") ? parsed.success : (stryCov_9fa48("7288", "7289", "7290"), !parsed.success)) {
              if (stryMutAct_9fa48("7291")) {
                {}
              } else {
                stryCov_9fa48("7291");
                return errorResponse(502, stryMutAct_9fa48("7292") ? "" : (stryCov_9fa48("7292"), "No se pudo obtener información válida del servicio. Reintente en unos segundos."), path);
              }
            }
            service = parsed.data;
          }
        } else {
          if (stryMutAct_9fa48("7293")) {
            {}
          } else {
            stryCov_9fa48("7293");
            const {
              serviceFixtures
            } = await import("./services-fixtures");
            const fixture = serviceFixtures.find(stryMutAct_9fa48("7294") ? () => undefined : (stryCov_9fa48("7294"), candidate => stryMutAct_9fa48("7297") ? candidate.id !== serviceId : stryMutAct_9fa48("7296") ? false : stryMutAct_9fa48("7295") ? true : (stryCov_9fa48("7295", "7296", "7297"), candidate.id === serviceId)));
            if (stryMutAct_9fa48("7300") ? false : stryMutAct_9fa48("7299") ? true : stryMutAct_9fa48("7298") ? fixture : (stryCov_9fa48("7298", "7299", "7300"), !fixture)) return errorResponse(404, stryMutAct_9fa48("7301") ? `` : (stryCov_9fa48("7301"), `Servicio ${serviceId} no encontrado.`), path);
            service = fixture;
          }
        }
        if (stryMutAct_9fa48("7304") ? service.crewId === crewId : stryMutAct_9fa48("7303") ? false : stryMutAct_9fa48("7302") ? true : (stryCov_9fa48("7302", "7303", "7304"), service.crewId !== crewId)) {
          if (stryMutAct_9fa48("7305")) {
            {}
          } else {
            stryCov_9fa48("7305");
            return errorResponse(403, stryMutAct_9fa48("7306") ? "" : (stryCov_9fa48("7306"), "El servicio no pertenece a la cuadrilla asignada a este usuario."), path, FORBIDDEN_CODES.notAssigned);
          }
        }
        return service;
      }
    } catch (error) {
      if (stryMutAct_9fa48("7307")) {
        {}
      } else {
        stryCov_9fa48("7307");
        return mapSessionError(error, path, stryMutAct_9fa48("7308") ? "" : (stryCov_9fa48("7308"), "No se pudo verificar la cuadrilla del servicio."));
      }
    }
  }
}
export function backendMode(session: Pick<Session, "mode">): boolean {
  if (stryMutAct_9fa48("7309")) {
    {}
  } else {
    stryCov_9fa48("7309");
    if (stryMutAct_9fa48("7312") ? session.mode !== "mock" : stryMutAct_9fa48("7311") ? false : stryMutAct_9fa48("7310") ? true : (stryCov_9fa48("7310", "7311", "7312"), session.mode === (stryMutAct_9fa48("7313") ? "" : (stryCov_9fa48("7313"), "mock")))) return stryMutAct_9fa48("7314") ? true : (stryCov_9fa48("7314"), false);
    if (stryMutAct_9fa48("7317") ? false : stryMutAct_9fa48("7316") ? true : stryMutAct_9fa48("7315") ? process.env.M6_BACKEND_ORIGIN : (stryCov_9fa48("7315", "7316", "7317"), !process.env.M6_BACKEND_ORIGIN)) {
      if (stryMutAct_9fa48("7318")) {
        {}
      } else {
        stryCov_9fa48("7318");
        throw new AuthUnavailableError(stryMutAct_9fa48("7320") ? "" : (stryCov_9fa48("7320"), "El sistema no está disponible. Comuníquese con el administrador del sistema."));
      }
    }
    return stryMutAct_9fa48("7321") ? false : (stryCov_9fa48("7321"), true);
  }
}

/** Códigos estables de un 403 (cuerpo `code`): lo que permite al cliente distinguir una denegación de otra. */
export const FORBIDDEN_CODES = {
  roleRequired: "ROLE_REQUIRED",
  notAssigned: "NOT_ASSIGNED"
} as const;
export function errorResponse(status: number, message: string, path: string, code?: string): NextResponse {
  if (stryMutAct_9fa48("7322")) {
    {}
  } else {
    stryCov_9fa48("7322");
    return NextResponse.json(stryMutAct_9fa48("7323") ? {} : (stryCov_9fa48("7323"), {
      statusCode: status,
      message,
      error: stryMutAct_9fa48("7324") ? ERROR_LABELS[status] && "Error" : (stryCov_9fa48("7324"), ERROR_LABELS[status] ?? (stryMutAct_9fa48("7325") ? "" : (stryCov_9fa48("7325"), "Error"))),
      ...(code ? stryMutAct_9fa48("7326") ? {} : (stryCov_9fa48("7326"), {
        code
      }) : {}),
      timestamp: new Date().toISOString(),
      path
    }), stryMutAct_9fa48("7327") ? {} : (stryCov_9fa48("7327"), {
      status
    }));
  }
}
export function mapSessionError(error: unknown, path: string, fallbackMessage: string): NextResponse {
  if (stryMutAct_9fa48("7328")) {
    {}
  } else {
    stryCov_9fa48("7328");
    if (stryMutAct_9fa48("7330") ? false : stryMutAct_9fa48("7329") ? true : (stryCov_9fa48("7329", "7330"), error instanceof InvalidSessionError)) {
      if (stryMutAct_9fa48("7331")) {
        {}
      } else {
        stryCov_9fa48("7331");
        const rejected = errorResponse(401, stryMutAct_9fa48("7332") ? "" : (stryCov_9fa48("7332"), "La sesión no está activa."), path);
        rejected.cookies.set(AUTH_COOKIE_NAME, stryMutAct_9fa48("7334") ? "Stryker was here!" : (stryCov_9fa48("7334"), ""), sessionCookieRemovalOptions());
        return rejected;
      }
    }
    if (stryMutAct_9fa48("7336") ? false : stryMutAct_9fa48("7335") ? true : (stryCov_9fa48("7335", "7336"), error instanceof CitizenForbiddenError)) {
      if (stryMutAct_9fa48("7337")) {
        {}
      } else {
        stryCov_9fa48("7337");
        return errorResponse(403, error.message, path);
      }
    }
    if (stryMutAct_9fa48("7339") ? false : stryMutAct_9fa48("7338") ? true : (stryCov_9fa48("7338", "7339"), error instanceof ForbiddenSessionError)) {
      if (stryMutAct_9fa48("7340")) {
        {}
      } else {
        stryCov_9fa48("7340");
        return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
      }
    }
    if (stryMutAct_9fa48("7342") ? false : stryMutAct_9fa48("7341") ? true : (stryCov_9fa48("7341", "7342"), error instanceof AuthUnavailableError)) {
      if (stryMutAct_9fa48("7343")) {
        {}
      } else {
        stryCov_9fa48("7343");
        return errorResponse(503, error.message, path);
      }
    }
    if (stryMutAct_9fa48("7345") ? false : stryMutAct_9fa48("7344") ? true : (stryCov_9fa48("7344", "7345"), error instanceof BackendUnavailableError)) {
      if (stryMutAct_9fa48("7346")) {
        {}
      } else {
        stryCov_9fa48("7346");
        return errorResponse(503, error.message, path);
      }
    }
    return errorResponse(500, fallbackMessage, path);
  }
}

/**
 * Respuesta de error común del `catch` de los Route Handlers: sesión inactiva (401, con telemetría),
 * autenticación no disponible (503) o el mapeo de `mapSessionError`.
 */
export function handleRouteError(error: unknown, path: string, fallbackMessage: string): NextResponse {
  if (stryMutAct_9fa48("7347")) {
    {}
  } else {
    stryCov_9fa48("7347");
    if (stryMutAct_9fa48("7349") ? false : stryMutAct_9fa48("7348") ? true : (stryCov_9fa48("7348", "7349"), error instanceof InvalidSessionError)) {
      if (stryMutAct_9fa48("7350")) {
        {}
      } else {
        stryCov_9fa48("7350");
        recordTelemetryEvent(stryMutAct_9fa48("7352") ? {} : (stryCov_9fa48("7352"), {
          name: stryMutAct_9fa48("7353") ? "" : (stryCov_9fa48("7353"), "auth_session_expired"),
          status: 401
        }));
        return errorResponse(401, stryMutAct_9fa48("7354") ? "" : (stryCov_9fa48("7354"), "La sesión no está activa."), path);
      }
    }
    if (stryMutAct_9fa48("7356") ? false : stryMutAct_9fa48("7355") ? true : (stryCov_9fa48("7355", "7356"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, fallbackMessage);
  }
}

/**
 * Lee el cuerpo JSON y lo valida con `schema`. Devuelve `{ data }` o el error 400 de Problem Details
 * (JSON inválido, o los mensajes del esquema unidos por espacios).
 */
export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S, path: string): Promise<{
  data: z.output<S>;
} | NextResponse> {
  if (stryMutAct_9fa48("7357")) {
    {}
  } else {
    stryCov_9fa48("7357");
    let body: unknown;
    try {
      if (stryMutAct_9fa48("7358")) {
        {}
      } else {
        stryCov_9fa48("7358");
        body = await request.json();
      }
    } catch {
      if (stryMutAct_9fa48("7359")) {
        {}
      } else {
        stryCov_9fa48("7359");
        return errorResponse(400, stryMutAct_9fa48("7360") ? "" : (stryCov_9fa48("7360"), "El cuerpo de la solicitud no es un JSON válido."), path);
      }
    }
    const parsed = schema.safeParse(body);
    if (stryMutAct_9fa48("7363") ? false : stryMutAct_9fa48("7362") ? true : stryMutAct_9fa48("7361") ? parsed.success : (stryCov_9fa48("7361", "7362", "7363"), !parsed.success)) {
      if (stryMutAct_9fa48("7364")) {
        {}
      } else {
        stryCov_9fa48("7364");
        return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("7365") ? () => undefined : (stryCov_9fa48("7365"), issue => issue.message)).join(stryMutAct_9fa48("7366") ? "" : (stryCov_9fa48("7366"), " ")), path);
      }
    }
    return stryMutAct_9fa48("7367") ? {} : (stryCov_9fa48("7367"), {
      data: parsed.data
    });
  }
}
export function forwardResponse(response: Response, path = stryMutAct_9fa48("7368") ? bffPathForResponse(response) && "" : (stryCov_9fa48("7368"), bffPathForResponse(response) ?? (stryMutAct_9fa48("7369") ? "Stryker was here!" : (stryCov_9fa48("7369"), "")))): NextResponse {
  if (stryMutAct_9fa48("7370")) {
    {}
  } else {
    stryCov_9fa48("7370");
    const contentType = response.headers.get(stryMutAct_9fa48("7371") ? "" : (stryCov_9fa48("7371"), "content-type"));
    const bodyless = (stryMutAct_9fa48("7372") ? [] : (stryCov_9fa48("7372"), [204, 205, 304])).includes(response.status);
    if (stryMutAct_9fa48("7375") ? !bodyless && contentType !== null || !isJsonMediaType(contentType) : stryMutAct_9fa48("7374") ? false : stryMutAct_9fa48("7373") ? true : (stryCov_9fa48("7373", "7374", "7375"), (stryMutAct_9fa48("7377") ? !bodyless || contentType !== null : stryMutAct_9fa48("7376") ? true : (stryCov_9fa48("7376", "7377"), (stryMutAct_9fa48("7378") ? bodyless : (stryCov_9fa48("7378"), !bodyless)) && (stryMutAct_9fa48("7380") ? contentType === null : stryMutAct_9fa48("7379") ? true : (stryCov_9fa48("7379", "7380"), contentType !== null)))) && (stryMutAct_9fa48("7381") ? isJsonMediaType(contentType) : (stryCov_9fa48("7381"), !isJsonMediaType(contentType))))) {
      if (stryMutAct_9fa48("7382")) {
        {}
      } else {
        stryCov_9fa48("7382");
        void (stryMutAct_9fa48("7383") ? response.body.cancel().catch(() => undefined) : (stryCov_9fa48("7383"), response.body?.cancel().catch(() => undefined)));
        const errorStatus = (stryMutAct_9fa48("7386") ? response.status >= 200 || response.status < 300 : stryMutAct_9fa48("7385") ? false : stryMutAct_9fa48("7384") ? true : (stryCov_9fa48("7384", "7385", "7386"), (stryMutAct_9fa48("7389") ? response.status < 200 : stryMutAct_9fa48("7388") ? response.status > 200 : stryMutAct_9fa48("7387") ? true : (stryCov_9fa48("7387", "7388", "7389"), response.status >= 200)) && (stryMutAct_9fa48("7392") ? response.status >= 300 : stryMutAct_9fa48("7391") ? response.status <= 300 : stryMutAct_9fa48("7390") ? true : (stryCov_9fa48("7390", "7391", "7392"), response.status < 300)))) ? 502 : response.status;
        const error = errorResponse(errorStatus, stryMutAct_9fa48("7393") ? "" : (stryCov_9fa48("7393"), "El sistema devolvió una respuesta que no se pudo leer. Reintente en unos segundos."), path);
        error.headers.set(stryMutAct_9fa48("7395") ? "" : (stryCov_9fa48("7395"), "X-Content-Type-Options"), stryMutAct_9fa48("7396") ? "" : (stryCov_9fa48("7396"), "nosniff"));
        return error;
      }
    }
    const forwarded = new NextResponse(response.body, stryMutAct_9fa48("7397") ? {} : (stryCov_9fa48("7397"), {
      status: response.status,
      headers: stryMutAct_9fa48("7398") ? {} : (stryCov_9fa48("7398"), {
        "content-type": stryMutAct_9fa48("7399") ? contentType && "application/json" : (stryCov_9fa48("7399"), contentType ?? (stryMutAct_9fa48("7400") ? "" : (stryCov_9fa48("7400"), "application/json"))),
        "X-Content-Type-Options": stryMutAct_9fa48("7401") ? "" : (stryCov_9fa48("7401"), "nosniff")
      })
    }));
    // Si el pedido renovó los tokens contra M1, la cookie se resella con el material nuevo (no solo se extiende).
    const renewed = renewedSessionForResponse(response);
    if (stryMutAct_9fa48("7403") ? false : stryMutAct_9fa48("7402") ? true : (stryCov_9fa48("7402", "7403"), renewed)) forwarded.cookies.set(stryMutAct_9fa48("7405") ? {} : (stryCov_9fa48("7405"), {
      name: AUTH_COOKIE_NAME,
      value: sealSession(renewed),
      ...sessionCookieOptions(renewed, renewedRequestForResponse(response))
    }));
    return forwarded;
  }
}