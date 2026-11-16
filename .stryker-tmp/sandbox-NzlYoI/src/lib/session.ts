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
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { m6RoleSchema, type M6Role } from "./m6-roles";
import { getScenario, type Capability, type ScenarioCrew, type ScenarioId } from "./scenarios";
import { AUTH_COOKIE_NAME, SESSION_MARKER_COOKIE_NAME } from "./session-config";
export { AUTH_COOKIE_NAME, SESSION_MARKER_COOKIE_NAME, isDeployedAuthModeMisconfigured } from "./session-config";
export const SESSION_IDLE_MS = stryMutAct_9fa48("15578") ? 30 * 60 / 1000 : (stryCov_9fa48("15578"), (stryMutAct_9fa48("15579") ? 30 / 60 : (stryCov_9fa48("15579"), 30 * 60)) * 1000);
export const SESSION_ABSOLUTE_MS = stryMutAct_9fa48("15580") ? 8 * 60 * 60 / 1000 : (stryCov_9fa48("15580"), (stryMutAct_9fa48("15581") ? 8 * 60 / 60 : (stryCov_9fa48("15581"), (stryMutAct_9fa48("15582") ? 8 / 60 : (stryCov_9fa48("15582"), 8 * 60)) * 60)) * 1000);
export type AuthMode = "mock" | "real-m1";
export type SupportedAuthMode = AuthMode;
export type SessionIdentity = {
  userId: string;
  subType: "EMPLEADO";
  m1Role: string;
};
export type Session = {
  mode: SupportedAuthMode;
  /** Escenario de presentación; las sesiones M1 se pueden crear sin uno. */
  scenarioId?: ScenarioId;
  issuedAt: number;
  lastActivityAt: number;
  absoluteExpiresAt: number;
  jwtExpiresAt: number;
  accessToken?: string;
  /** Token de renovación de M1 (`X-Refresh-Token`, 7 días). Solo existe si el login lo trajo; nunca llega al navegador. */
  refreshToken?: string;
  /** Quién emite el material de token: `m1` (login real, #145) habilita la renovación. */
  source?: "m1";
  /** Identidad validada por el token M1 y confirmada por Backend GET /me. */
  identity?: SessionIdentity;
  /** Roles de M6 efectivos: en real-m1 los trae GET /me (login y refresco); en mock, el fixture del escenario. */
  roles: M6Role[];
  /** Cuadrilla y función informadas por GET /me en real-m1. */
  crew?: ScenarioCrew;
  fieldRole?: "CREW_LEADER" | "CREW_MEMBER";
};
export type PublicSession = Omit<Session, "accessToken" | "refreshToken" | "source"> & {
  expiresAt: number;
};
export class AuthUnavailableError extends Error {
  constructor(message = stryMutAct_9fa48("15583") ? "" : (stryCov_9fa48("15583"), "La autenticación solicitada no está disponible.")) {
    if (stryMutAct_9fa48("15584")) {
      {}
    } else {
      stryCov_9fa48("15584");
      console.error(stryMutAct_9fa48("15586") ? "" : (stryCov_9fa48("15586"), "[m6-auth-unavailable]"), message);
      super(stryMutAct_9fa48("15587") ? "" : (stryCov_9fa48("15587"), "La autenticación solicitada no está disponible."));
      this.name = stryMutAct_9fa48("15588") ? "" : (stryCov_9fa48("15588"), "AuthUnavailableError");
    }
  }
}
export class BackendUnavailableError extends Error {
  readonly status: number;
  constructor(status: number, message = stryMutAct_9fa48("15589") ? "" : (stryCov_9fa48("15589"), "El sistema no responde. Reintente en unos segundos."), options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("15590")) {
      {}
    } else {
      stryCov_9fa48("15590");
      super(message, options);
      this.name = stryMutAct_9fa48("15591") ? "" : (stryCov_9fa48("15591"), "BackendUnavailableError");
      this.status = status;
    }
  }
}
export class InvalidSessionError extends Error {
  constructor(message = stryMutAct_9fa48("15592") ? "" : (stryCov_9fa48("15592"), "La sesión no es válida o ya expiró.")) {
    if (stryMutAct_9fa48("15593")) {
      {}
    } else {
      stryCov_9fa48("15593");
      super(message);
      this.name = stryMutAct_9fa48("15594") ? "" : (stryCov_9fa48("15594"), "InvalidSessionError");
    }
  }
}
export class ForbiddenSessionError extends Error {
  constructor(message = stryMutAct_9fa48("15595") ? "" : (stryCov_9fa48("15595"), "La sesión no tiene la capacidad necesaria.")) {
    if (stryMutAct_9fa48("15596")) {
      {}
    } else {
      stryCov_9fa48("15596");
      super(message);
      this.name = stryMutAct_9fa48("15597") ? "" : (stryCov_9fa48("15597"), "ForbiddenSessionError");
    }
  }
}

/** 403 por `sub_type`: el token es de un ciudadano y el sistema es solo para personal municipal (sin `code`). */
export class CitizenForbiddenError extends ForbiddenSessionError {
  constructor(message = stryMutAct_9fa48("15598") ? "" : (stryCov_9fa48("15598"), "Este sistema es solo para personal municipal.")) {
    if (stryMutAct_9fa48("15599")) {
      {}
    } else {
      stryCov_9fa48("15599");
      super(message);
      this.name = stryMutAct_9fa48("15600") ? "" : (stryCov_9fa48("15600"), "CitizenForbiddenError");
    }
  }
}
type SessionOptions = {
  mode: AuthMode;
  now?: number;
  /** Sin ellos, los del fixture del escenario (mock y tests). */
  roles?: readonly M6Role[];
};
type RuntimeEnvironment = {
  M6_AUTH_MODE?: string;
  M6_SESSION_SECRET?: string;
  NODE_ENV?: string;
};
const localSessionSecret = stryMutAct_9fa48("15601") ? "" : (stryCov_9fa48("15601"), "m6-local-development-session-secret");
const sessionKeySalt = Buffer.from(stryMutAct_9fa48("15602") ? "" : (stryCov_9fa48("15602"), "m6-bff-session-key-salt-v1"), stryMutAct_9fa48("15603") ? "" : (stryCov_9fa48("15603"), "utf8"));
const sessionKeyInfo = Buffer.from(stryMutAct_9fa48("15604") ? "" : (stryCov_9fa48("15604"), "aes-256-gcm cookie encryption v1"), stryMutAct_9fa48("15605") ? "" : (stryCov_9fa48("15605"), "utf8"));
export function getAuthMode(environment: RuntimeEnvironment = process.env): AuthMode {
  if (stryMutAct_9fa48("15606")) {
    {}
  } else {
    stryCov_9fa48("15606");
    // Desplegado (producción/preview): real-m1 es el único modo. Cualquier otro valor falla cerrado (503 en el login, error al arrancar).
    if (stryMutAct_9fa48("15609") ? environment.NODE_ENV !== "production" : stryMutAct_9fa48("15608") ? false : stryMutAct_9fa48("15607") ? true : (stryCov_9fa48("15607", "15608", "15609"), environment.NODE_ENV === (stryMutAct_9fa48("15610") ? "" : (stryCov_9fa48("15610"), "production")))) return stryMutAct_9fa48("15611") ? "" : (stryCov_9fa48("15611"), "real-m1");
    return (stryMutAct_9fa48("15614") ? environment.M6_AUTH_MODE !== "real-m1" : stryMutAct_9fa48("15613") ? false : stryMutAct_9fa48("15612") ? true : (stryCov_9fa48("15612", "15613", "15614"), environment.M6_AUTH_MODE === (stryMutAct_9fa48("15615") ? "" : (stryCov_9fa48("15615"), "real-m1")))) ? stryMutAct_9fa48("15616") ? "" : (stryCov_9fa48("15616"), "real-m1") : stryMutAct_9fa48("15617") ? "" : (stryCov_9fa48("15617"), "mock");
  }
}
export function createSession(scenarioId: ScenarioId, options: SessionOptions): Session {
  if (stryMutAct_9fa48("15618")) {
    {}
  } else {
    stryCov_9fa48("15618");
    if (stryMutAct_9fa48("15619")) {
      ;
    } else {
      stryCov_9fa48("15619");
      getScenario(scenarioId);
    }
    const now = stryMutAct_9fa48("15620") ? options.now && Date.now() : (stryCov_9fa48("15620"), options.now ?? Date.now());
    const roles = stryMutAct_9fa48("15621") ? [] : (stryCov_9fa48("15621"), [...(stryMutAct_9fa48("15622") ? options.roles && getScenario(scenarioId).roles : (stryCov_9fa48("15622"), options.roles ?? getScenario(scenarioId).roles))]);
    if (stryMutAct_9fa48("15625") ? options.mode !== "real-m1" : stryMutAct_9fa48("15624") ? false : stryMutAct_9fa48("15623") ? true : (stryCov_9fa48("15623", "15624", "15625"), options.mode === (stryMutAct_9fa48("15626") ? "" : (stryCov_9fa48("15626"), "real-m1")))) {
      if (stryMutAct_9fa48("15627")) {
        {}
      } else {
        stryCov_9fa48("15627");
        throw new AuthUnavailableError(stryMutAct_9fa48("15629") ? "" : (stryCov_9fa48("15629"), "Las sesiones de real-m1 se crean con createM1Session tras el login contra M1."));
      }
    }
    return stryMutAct_9fa48("15630") ? {} : (stryCov_9fa48("15630"), {
      mode: stryMutAct_9fa48("15631") ? "" : (stryCov_9fa48("15631"), "mock"),
      scenarioId,
      issuedAt: now,
      lastActivityAt: now,
      absoluteExpiresAt: stryMutAct_9fa48("15632") ? now - SESSION_ABSOLUTE_MS : (stryCov_9fa48("15632"), now + SESSION_ABSOLUTE_MS),
      jwtExpiresAt: stryMutAct_9fa48("15633") ? now - SESSION_ABSOLUTE_MS : (stryCov_9fa48("15633"), now + SESSION_ABSOLUTE_MS),
      roles
    });
  }
}
export function createM1Session(options: {
  accessToken: string;
  refreshToken: string;
  jwtExpiresAt: number;
  identity: SessionIdentity;
  roles?: readonly M6Role[];
  now?: number;
}): Session {
  if (stryMutAct_9fa48("15634")) {
    {}
  } else {
    stryCov_9fa48("15634");
    const now = stryMutAct_9fa48("15635") ? options.now && Date.now() : (stryCov_9fa48("15635"), options.now ?? Date.now());
    return stryMutAct_9fa48("15636") ? {} : (stryCov_9fa48("15636"), {
      mode: stryMutAct_9fa48("15637") ? "" : (stryCov_9fa48("15637"), "real-m1"),
      issuedAt: now,
      lastActivityAt: now,
      absoluteExpiresAt: stryMutAct_9fa48("15638") ? now - SESSION_ABSOLUTE_MS : (stryCov_9fa48("15638"), now + SESSION_ABSOLUTE_MS),
      jwtExpiresAt: options.jwtExpiresAt,
      accessToken: options.accessToken,
      refreshToken: options.refreshToken,
      source: stryMutAct_9fa48("15639") ? "" : (stryCov_9fa48("15639"), "m1"),
      identity: options.identity,
      roles: stryMutAct_9fa48("15640") ? [] : (stryCov_9fa48("15640"), [...(stryMutAct_9fa48("15641") ? options.roles && [] : (stryCov_9fa48("15641"), options.roles ?? (stryMutAct_9fa48("15642") ? ["Stryker was here"] : (stryCov_9fa48("15642"), []))))])
    });
  }
}
export function effectiveSessionExpiry(session: Session): number {
  if (stryMutAct_9fa48("15643")) {
    {}
  } else {
    stryCov_9fa48("15643");
    // M1 renueva el token dentro de la sesión; su expiración no cierra la cookie.
    if (stryMutAct_9fa48("15646") ? session.source !== "m1" : stryMutAct_9fa48("15645") ? false : stryMutAct_9fa48("15644") ? true : (stryCov_9fa48("15644", "15645", "15646"), session.source === (stryMutAct_9fa48("15647") ? "" : (stryCov_9fa48("15647"), "m1")))) {
      if (stryMutAct_9fa48("15648")) {
        {}
      } else {
        stryCov_9fa48("15648");
        return stryMutAct_9fa48("15649") ? Math.max(session.lastActivityAt + SESSION_IDLE_MS, session.absoluteExpiresAt) : (stryCov_9fa48("15649"), Math.min(stryMutAct_9fa48("15650") ? session.lastActivityAt - SESSION_IDLE_MS : (stryCov_9fa48("15650"), session.lastActivityAt + SESSION_IDLE_MS), session.absoluteExpiresAt));
      }
    }
    return stryMutAct_9fa48("15651") ? Math.max(session.jwtExpiresAt, session.lastActivityAt + SESSION_IDLE_MS, session.absoluteExpiresAt) : (stryCov_9fa48("15651"), Math.min(session.jwtExpiresAt, stryMutAct_9fa48("15652") ? session.lastActivityAt - SESSION_IDLE_MS : (stryCov_9fa48("15652"), session.lastActivityAt + SESSION_IDLE_MS), session.absoluteExpiresAt));
  }
}
export function isSessionActive(session: Session, now = Date.now()): boolean {
  if (stryMutAct_9fa48("15653")) {
    {}
  } else {
    stryCov_9fa48("15653");
    return stryMutAct_9fa48("15657") ? now >= effectiveSessionExpiry(session) : stryMutAct_9fa48("15656") ? now <= effectiveSessionExpiry(session) : stryMutAct_9fa48("15655") ? false : stryMutAct_9fa48("15654") ? true : (stryCov_9fa48("15654", "15655", "15656", "15657"), now < effectiveSessionExpiry(session));
  }
}
export function publicSession(session: Session): PublicSession {
  if (stryMutAct_9fa48("15658")) {
    {}
  } else {
    stryCov_9fa48("15658");
    const {
      accessToken: _accessToken,
      refreshToken: _refreshToken,
      source: _source,
      ...safeSession
    } = session;
    return stryMutAct_9fa48("15659") ? {} : (stryCov_9fa48("15659"), {
      ...safeSession,
      expiresAt: effectiveSessionExpiry(session)
    });
  }
}
export function requireSession(session: Session | undefined): Session {
  if (stryMutAct_9fa48("15660")) {
    {}
  } else {
    stryCov_9fa48("15660");
    if (stryMutAct_9fa48("15663") ? false : stryMutAct_9fa48("15662") ? true : stryMutAct_9fa48("15661") ? session : (stryCov_9fa48("15661", "15662", "15663"), !session)) if (stryMutAct_9fa48("15664")) {
      ;
    } else {
      stryCov_9fa48("15664");
      throw new InvalidSessionError();
    }
    return session;
  }
}
export function requireCapability(session: Session, capability: Capability): Session {
  if (stryMutAct_9fa48("15665")) {
    {}
  } else {
    stryCov_9fa48("15665");
    const scenario = getScenario(session);
    if (stryMutAct_9fa48("15668") ? false : stryMutAct_9fa48("15667") ? true : stryMutAct_9fa48("15666") ? scenario.capabilities.includes(capability) : (stryCov_9fa48("15666", "15667", "15668"), !scenario.capabilities.includes(capability))) if (stryMutAct_9fa48("15669")) {
      ;
    } else {
      stryCov_9fa48("15669");
      throw new ForbiddenSessionError();
    }
    return session;
  }
}

/** Un navegador descarta en silencio una cookie de más de ~4 KB; mejor fallar en voz alta. */
export const MAX_SEALED_SESSION_BYTES = 3800;
export function sealSession(session: Session, secret = sessionSecret()): string {
  if (stryMutAct_9fa48("15670")) {
    {}
  } else {
    stryCov_9fa48("15670");
    const key = deriveKey(secret);
    const iv = randomBytes(12);
    const cipher = createCipheriv(stryMutAct_9fa48("15671") ? "" : (stryCov_9fa48("15671"), "aes-256-gcm"), key, iv);
    const ciphertext = Buffer.concat(stryMutAct_9fa48("15672") ? [] : (stryCov_9fa48("15672"), [cipher.update(JSON.stringify(session), stryMutAct_9fa48("15673") ? "" : (stryCov_9fa48("15673"), "utf8")), cipher.final()]));
    const authTag = cipher.getAuthTag();
    const sealed = (stryMutAct_9fa48("15674") ? [] : (stryCov_9fa48("15674"), [iv, authTag, ciphertext])).map(stryMutAct_9fa48("15675") ? () => undefined : (stryCov_9fa48("15675"), value => value.toString(stryMutAct_9fa48("15676") ? "" : (stryCov_9fa48("15676"), "base64url")))).join(stryMutAct_9fa48("15677") ? "" : (stryCov_9fa48("15677"), "."));
    if (stryMutAct_9fa48("15681") ? sealed.length <= MAX_SEALED_SESSION_BYTES : stryMutAct_9fa48("15680") ? sealed.length >= MAX_SEALED_SESSION_BYTES : stryMutAct_9fa48("15679") ? false : stryMutAct_9fa48("15678") ? true : (stryCov_9fa48("15678", "15679", "15680", "15681"), sealed.length > MAX_SEALED_SESSION_BYTES)) {
      if (stryMutAct_9fa48("15682")) {
        {}
      } else {
        stryCov_9fa48("15682");
        throw new Error(stryMutAct_9fa48("15684") ? `` : (stryCov_9fa48("15684"), `La sesión sellada (${sealed.length} bytes) supera el límite de la cookie (${MAX_SEALED_SESSION_BYTES}).`));
      }
    }
    return sealed;
  }
}

/**
 * Deja la cookie renovada en la respuesta del route handler, arme la respuesta que la arme (Next la fusiona al
 * enviarla). Fuera de un pedido de Next (tests, scripts) no hay store de cookies y no hace nada.
 */
export async function persistRenewedSession(session: Session, request?: Request): Promise<void> {
  if (stryMutAct_9fa48("15685")) {
    {}
  } else {
    stryCov_9fa48("15685");
    let value: string;
    try {
      if (stryMutAct_9fa48("15686")) {
        {}
      } else {
        stryCov_9fa48("15686");
        value = sealSession(session);
      }
    } catch (error) {
      if (stryMutAct_9fa48("15687")) {
        {}
      } else {
        stryCov_9fa48("15687");
        // M1 ya rotó los tokens: que quede claro por qué se corta, en vez de un 500 genérico.
        throw new BackendUnavailableError(502, stryMutAct_9fa48("15689") ? "" : (stryCov_9fa48("15689"), "La sesión renovada es demasiado grande para la cookie."), stryMutAct_9fa48("15690") ? {} : (stryCov_9fa48("15690"), {
          cause: error
        }));
      }
    }
    try {
      if (stryMutAct_9fa48("15691")) {
        {}
      } else {
        stryCov_9fa48("15691");
        (await cookies()).set(stryMutAct_9fa48("15693") ? {} : (stryCov_9fa48("15693"), {
          name: AUTH_COOKIE_NAME,
          value,
          ...sessionCookieOptions(session, request)
        }));
      }
    } catch {
      // Sin contexto de pedido de Next: los caminos explícitos (forwardResponse, /api/session) sellan igual.
    }
  }
}
export function getSessionFromCookieValue(cookieValue: string | undefined, secret: string | undefined = undefined, now = Date.now()): Session | undefined {
  if (stryMutAct_9fa48("15694")) {
    {}
  } else {
    stryCov_9fa48("15694");
    if (stryMutAct_9fa48("15697") ? false : stryMutAct_9fa48("15696") ? true : stryMutAct_9fa48("15695") ? cookieValue : (stryCov_9fa48("15695", "15696", "15697"), !cookieValue)) return undefined;
    try {
      if (stryMutAct_9fa48("15698")) {
        {}
      } else {
        stryCov_9fa48("15698");
        const sessionKey = stryMutAct_9fa48("15699") ? secret && sessionSecret() : (stryCov_9fa48("15699"), secret ?? sessionSecret());
        const [encodedIv, encodedAuthTag, encodedCiphertext] = cookieValue.split(stryMutAct_9fa48("15700") ? "" : (stryCov_9fa48("15700"), "."));
        if (stryMutAct_9fa48("15703") ? (!encodedIv || !encodedAuthTag) && !encodedCiphertext : stryMutAct_9fa48("15702") ? false : stryMutAct_9fa48("15701") ? true : (stryCov_9fa48("15701", "15702", "15703"), (stryMutAct_9fa48("15705") ? !encodedIv && !encodedAuthTag : stryMutAct_9fa48("15704") ? false : (stryCov_9fa48("15704", "15705"), (stryMutAct_9fa48("15706") ? encodedIv : (stryCov_9fa48("15706"), !encodedIv)) || (stryMutAct_9fa48("15707") ? encodedAuthTag : (stryCov_9fa48("15707"), !encodedAuthTag)))) || (stryMutAct_9fa48("15708") ? encodedCiphertext : (stryCov_9fa48("15708"), !encodedCiphertext)))) return undefined;
        const decipher = createDecipheriv(stryMutAct_9fa48("15709") ? "" : (stryCov_9fa48("15709"), "aes-256-gcm"), deriveKey(sessionKey), Buffer.from(encodedIv, stryMutAct_9fa48("15710") ? "" : (stryCov_9fa48("15710"), "base64url")));
        decipher.setAuthTag(Buffer.from(encodedAuthTag, stryMutAct_9fa48("15712") ? "" : (stryCov_9fa48("15712"), "base64url")));
        const plaintext = Buffer.concat(stryMutAct_9fa48("15713") ? [] : (stryCov_9fa48("15713"), [decipher.update(Buffer.from(encodedCiphertext, stryMutAct_9fa48("15714") ? "" : (stryCov_9fa48("15714"), "base64url"))), decipher.final()])).toString(stryMutAct_9fa48("15715") ? "" : (stryCov_9fa48("15715"), "utf8"));
        const value = JSON.parse(plaintext) as Partial<Session>;
        if (stryMutAct_9fa48("15718") ? !isSession(value) && value.mode !== getAuthMode() : stryMutAct_9fa48("15717") ? false : stryMutAct_9fa48("15716") ? true : (stryCov_9fa48("15716", "15717", "15718"), (stryMutAct_9fa48("15719") ? isSession(value) : (stryCov_9fa48("15719"), !isSession(value))) || (stryMutAct_9fa48("15721") ? value.mode === getAuthMode() : stryMutAct_9fa48("15720") ? false : (stryCov_9fa48("15720", "15721"), value.mode !== getAuthMode())))) return undefined;
        return isSessionActive(value, now) ? value : undefined;
      }
    } catch {
      if (stryMutAct_9fa48("15722")) {
        {}
      } else {
        stryCov_9fa48("15722");
        return undefined;
      }
    }
  }
}

// Sesión renovada contra M1 durante un pedido: el resto del pedido ve los tokens nuevos, no los de la cookie.
const renewedRequestSessions = new WeakMap<Request, Session>();
// Respuesta que debe llevar la cookie resellada con esa sesión (la aplica forwardResponse).
const renewedResponseSessions = new WeakMap<Response, {
  session: Session;
  request: Request;
}>();
export function rememberRenewedSession(request: Request, session: Session): void {
  if (stryMutAct_9fa48("15723")) {
    {}
  } else {
    stryCov_9fa48("15723");
    if (stryMutAct_9fa48("15724")) {
      ;
    } else {
      stryCov_9fa48("15724");
      renewedRequestSessions.set(request, session);
    }
  }
}
export function wasSessionRenewed(request: Request): boolean {
  if (stryMutAct_9fa48("15725")) {
    {}
  } else {
    stryCov_9fa48("15725");
    return renewedRequestSessions.has(request);
  }
}
export function rememberRenewedResponse(response: Response, session: Session, request: Request): void {
  if (stryMutAct_9fa48("15726")) {
    {}
  } else {
    stryCov_9fa48("15726");
    renewedResponseSessions.set(response, stryMutAct_9fa48("15728") ? {} : (stryCov_9fa48("15728"), {
      session,
      request
    }));
  }
}
export function renewedSessionForResponse(response: Response): Session | undefined {
  if (stryMutAct_9fa48("15729")) {
    {}
  } else {
    stryCov_9fa48("15729");
    return stryMutAct_9fa48("15730") ? renewedResponseSessions.get(response).session : (stryCov_9fa48("15730"), renewedResponseSessions.get(response)?.session);
  }
}
export function renewedRequestForResponse(response: Response): Request | undefined {
  if (stryMutAct_9fa48("15731")) {
    {}
  } else {
    stryCov_9fa48("15731");
    return stryMutAct_9fa48("15732") ? renewedResponseSessions.get(response).request : (stryCov_9fa48("15732"), renewedResponseSessions.get(response)?.request);
  }
}
export function getSessionFromRequest(request: Request, secret: string | undefined = undefined, now = Date.now()): Session | undefined {
  if (stryMutAct_9fa48("15733")) {
    {}
  } else {
    stryCov_9fa48("15733");
    const renewed = renewedRequestSessions.get(request);
    if (stryMutAct_9fa48("15735") ? false : stryMutAct_9fa48("15734") ? true : (stryCov_9fa48("15734", "15735"), renewed)) return renewed;
    const cookieHeader = request.headers.get(stryMutAct_9fa48("15736") ? "" : (stryCov_9fa48("15736"), "cookie"));
    const cookieValue = stryMutAct_9fa48("15739") ? cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(`${AUTH_COOKIE_NAME}=`))?.slice(AUTH_COOKIE_NAME.length + 1) : stryMutAct_9fa48("15738") ? cookieHeader?.split(";").map(part => part.trim()).find(part => part.startsWith(`${AUTH_COOKIE_NAME}=`)).slice(AUTH_COOKIE_NAME.length + 1) : stryMutAct_9fa48("15737") ? cookieHeader?.split(";").map(part => part.trim()).find(part => part.startsWith(`${AUTH_COOKIE_NAME}=`)) : (stryCov_9fa48("15737", "15738", "15739"), cookieHeader?.split(stryMutAct_9fa48("15740") ? "" : (stryCov_9fa48("15740"), ";")).map(stryMutAct_9fa48("15741") ? () => undefined : (stryCov_9fa48("15741"), part => stryMutAct_9fa48("15742") ? part : (stryCov_9fa48("15742"), part.trim()))).find(stryMutAct_9fa48("15743") ? () => undefined : (stryCov_9fa48("15743"), part => stryMutAct_9fa48("15744") ? part.endsWith(`${AUTH_COOKIE_NAME}=`) : (stryCov_9fa48("15744"), part.startsWith(stryMutAct_9fa48("15745") ? `` : (stryCov_9fa48("15745"), `${AUTH_COOKIE_NAME}=`)))))?.slice(stryMutAct_9fa48("15746") ? AUTH_COOKIE_NAME.length - 1 : (stryCov_9fa48("15746"), AUTH_COOKIE_NAME.length + 1)));
    return getSessionFromCookieValue(cookieValue, secret, now);
  }
}
export function getRequiredSession(request: Request): Session {
  if (stryMutAct_9fa48("15747")) {
    {}
  } else {
    stryCov_9fa48("15747");
    return requireSession(getSessionFromRequest(request));
  }
}
export async function getSession(secret: string | undefined = undefined, now = Date.now()): Promise<Session | undefined> {
  if (stryMutAct_9fa48("15748")) {
    {}
  } else {
    stryCov_9fa48("15748");
    const cookieStore = await cookies();
    return getSessionFromCookieValue(stryMutAct_9fa48("15749") ? cookieStore.get(AUTH_COOKIE_NAME).value : (stryCov_9fa48("15749"), cookieStore.get(AUTH_COOKIE_NAME)?.value), secret, now);
  }
}
export function sessionCookieOptions(session: Session, request?: Request) {
  if (stryMutAct_9fa48("15750")) {
    {}
  } else {
    stryCov_9fa48("15750");
    return stryMutAct_9fa48("15751") ? {} : (stryCov_9fa48("15751"), {
      httpOnly: stryMutAct_9fa48("15752") ? false : (stryCov_9fa48("15752"), true),
      secure: shouldUseSecureCookie(request),
      sameSite: "lax" as const,
      path: stryMutAct_9fa48("15753") ? "" : (stryCov_9fa48("15753"), "/"),
      maxAge: stryMutAct_9fa48("15754") ? Math.min(0, Math.ceil((effectiveSessionExpiry(session) - Date.now()) / 1000)) : (stryCov_9fa48("15754"), Math.max(0, Math.ceil(stryMutAct_9fa48("15755") ? (effectiveSessionExpiry(session) - Date.now()) * 1000 : (stryCov_9fa48("15755"), (stryMutAct_9fa48("15756") ? effectiveSessionExpiry(session) + Date.now() : (stryCov_9fa48("15756"), effectiveSessionExpiry(session) - Date.now())) / 1000))))
    });
  }
}

/** Marca de "ya ingresó": vive lo que el tope de la sesión y la lee el proxy. */
export function sessionMarkerCookieOptions(request?: Request) {
  if (stryMutAct_9fa48("15757")) {
    {}
  } else {
    stryCov_9fa48("15757");
    return stryMutAct_9fa48("15758") ? {} : (stryCov_9fa48("15758"), {
      httpOnly: stryMutAct_9fa48("15759") ? false : (stryCov_9fa48("15759"), true),
      secure: shouldUseSecureCookie(request),
      sameSite: "lax" as const,
      path: stryMutAct_9fa48("15760") ? "" : (stryCov_9fa48("15760"), "/"),
      maxAge: stryMutAct_9fa48("15761") ? SESSION_ABSOLUTE_MS * 1000 : (stryCov_9fa48("15761"), SESSION_ABSOLUTE_MS / 1000)
    });
  }
}
export function sessionCookieRemovalOptions(request?: Request) {
  if (stryMutAct_9fa48("15762")) {
    {}
  } else {
    stryCov_9fa48("15762");
    return stryMutAct_9fa48("15763") ? {} : (stryCov_9fa48("15763"), {
      httpOnly: stryMutAct_9fa48("15764") ? false : (stryCov_9fa48("15764"), true),
      secure: shouldUseSecureCookie(request),
      sameSite: "lax" as const,
      path: stryMutAct_9fa48("15765") ? "" : (stryCov_9fa48("15765"), "/"),
      maxAge: 0
    });
  }
}
function shouldUseSecureCookie(request?: Request): boolean {
  if (stryMutAct_9fa48("15766")) {
    {}
  } else {
    stryCov_9fa48("15766");
    if (stryMutAct_9fa48("15769") ? process.env.NODE_ENV !== "production" : stryMutAct_9fa48("15768") ? false : stryMutAct_9fa48("15767") ? true : (stryCov_9fa48("15767", "15768", "15769"), process.env.NODE_ENV === (stryMutAct_9fa48("15770") ? "" : (stryCov_9fa48("15770"), "production")))) return stryMutAct_9fa48("15771") ? false : (stryCov_9fa48("15771"), true);
    if (stryMutAct_9fa48("15774") ? false : stryMutAct_9fa48("15773") ? true : stryMutAct_9fa48("15772") ? request : (stryCov_9fa48("15772", "15773", "15774"), !request)) return stryMutAct_9fa48("15775") ? true : (stryCov_9fa48("15775"), false);
    try {
      if (stryMutAct_9fa48("15776")) {
        {}
      } else {
        stryCov_9fa48("15776");
        return stryMutAct_9fa48("15777") ? isLoopbackHostname(new URL(request.url).hostname) : (stryCov_9fa48("15777"), !isLoopbackHostname(new URL(request.url).hostname));
      }
    } catch {
      if (stryMutAct_9fa48("15778")) {
        {}
      } else {
        stryCov_9fa48("15778");
        return stryMutAct_9fa48("15779") ? false : (stryCov_9fa48("15779"), true);
      }
    }
  }
}
export function isLoopbackHostname(hostname: string): boolean {
  if (stryMutAct_9fa48("15780")) {
    {}
  } else {
    stryCov_9fa48("15780");
    const host = stryMutAct_9fa48("15781") ? hostname.toUpperCase().replace(/^\[|\]$/g, "") : (stryCov_9fa48("15781"), hostname.toLowerCase().replace(stryMutAct_9fa48("15783") ? /^\[|\]/g : stryMutAct_9fa48("15782") ? /\[|\]$/g : (stryCov_9fa48("15782", "15783"), /^\[|\]$/g), stryMutAct_9fa48("15784") ? "Stryker was here!" : (stryCov_9fa48("15784"), "")));
    if (stryMutAct_9fa48("15787") ? host === "localhost" && host === "::1" : stryMutAct_9fa48("15786") ? false : stryMutAct_9fa48("15785") ? true : (stryCov_9fa48("15785", "15786", "15787"), (stryMutAct_9fa48("15789") ? host !== "localhost" : stryMutAct_9fa48("15788") ? false : (stryCov_9fa48("15788", "15789"), host === (stryMutAct_9fa48("15790") ? "" : (stryCov_9fa48("15790"), "localhost")))) || (stryMutAct_9fa48("15792") ? host !== "::1" : stryMutAct_9fa48("15791") ? false : (stryCov_9fa48("15791", "15792"), host === (stryMutAct_9fa48("15793") ? "" : (stryCov_9fa48("15793"), "::1")))))) return stryMutAct_9fa48("15794") ? false : (stryCov_9fa48("15794"), true);
    const octets = host.split(stryMutAct_9fa48("15795") ? "" : (stryCov_9fa48("15795"), "."));
    return stryMutAct_9fa48("15798") ? octets.length === 4 && Number(octets[0]) === 127 || octets.every(octet => /^\d{1,3}$/.test(octet) && Number(octet) <= 255) : stryMutAct_9fa48("15797") ? false : stryMutAct_9fa48("15796") ? true : (stryCov_9fa48("15796", "15797", "15798"), (stryMutAct_9fa48("15800") ? octets.length === 4 || Number(octets[0]) === 127 : stryMutAct_9fa48("15799") ? true : (stryCov_9fa48("15799", "15800"), (stryMutAct_9fa48("15802") ? octets.length !== 4 : stryMutAct_9fa48("15801") ? true : (stryCov_9fa48("15801", "15802"), octets.length === 4)) && (stryMutAct_9fa48("15804") ? Number(octets[0]) !== 127 : stryMutAct_9fa48("15803") ? true : (stryCov_9fa48("15803", "15804"), Number(octets[0]) === 127)))) && (stryMutAct_9fa48("15805") ? octets.some(octet => /^\d{1,3}$/.test(octet) && Number(octet) <= 255) : (stryCov_9fa48("15805"), octets.every(stryMutAct_9fa48("15806") ? () => undefined : (stryCov_9fa48("15806"), octet => stryMutAct_9fa48("15809") ? /^\d{1,3}$/.test(octet) || Number(octet) <= 255 : stryMutAct_9fa48("15808") ? false : stryMutAct_9fa48("15807") ? true : (stryCov_9fa48("15807", "15808", "15809"), (stryMutAct_9fa48("15813") ? /^\D{1,3}$/ : stryMutAct_9fa48("15812") ? /^\d$/ : stryMutAct_9fa48("15811") ? /^\d{1,3}/ : stryMutAct_9fa48("15810") ? /\d{1,3}$/ : (stryCov_9fa48("15810", "15811", "15812", "15813"), /^\d{1,3}$/)).test(octet) && (stryMutAct_9fa48("15816") ? Number(octet) > 255 : stryMutAct_9fa48("15815") ? Number(octet) < 255 : stryMutAct_9fa48("15814") ? true : (stryCov_9fa48("15814", "15815", "15816"), Number(octet) <= 255))))))));
  }
}
export function sessionSecret(environment: RuntimeEnvironment = process.env): string {
  if (stryMutAct_9fa48("15817")) {
    {}
  } else {
    stryCov_9fa48("15817");
    if (stryMutAct_9fa48("15819") ? false : stryMutAct_9fa48("15818") ? true : (stryCov_9fa48("15818", "15819"), environment.M6_SESSION_SECRET)) return environment.M6_SESSION_SECRET;
    if (stryMutAct_9fa48("15822") ? environment.NODE_ENV !== "production" : stryMutAct_9fa48("15821") ? false : stryMutAct_9fa48("15820") ? true : (stryCov_9fa48("15820", "15821", "15822"), environment.NODE_ENV === (stryMutAct_9fa48("15823") ? "" : (stryCov_9fa48("15823"), "production")))) {
      if (stryMutAct_9fa48("15824")) {
        {}
      } else {
        stryCov_9fa48("15824");
        throw new AuthUnavailableError(stryMutAct_9fa48("15826") ? "" : (stryCov_9fa48("15826"), "M6_SESSION_SECRET es obligatorio fuera del desarrollo local."));
      }
    }
    return localSessionSecret;
  }
}
function deriveKey(secret: string): Buffer {
  if (stryMutAct_9fa48("15827")) {
    {}
  } else {
    stryCov_9fa48("15827");
    return Buffer.from(hkdfSync(stryMutAct_9fa48("15828") ? "" : (stryCov_9fa48("15828"), "sha256"), Buffer.from(secret, stryMutAct_9fa48("15829") ? "" : (stryCov_9fa48("15829"), "utf8")), sessionKeySalt, sessionKeyInfo, 32));
  }
}
function readJwtPayload(token: string): {
  exp?: unknown;
  sub?: unknown;
} | undefined {
  if (stryMutAct_9fa48("15830")) {
    {}
  } else {
    stryCov_9fa48("15830");
    const [, encodedPayload] = token.split(stryMutAct_9fa48("15831") ? "" : (stryCov_9fa48("15831"), "."));
    if (stryMutAct_9fa48("15834") ? false : stryMutAct_9fa48("15833") ? true : stryMutAct_9fa48("15832") ? encodedPayload : (stryCov_9fa48("15832", "15833", "15834"), !encodedPayload)) return undefined;
    try {
      if (stryMutAct_9fa48("15835")) {
        {}
      } else {
        stryCov_9fa48("15835");
        return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
          exp?: unknown;
          sub?: unknown;
        };
      }
    } catch {
      if (stryMutAct_9fa48("15836")) {
        {}
      } else {
        stryCov_9fa48("15836");
        return undefined;
      }
    }
  }
}
export function readJwtExpiry(token: string): number | undefined {
  if (stryMutAct_9fa48("15837")) {
    {}
  } else {
    stryCov_9fa48("15837");
    const exp = stryMutAct_9fa48("15838") ? readJwtPayload(token).exp : (stryCov_9fa48("15838"), readJwtPayload(token)?.exp);
    return (stryMutAct_9fa48("15841") ? typeof exp !== "number" : stryMutAct_9fa48("15840") ? false : stryMutAct_9fa48("15839") ? true : (stryCov_9fa48("15839", "15840", "15841"), typeof exp === (stryMutAct_9fa48("15842") ? "" : (stryCov_9fa48("15842"), "number")))) ? stryMutAct_9fa48("15843") ? exp / 1000 : (stryCov_9fa48("15843"), exp * 1000) : undefined;
  }
}

/** `sub` como texto (M1 lo manda numérico o string); undefined si no se puede leer. */
export function readJwtSubject(token: string): string | undefined {
  if (stryMutAct_9fa48("15844")) {
    {}
  } else {
    stryCov_9fa48("15844");
    const sub = stryMutAct_9fa48("15845") ? readJwtPayload(token).sub : (stryCov_9fa48("15845"), readJwtPayload(token)?.sub);
    if (stryMutAct_9fa48("15848") ? typeof sub === "string" || /^\d{1,19}$/.test(sub) : stryMutAct_9fa48("15847") ? false : stryMutAct_9fa48("15846") ? true : (stryCov_9fa48("15846", "15847", "15848"), (stryMutAct_9fa48("15850") ? typeof sub !== "string" : stryMutAct_9fa48("15849") ? true : (stryCov_9fa48("15849", "15850"), typeof sub === (stryMutAct_9fa48("15851") ? "" : (stryCov_9fa48("15851"), "string")))) && (stryMutAct_9fa48("15855") ? /^\D{1,19}$/ : stryMutAct_9fa48("15854") ? /^\d$/ : stryMutAct_9fa48("15853") ? /^\d{1,19}/ : stryMutAct_9fa48("15852") ? /\d{1,19}$/ : (stryCov_9fa48("15852", "15853", "15854", "15855"), /^\d{1,19}$/)).test(sub))) return BigInt(sub).toString();
    if (stryMutAct_9fa48("15858") ? typeof sub === "number" && Number.isSafeInteger(sub) || sub >= 0 : stryMutAct_9fa48("15857") ? false : stryMutAct_9fa48("15856") ? true : (stryCov_9fa48("15856", "15857", "15858"), (stryMutAct_9fa48("15860") ? typeof sub === "number" || Number.isSafeInteger(sub) : stryMutAct_9fa48("15859") ? true : (stryCov_9fa48("15859", "15860"), (stryMutAct_9fa48("15862") ? typeof sub !== "number" : stryMutAct_9fa48("15861") ? true : (stryCov_9fa48("15861", "15862"), typeof sub === (stryMutAct_9fa48("15863") ? "" : (stryCov_9fa48("15863"), "number")))) && Number.isSafeInteger(sub))) && (stryMutAct_9fa48("15866") ? sub < 0 : stryMutAct_9fa48("15865") ? sub > 0 : stryMutAct_9fa48("15864") ? true : (stryCov_9fa48("15864", "15865", "15866"), sub >= 0)))) return BigInt(sub).toString();
    return undefined;
  }
}
function isSession(value: Partial<Session>): value is Session {
  if (stryMutAct_9fa48("15867")) {
    {}
  } else {
    stryCov_9fa48("15867");
    return stryMutAct_9fa48("15870") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" && typeof value.absoluteExpiresAt === "number" && typeof value.jwtExpiresAt === "number" && m6RoleSchema.array().safeParse(value.roles).success && (value.mode === "mock" ? value.accessToken === undefined : typeof value.accessToken === "string") && (value.source === undefined || value.source === "m1" && value.mode !== "mock") && (value.refreshToken === undefined || value.mode !== "mock" && typeof value.refreshToken === "string") && (value.mode !== "real-m1" || value.source === "m1" && typeof value.refreshToken === "string" && typeof value.identity?.userId === "string" && value.identity.subType === "EMPLEADO" && typeof value.identity.m1Role === "string") && (value.fieldRole === undefined || value.fieldRole === "CREW_LEADER" || value.fieldRole === "CREW_MEMBER") || value.crew === undefined || typeof value.crew?.id === "string" && typeof value.crew?.name === "string" : stryMutAct_9fa48("15869") ? false : stryMutAct_9fa48("15868") ? true : (stryCov_9fa48("15868", "15869", "15870"), (stryMutAct_9fa48("15872") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" && typeof value.absoluteExpiresAt === "number" && typeof value.jwtExpiresAt === "number" && m6RoleSchema.array().safeParse(value.roles).success && (value.mode === "mock" ? value.accessToken === undefined : typeof value.accessToken === "string") && (value.source === undefined || value.source === "m1" && value.mode !== "mock") && (value.refreshToken === undefined || value.mode !== "mock" && typeof value.refreshToken === "string") && (value.mode !== "real-m1" || value.source === "m1" && typeof value.refreshToken === "string" && typeof value.identity?.userId === "string" && value.identity.subType === "EMPLEADO" && typeof value.identity.m1Role === "string") || value.fieldRole === undefined || value.fieldRole === "CREW_LEADER" || value.fieldRole === "CREW_MEMBER" : stryMutAct_9fa48("15871") ? true : (stryCov_9fa48("15871", "15872"), (stryMutAct_9fa48("15874") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" && typeof value.absoluteExpiresAt === "number" && typeof value.jwtExpiresAt === "number" && m6RoleSchema.array().safeParse(value.roles).success && (value.mode === "mock" ? value.accessToken === undefined : typeof value.accessToken === "string") && (value.source === undefined || value.source === "m1" && value.mode !== "mock") && (value.refreshToken === undefined || value.mode !== "mock" && typeof value.refreshToken === "string") || value.mode !== "real-m1" || value.source === "m1" && typeof value.refreshToken === "string" && typeof value.identity?.userId === "string" && value.identity.subType === "EMPLEADO" && typeof value.identity.m1Role === "string" : stryMutAct_9fa48("15873") ? true : (stryCov_9fa48("15873", "15874"), (stryMutAct_9fa48("15876") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" && typeof value.absoluteExpiresAt === "number" && typeof value.jwtExpiresAt === "number" && m6RoleSchema.array().safeParse(value.roles).success && (value.mode === "mock" ? value.accessToken === undefined : typeof value.accessToken === "string") && (value.source === undefined || value.source === "m1" && value.mode !== "mock") || value.refreshToken === undefined || value.mode !== "mock" && typeof value.refreshToken === "string" : stryMutAct_9fa48("15875") ? true : (stryCov_9fa48("15875", "15876"), (stryMutAct_9fa48("15878") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" && typeof value.absoluteExpiresAt === "number" && typeof value.jwtExpiresAt === "number" && m6RoleSchema.array().safeParse(value.roles).success && (value.mode === "mock" ? value.accessToken === undefined : typeof value.accessToken === "string") || value.source === undefined || value.source === "m1" && value.mode !== "mock" : stryMutAct_9fa48("15877") ? true : (stryCov_9fa48("15877", "15878"), (stryMutAct_9fa48("15880") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" && typeof value.absoluteExpiresAt === "number" && typeof value.jwtExpiresAt === "number" && m6RoleSchema.array().safeParse(value.roles).success || (value.mode === "mock" ? value.accessToken === undefined : typeof value.accessToken === "string") : stryMutAct_9fa48("15879") ? true : (stryCov_9fa48("15879", "15880"), (stryMutAct_9fa48("15882") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" && typeof value.absoluteExpiresAt === "number" && typeof value.jwtExpiresAt === "number" || m6RoleSchema.array().safeParse(value.roles).success : stryMutAct_9fa48("15881") ? true : (stryCov_9fa48("15881", "15882"), (stryMutAct_9fa48("15884") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" && typeof value.absoluteExpiresAt === "number" || typeof value.jwtExpiresAt === "number" : stryMutAct_9fa48("15883") ? true : (stryCov_9fa48("15883", "15884"), (stryMutAct_9fa48("15886") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" && typeof value.lastActivityAt === "number" || typeof value.absoluteExpiresAt === "number" : stryMutAct_9fa48("15885") ? true : (stryCov_9fa48("15885", "15886"), (stryMutAct_9fa48("15888") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) && typeof value.issuedAt === "number" || typeof value.lastActivityAt === "number" : stryMutAct_9fa48("15887") ? true : (stryCov_9fa48("15887", "15888"), (stryMutAct_9fa48("15890") ? (value.mode === "mock" || value.mode === "real-m1") && (typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined) || typeof value.issuedAt === "number" : stryMutAct_9fa48("15889") ? true : (stryCov_9fa48("15889", "15890"), (stryMutAct_9fa48("15892") ? value.mode === "mock" || value.mode === "real-m1" || typeof value.scenarioId === "string" || value.mode === "real-m1" && value.scenarioId === undefined : stryMutAct_9fa48("15891") ? true : (stryCov_9fa48("15891", "15892"), (stryMutAct_9fa48("15894") ? value.mode === "mock" && value.mode === "real-m1" : stryMutAct_9fa48("15893") ? true : (stryCov_9fa48("15893", "15894"), (stryMutAct_9fa48("15896") ? value.mode !== "mock" : stryMutAct_9fa48("15895") ? false : (stryCov_9fa48("15895", "15896"), value.mode === (stryMutAct_9fa48("15897") ? "" : (stryCov_9fa48("15897"), "mock")))) || (stryMutAct_9fa48("15899") ? value.mode !== "real-m1" : stryMutAct_9fa48("15898") ? false : (stryCov_9fa48("15898", "15899"), value.mode === (stryMutAct_9fa48("15900") ? "" : (stryCov_9fa48("15900"), "real-m1")))))) && (stryMutAct_9fa48("15902") ? typeof value.scenarioId === "string" && value.mode === "real-m1" && value.scenarioId === undefined : stryMutAct_9fa48("15901") ? true : (stryCov_9fa48("15901", "15902"), (stryMutAct_9fa48("15904") ? typeof value.scenarioId !== "string" : stryMutAct_9fa48("15903") ? false : (stryCov_9fa48("15903", "15904"), typeof value.scenarioId === (stryMutAct_9fa48("15905") ? "" : (stryCov_9fa48("15905"), "string")))) || (stryMutAct_9fa48("15907") ? value.mode === "real-m1" || value.scenarioId === undefined : stryMutAct_9fa48("15906") ? false : (stryCov_9fa48("15906", "15907"), (stryMutAct_9fa48("15909") ? value.mode !== "real-m1" : stryMutAct_9fa48("15908") ? true : (stryCov_9fa48("15908", "15909"), value.mode === (stryMutAct_9fa48("15910") ? "" : (stryCov_9fa48("15910"), "real-m1")))) && (stryMutAct_9fa48("15912") ? value.scenarioId !== undefined : stryMutAct_9fa48("15911") ? true : (stryCov_9fa48("15911", "15912"), value.scenarioId === undefined)))))))) && (stryMutAct_9fa48("15914") ? typeof value.issuedAt !== "number" : stryMutAct_9fa48("15913") ? true : (stryCov_9fa48("15913", "15914"), typeof value.issuedAt === (stryMutAct_9fa48("15915") ? "" : (stryCov_9fa48("15915"), "number")))))) && (stryMutAct_9fa48("15917") ? typeof value.lastActivityAt !== "number" : stryMutAct_9fa48("15916") ? true : (stryCov_9fa48("15916", "15917"), typeof value.lastActivityAt === (stryMutAct_9fa48("15918") ? "" : (stryCov_9fa48("15918"), "number")))))) && (stryMutAct_9fa48("15920") ? typeof value.absoluteExpiresAt !== "number" : stryMutAct_9fa48("15919") ? true : (stryCov_9fa48("15919", "15920"), typeof value.absoluteExpiresAt === (stryMutAct_9fa48("15921") ? "" : (stryCov_9fa48("15921"), "number")))))) && (stryMutAct_9fa48("15923") ? typeof value.jwtExpiresAt !== "number" : stryMutAct_9fa48("15922") ? true : (stryCov_9fa48("15922", "15923"), typeof value.jwtExpiresAt === (stryMutAct_9fa48("15924") ? "" : (stryCov_9fa48("15924"), "number")))))) && m6RoleSchema.array().safeParse(value.roles).success)) && ((stryMutAct_9fa48("15927") ? value.mode !== "mock" : stryMutAct_9fa48("15926") ? false : stryMutAct_9fa48("15925") ? true : (stryCov_9fa48("15925", "15926", "15927"), value.mode === (stryMutAct_9fa48("15928") ? "" : (stryCov_9fa48("15928"), "mock")))) ? stryMutAct_9fa48("15931") ? value.accessToken !== undefined : stryMutAct_9fa48("15930") ? false : stryMutAct_9fa48("15929") ? true : (stryCov_9fa48("15929", "15930", "15931"), value.accessToken === undefined) : stryMutAct_9fa48("15934") ? typeof value.accessToken !== "string" : stryMutAct_9fa48("15933") ? false : stryMutAct_9fa48("15932") ? true : (stryCov_9fa48("15932", "15933", "15934"), typeof value.accessToken === (stryMutAct_9fa48("15935") ? "" : (stryCov_9fa48("15935"), "string")))))) && (stryMutAct_9fa48("15937") ? value.source === undefined && value.source === "m1" && value.mode !== "mock" : stryMutAct_9fa48("15936") ? true : (stryCov_9fa48("15936", "15937"), (stryMutAct_9fa48("15939") ? value.source !== undefined : stryMutAct_9fa48("15938") ? false : (stryCov_9fa48("15938", "15939"), value.source === undefined)) || (stryMutAct_9fa48("15941") ? value.source === "m1" || value.mode !== "mock" : stryMutAct_9fa48("15940") ? false : (stryCov_9fa48("15940", "15941"), (stryMutAct_9fa48("15943") ? value.source !== "m1" : stryMutAct_9fa48("15942") ? true : (stryCov_9fa48("15942", "15943"), value.source === (stryMutAct_9fa48("15944") ? "" : (stryCov_9fa48("15944"), "m1")))) && (stryMutAct_9fa48("15946") ? value.mode === "mock" : stryMutAct_9fa48("15945") ? true : (stryCov_9fa48("15945", "15946"), value.mode !== (stryMutAct_9fa48("15947") ? "" : (stryCov_9fa48("15947"), "mock")))))))))) && (stryMutAct_9fa48("15949") ? value.refreshToken === undefined && value.mode !== "mock" && typeof value.refreshToken === "string" : stryMutAct_9fa48("15948") ? true : (stryCov_9fa48("15948", "15949"), (stryMutAct_9fa48("15951") ? value.refreshToken !== undefined : stryMutAct_9fa48("15950") ? false : (stryCov_9fa48("15950", "15951"), value.refreshToken === undefined)) || (stryMutAct_9fa48("15953") ? value.mode !== "mock" || typeof value.refreshToken === "string" : stryMutAct_9fa48("15952") ? false : (stryCov_9fa48("15952", "15953"), (stryMutAct_9fa48("15955") ? value.mode === "mock" : stryMutAct_9fa48("15954") ? true : (stryCov_9fa48("15954", "15955"), value.mode !== (stryMutAct_9fa48("15956") ? "" : (stryCov_9fa48("15956"), "mock")))) && (stryMutAct_9fa48("15958") ? typeof value.refreshToken !== "string" : stryMutAct_9fa48("15957") ? true : (stryCov_9fa48("15957", "15958"), typeof value.refreshToken === (stryMutAct_9fa48("15959") ? "" : (stryCov_9fa48("15959"), "string")))))))))) && (stryMutAct_9fa48("15961") ? value.mode !== "real-m1" && value.source === "m1" && typeof value.refreshToken === "string" && typeof value.identity?.userId === "string" && value.identity.subType === "EMPLEADO" && typeof value.identity.m1Role === "string" : stryMutAct_9fa48("15960") ? true : (stryCov_9fa48("15960", "15961"), (stryMutAct_9fa48("15963") ? value.mode === "real-m1" : stryMutAct_9fa48("15962") ? false : (stryCov_9fa48("15962", "15963"), value.mode !== (stryMutAct_9fa48("15964") ? "" : (stryCov_9fa48("15964"), "real-m1")))) || (stryMutAct_9fa48("15966") ? value.source === "m1" && typeof value.refreshToken === "string" && typeof value.identity?.userId === "string" && value.identity.subType === "EMPLEADO" || typeof value.identity.m1Role === "string" : stryMutAct_9fa48("15965") ? false : (stryCov_9fa48("15965", "15966"), (stryMutAct_9fa48("15968") ? value.source === "m1" && typeof value.refreshToken === "string" && typeof value.identity?.userId === "string" || value.identity.subType === "EMPLEADO" : stryMutAct_9fa48("15967") ? true : (stryCov_9fa48("15967", "15968"), (stryMutAct_9fa48("15970") ? value.source === "m1" && typeof value.refreshToken === "string" || typeof value.identity?.userId === "string" : stryMutAct_9fa48("15969") ? true : (stryCov_9fa48("15969", "15970"), (stryMutAct_9fa48("15972") ? value.source === "m1" || typeof value.refreshToken === "string" : stryMutAct_9fa48("15971") ? true : (stryCov_9fa48("15971", "15972"), (stryMutAct_9fa48("15974") ? value.source !== "m1" : stryMutAct_9fa48("15973") ? true : (stryCov_9fa48("15973", "15974"), value.source === (stryMutAct_9fa48("15975") ? "" : (stryCov_9fa48("15975"), "m1")))) && (stryMutAct_9fa48("15977") ? typeof value.refreshToken !== "string" : stryMutAct_9fa48("15976") ? true : (stryCov_9fa48("15976", "15977"), typeof value.refreshToken === (stryMutAct_9fa48("15978") ? "" : (stryCov_9fa48("15978"), "string")))))) && (stryMutAct_9fa48("15980") ? typeof value.identity?.userId !== "string" : stryMutAct_9fa48("15979") ? true : (stryCov_9fa48("15979", "15980"), typeof (stryMutAct_9fa48("15981") ? value.identity.userId : (stryCov_9fa48("15981"), value.identity?.userId)) === (stryMutAct_9fa48("15982") ? "" : (stryCov_9fa48("15982"), "string")))))) && (stryMutAct_9fa48("15984") ? value.identity.subType !== "EMPLEADO" : stryMutAct_9fa48("15983") ? true : (stryCov_9fa48("15983", "15984"), value.identity.subType === (stryMutAct_9fa48("15985") ? "" : (stryCov_9fa48("15985"), "EMPLEADO")))))) && (stryMutAct_9fa48("15987") ? typeof value.identity.m1Role !== "string" : stryMutAct_9fa48("15986") ? true : (stryCov_9fa48("15986", "15987"), typeof value.identity.m1Role === (stryMutAct_9fa48("15988") ? "" : (stryCov_9fa48("15988"), "string")))))))))) && (stryMutAct_9fa48("15990") ? (value.fieldRole === undefined || value.fieldRole === "CREW_LEADER") && value.fieldRole === "CREW_MEMBER" : stryMutAct_9fa48("15989") ? true : (stryCov_9fa48("15989", "15990"), (stryMutAct_9fa48("15992") ? value.fieldRole === undefined && value.fieldRole === "CREW_LEADER" : stryMutAct_9fa48("15991") ? false : (stryCov_9fa48("15991", "15992"), (stryMutAct_9fa48("15994") ? value.fieldRole !== undefined : stryMutAct_9fa48("15993") ? false : (stryCov_9fa48("15993", "15994"), value.fieldRole === undefined)) || (stryMutAct_9fa48("15996") ? value.fieldRole !== "CREW_LEADER" : stryMutAct_9fa48("15995") ? false : (stryCov_9fa48("15995", "15996"), value.fieldRole === (stryMutAct_9fa48("15997") ? "" : (stryCov_9fa48("15997"), "CREW_LEADER")))))) || (stryMutAct_9fa48("15999") ? value.fieldRole !== "CREW_MEMBER" : stryMutAct_9fa48("15998") ? false : (stryCov_9fa48("15998", "15999"), value.fieldRole === (stryMutAct_9fa48("16000") ? "" : (stryCov_9fa48("16000"), "CREW_MEMBER")))))))) && (stryMutAct_9fa48("16002") ? value.crew === undefined && typeof value.crew?.id === "string" && typeof value.crew?.name === "string" : stryMutAct_9fa48("16001") ? true : (stryCov_9fa48("16001", "16002"), (stryMutAct_9fa48("16004") ? value.crew !== undefined : stryMutAct_9fa48("16003") ? false : (stryCov_9fa48("16003", "16004"), value.crew === undefined)) || (stryMutAct_9fa48("16006") ? typeof value.crew?.id === "string" || typeof value.crew?.name === "string" : stryMutAct_9fa48("16005") ? false : (stryCov_9fa48("16005", "16006"), (stryMutAct_9fa48("16008") ? typeof value.crew?.id !== "string" : stryMutAct_9fa48("16007") ? true : (stryCov_9fa48("16007", "16008"), typeof (stryMutAct_9fa48("16009") ? value.crew.id : (stryCov_9fa48("16009"), value.crew?.id)) === (stryMutAct_9fa48("16010") ? "" : (stryCov_9fa48("16010"), "string")))) && (stryMutAct_9fa48("16012") ? typeof value.crew?.name !== "string" : stryMutAct_9fa48("16011") ? true : (stryCov_9fa48("16011", "16012"), typeof (stryMutAct_9fa48("16013") ? value.crew.name : (stryCov_9fa48("16013"), value.crew?.name)) === (stryMutAct_9fa48("16014") ? "" : (stryCov_9fa48("16014"), "string")))))))));
  }
}