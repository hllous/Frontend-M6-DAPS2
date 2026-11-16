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
import { BackendUnavailableError, InvalidSessionError, persistRenewedSession, readJwtExpiry, readJwtSubject, rememberRenewedSession, isLoopbackHostname, type Session } from "./session";

/** Se renueva cuando al access token le queda menos que esto (M1: 15 min de vida). */
export const REFRESH_LEEWAY_MS = 60_000;
export const PREVENTIVE_TIMEOUT_MS = 4_000;
export const REACTIVE_TIMEOUT_MS = 15_000;
const MAX_BODY_CHARS = 8_192;
// Access + refresh tienen que caber juntos en la cookie sellada (3800 bytes).
const MAX_TOKEN_CHARS = 1_200;
const MAX_LIFETIME_MS = stryMutAct_9fa48("10923") ? 24 * 60 * 60 / 1000 : (stryCov_9fa48("10923"), (stryMutAct_9fa48("10924") ? 24 * 60 / 60 : (stryCov_9fa48("10924"), (stryMutAct_9fa48("10925") ? 24 / 60 : (stryCov_9fa48("10925"), 24 * 60)) * 60)) * 1000);
const JWT_SHAPE = stryMutAct_9fa48("10936") ? /^[\w-]+\.[\w-]+\.[\W-]+$/ : stryMutAct_9fa48("10935") ? /^[\w-]+\.[\w-]+\.[^\w-]+$/ : stryMutAct_9fa48("10934") ? /^[\w-]+\.[\w-]+\.[\w-]$/ : stryMutAct_9fa48("10933") ? /^[\w-]+\.[\W-]+\.[\w-]+$/ : stryMutAct_9fa48("10932") ? /^[\w-]+\.[^\w-]+\.[\w-]+$/ : stryMutAct_9fa48("10931") ? /^[\w-]+\.[\w-]\.[\w-]+$/ : stryMutAct_9fa48("10930") ? /^[\W-]+\.[\w-]+\.[\w-]+$/ : stryMutAct_9fa48("10929") ? /^[^\w-]+\.[\w-]+\.[\w-]+$/ : stryMutAct_9fa48("10928") ? /^[\w-]\.[\w-]+\.[\w-]+$/ : stryMutAct_9fa48("10927") ? /^[\w-]+\.[\w-]+\.[\w-]+/ : stryMutAct_9fa48("10926") ? /[\w-]+\.[\w-]+\.[\w-]+$/ : (stryCov_9fa48("10926", "10927", "10928", "10929", "10930", "10931", "10932", "10933", "10934", "10935", "10936"), /^[\w-]+\.[\w-]+\.[\w-]+$/);
// Pedidos en paralelo comparten una sola renovación: si M1 rota el refresh token, un segundo intento con el viejo fallaría.
// Se memoizan solo los tokens (cada pedido los mezcla con SU sesión). Un fallo de red/5xx se memoriza menos tiempo.
// ponytail: solo dentro de una instancia; entre instancias serverless distintas sigue la carrera. Subir a un store compartido si M1 rota.
export const MEMO_MS = 10_000;
export const FAILURE_MEMO_MS = 5_000;

/** Sesión con material de M1 renovable: lo que `canRenew` garantiza. */
export type RenewableSession = Session & {
  accessToken: string;
  refreshToken: string;
  source: "m1";
};
type Renewal = {
  accessToken: string;
  refreshToken: string;
  jwtExpiresAt: number;
};
const renewals = new Map<string, {
  at: number;
  ttl: number;
  result: Promise<Renewal | null>;
}>();
let warnedInvalidBase = stryMutAct_9fa48("10937") ? true : (stryCov_9fa48("10937"), false);

/** `M1_BASE_URL` válida: URL absoluta, sin credenciales; HTTP solo para loopback. Inválida o ausente → undefined. */
export function m1BaseUrl(): URL | undefined {
  if (stryMutAct_9fa48("10938")) {
    {}
  } else {
    stryCov_9fa48("10938");
    const raw = process.env.M1_BASE_URL;
    if (stryMutAct_9fa48("10941") ? false : stryMutAct_9fa48("10940") ? true : stryMutAct_9fa48("10939") ? raw : (stryCov_9fa48("10939", "10940", "10941"), !raw)) return undefined;
    try {
      if (stryMutAct_9fa48("10942")) {
        {}
      } else {
        stryCov_9fa48("10942");
        const url = new URL(raw.replace(stryMutAct_9fa48("10944") ? /\/$/ : stryMutAct_9fa48("10943") ? /\/?/ : (stryCov_9fa48("10943", "10944"), /\/?$/), stryMutAct_9fa48("10945") ? "" : (stryCov_9fa48("10945"), "/")));
        const localHost = isLoopbackHostname(url.hostname);
        const protocolOk = stryMutAct_9fa48("10948") ? url.protocol === "https:" && url.protocol === "http:" && localHost && process.env.NODE_ENV !== "production" : stryMutAct_9fa48("10947") ? false : stryMutAct_9fa48("10946") ? true : (stryCov_9fa48("10946", "10947", "10948"), (stryMutAct_9fa48("10950") ? url.protocol !== "https:" : stryMutAct_9fa48("10949") ? false : (stryCov_9fa48("10949", "10950"), url.protocol === (stryMutAct_9fa48("10951") ? "" : (stryCov_9fa48("10951"), "https:")))) || (stryMutAct_9fa48("10953") ? url.protocol === "http:" && localHost || process.env.NODE_ENV !== "production" : stryMutAct_9fa48("10952") ? false : (stryCov_9fa48("10952", "10953"), (stryMutAct_9fa48("10955") ? url.protocol === "http:" || localHost : stryMutAct_9fa48("10954") ? true : (stryCov_9fa48("10954", "10955"), (stryMutAct_9fa48("10957") ? url.protocol !== "http:" : stryMutAct_9fa48("10956") ? true : (stryCov_9fa48("10956", "10957"), url.protocol === (stryMutAct_9fa48("10958") ? "" : (stryCov_9fa48("10958"), "http:")))) && localHost)) && (stryMutAct_9fa48("10960") ? process.env.NODE_ENV === "production" : stryMutAct_9fa48("10959") ? true : (stryCov_9fa48("10959", "10960"), process.env.NODE_ENV !== (stryMutAct_9fa48("10961") ? "" : (stryCov_9fa48("10961"), "production")))))));
        const productionSafe = stryMutAct_9fa48("10964") ? process.env.NODE_ENV !== "production" && !localHost && process.env.M1_FAKE_ENABLED !== "true" : stryMutAct_9fa48("10963") ? false : stryMutAct_9fa48("10962") ? true : (stryCov_9fa48("10962", "10963", "10964"), (stryMutAct_9fa48("10966") ? process.env.NODE_ENV === "production" : stryMutAct_9fa48("10965") ? false : (stryCov_9fa48("10965", "10966"), process.env.NODE_ENV !== (stryMutAct_9fa48("10967") ? "" : (stryCov_9fa48("10967"), "production")))) || (stryMutAct_9fa48("10969") ? !localHost || process.env.M1_FAKE_ENABLED !== "true" : stryMutAct_9fa48("10968") ? false : (stryCov_9fa48("10968", "10969"), (stryMutAct_9fa48("10970") ? localHost : (stryCov_9fa48("10970"), !localHost)) && (stryMutAct_9fa48("10972") ? process.env.M1_FAKE_ENABLED === "true" : stryMutAct_9fa48("10971") ? true : (stryCov_9fa48("10971", "10972"), process.env.M1_FAKE_ENABLED !== (stryMutAct_9fa48("10973") ? "" : (stryCov_9fa48("10973"), "true")))))));
        if (stryMutAct_9fa48("10976") ? protocolOk && productionSafe && !url.username || !url.password : stryMutAct_9fa48("10975") ? false : stryMutAct_9fa48("10974") ? true : (stryCov_9fa48("10974", "10975", "10976"), (stryMutAct_9fa48("10978") ? protocolOk && productionSafe || !url.username : stryMutAct_9fa48("10977") ? true : (stryCov_9fa48("10977", "10978"), (stryMutAct_9fa48("10980") ? protocolOk || productionSafe : stryMutAct_9fa48("10979") ? true : (stryCov_9fa48("10979", "10980"), protocolOk && productionSafe)) && (stryMutAct_9fa48("10981") ? url.username : (stryCov_9fa48("10981"), !url.username)))) && (stryMutAct_9fa48("10982") ? url.password : (stryCov_9fa48("10982"), !url.password)))) return url;
      }
    } catch {
      // cae al aviso
    }
    if (stryMutAct_9fa48("10985") ? false : stryMutAct_9fa48("10984") ? true : stryMutAct_9fa48("10983") ? warnedInvalidBase : (stryCov_9fa48("10983", "10984", "10985"), !warnedInvalidBase)) {
      if (stryMutAct_9fa48("10986")) {
        {}
      } else {
        stryCov_9fa48("10986");
        warnedInvalidBase = stryMutAct_9fa48("10987") ? false : (stryCov_9fa48("10987"), true);
        console.error(stryMutAct_9fa48("10989") ? "" : (stryCov_9fa48("10989"), "[m1-refresh] M1_BASE_URL no es válida (URL absoluta, HTTPS salvo HTTP de loopback, sin credenciales); la renovación queda deshabilitada."));
      }
    }
    return undefined;
  }
}

/** Hay con qué renovar: el login real de M1 dejó un refresh token en la sesión y M1_BASE_URL es válida. */
export function canRenew(session: Session): session is RenewableSession {
  if (stryMutAct_9fa48("10990")) {
    {}
  } else {
    stryCov_9fa48("10990");
    return stryMutAct_9fa48("10993") ? session.source === "m1" && Boolean(session.refreshToken && session.accessToken) || m1BaseUrl() !== undefined : stryMutAct_9fa48("10992") ? false : stryMutAct_9fa48("10991") ? true : (stryCov_9fa48("10991", "10992", "10993"), (stryMutAct_9fa48("10995") ? session.source === "m1" || Boolean(session.refreshToken && session.accessToken) : stryMutAct_9fa48("10994") ? true : (stryCov_9fa48("10994", "10995"), (stryMutAct_9fa48("10997") ? session.source !== "m1" : stryMutAct_9fa48("10996") ? true : (stryCov_9fa48("10996", "10997"), session.source === (stryMutAct_9fa48("10998") ? "" : (stryCov_9fa48("10998"), "m1")))) && Boolean(stryMutAct_9fa48("11001") ? session.refreshToken || session.accessToken : stryMutAct_9fa48("11000") ? false : stryMutAct_9fa48("10999") ? true : (stryCov_9fa48("10999", "11000", "11001"), session.refreshToken && session.accessToken)))) && (stryMutAct_9fa48("11003") ? m1BaseUrl() === undefined : stryMutAct_9fa48("11002") ? true : (stryCov_9fa48("11002", "11003"), m1BaseUrl() !== undefined)));
  }
}
export function isNearExpiry(session: Session, now = Date.now()): boolean {
  if (stryMutAct_9fa48("11004")) {
    {}
  } else {
    stryCov_9fa48("11004");
    return stryMutAct_9fa48("11008") ? session.jwtExpiresAt - now > REFRESH_LEEWAY_MS : stryMutAct_9fa48("11007") ? session.jwtExpiresAt - now < REFRESH_LEEWAY_MS : stryMutAct_9fa48("11006") ? false : stryMutAct_9fa48("11005") ? true : (stryCov_9fa48("11005", "11006", "11007", "11008"), (stryMutAct_9fa48("11009") ? session.jwtExpiresAt + now : (stryCov_9fa48("11009"), session.jwtExpiresAt - now)) <= REFRESH_LEEWAY_MS);
  }
}

/**
 * `POST /auth/refresh` de M1 (Catálogo v3.0 §8, 204). Aún no verificado contra M1 hosteado: el contrato no define
 * cómo se manda el refresh token ni dónde vienen los tokens nuevos. Supuestos, simétricos al login: el refresh viaja en
 * `X-Refresh-Token`; los tokens nuevos vuelven en `Authorization: Bearer` y `X-Refresh-Token` (o, si no, en un JSON
 * `{ accessToken, refreshToken }`); sin `X-Refresh-Token` nuevo se conserva el anterior.
 * Devuelve `null` solo si M1 rechaza el refresh (400/401/403) o el `sub` cambió (señal de seguridad); lanza
 * BackendUnavailableError para cualquier otra cosa (otro estado, no responde, cuerpo inutilizable): una falla de M1 no desloguea.
 */
export function refreshSession(session: RenewableSession, options: {
  now?: number;
  timeoutMs?: number;
} = {}): Promise<Session | null> {
  if (stryMutAct_9fa48("11010")) {
    {}
  } else {
    stryCov_9fa48("11010");
    const now = stryMutAct_9fa48("11011") ? options.now && Date.now() : (stryCov_9fa48("11011"), options.now ?? Date.now());
    const key = session.refreshToken;
    for (const [token, known] of renewals) if (stryMutAct_9fa48("11015") ? now - known.at < known.ttl : stryMutAct_9fa48("11014") ? now - known.at > known.ttl : stryMutAct_9fa48("11013") ? false : stryMutAct_9fa48("11012") ? true : (stryCov_9fa48("11012", "11013", "11014", "11015"), (stryMutAct_9fa48("11016") ? now + known.at : (stryCov_9fa48("11016"), now - known.at)) >= known.ttl)) if (stryMutAct_9fa48("11017")) {
      ;
    } else {
      stryCov_9fa48("11017");
      renewals.delete(token);
    }
    let entry = renewals.get(key);
    if (stryMutAct_9fa48("11020") ? false : stryMutAct_9fa48("11019") ? true : stryMutAct_9fa48("11018") ? entry : (stryCov_9fa48("11018", "11019", "11020"), !entry)) {
      if (stryMutAct_9fa48("11021")) {
        {}
      } else {
        stryCov_9fa48("11021");
        const created = stryMutAct_9fa48("11022") ? {} : (stryCov_9fa48("11022"), {
          at: now,
          ttl: MEMO_MS,
          result: callM1(key, stryMutAct_9fa48("11023") ? options.timeoutMs && REACTIVE_TIMEOUT_MS : (stryCov_9fa48("11023"), options.timeoutMs ?? REACTIVE_TIMEOUT_MS), now)
        });
        created.result.catch(() => {
          if (stryMutAct_9fa48("11025")) {
            {}
          } else {
            stryCov_9fa48("11025");
            created.at = Date.now();
            created.ttl = FAILURE_MEMO_MS;
          }
        });
        if (stryMutAct_9fa48("11026")) {
          ;
        } else {
          stryCov_9fa48("11026");
          renewals.set(key, created);
        }
        entry = created;
      }
    }
    return entry.result.then(renewal => {
      if (stryMutAct_9fa48("11027")) {
        {}
      } else {
        stryCov_9fa48("11027");
        if (stryMutAct_9fa48("11030") ? false : stryMutAct_9fa48("11029") ? true : stryMutAct_9fa48("11028") ? renewal : (stryCov_9fa48("11028", "11029", "11030"), !renewal)) return null;
        // El mismo usuario: si el `sub` cambió, M1 devolvió la sesión de otra persona y no se acepta.
        const previousSubject = readJwtSubject(session.accessToken);
        if (stryMutAct_9fa48("11033") ? previousSubject === undefined && previousSubject !== readJwtSubject(renewal.accessToken) : stryMutAct_9fa48("11032") ? false : stryMutAct_9fa48("11031") ? true : (stryCov_9fa48("11031", "11032", "11033"), (stryMutAct_9fa48("11035") ? previousSubject !== undefined : stryMutAct_9fa48("11034") ? false : (stryCov_9fa48("11034", "11035"), previousSubject === undefined)) || (stryMutAct_9fa48("11037") ? previousSubject === readJwtSubject(renewal.accessToken) : stryMutAct_9fa48("11036") ? false : (stryCov_9fa48("11036", "11037"), previousSubject !== readJwtSubject(renewal.accessToken))))) return null;
        return stryMutAct_9fa48("11038") ? {} : (stryCov_9fa48("11038"), {
          ...session,
          ...renewal,
          lastActivityAt: now
        });
      }
    });
  }
}
async function callM1(refreshToken: string, timeoutMs: number, now: number): Promise<Renewal | null> {
  if (stryMutAct_9fa48("11039")) {
    {}
  } else {
    stryCov_9fa48("11039");
    const unavailable = stryMutAct_9fa48("11040") ? () => undefined : (stryCov_9fa48("11040"), (() => {
      const unavailable = () => new BackendUnavailableError(503, stryMutAct_9fa48("11041") ? "" : (stryCov_9fa48("11041"), "El servicio de ingreso no responde. Reintente en unos segundos."));
      return unavailable;
    })());
    const base = m1BaseUrl();
    if (stryMutAct_9fa48("11044") ? false : stryMutAct_9fa48("11043") ? true : stryMutAct_9fa48("11042") ? base : (stryCov_9fa48("11042", "11043", "11044"), !base)) throw unavailable();
    let response: Response;
    try {
      if (stryMutAct_9fa48("11045")) {
        {}
      } else {
        stryCov_9fa48("11045");
        response = await fetch(new URL(stryMutAct_9fa48("11046") ? "" : (stryCov_9fa48("11046"), "auth/refresh"), base), stryMutAct_9fa48("11047") ? {} : (stryCov_9fa48("11047"), {
          method: stryMutAct_9fa48("11048") ? "" : (stryCov_9fa48("11048"), "POST"),
          headers: stryMutAct_9fa48("11049") ? {} : (stryCov_9fa48("11049"), {
            "X-Refresh-Token": refreshToken
          }),
          redirect: stryMutAct_9fa48("11050") ? "" : (stryCov_9fa48("11050"), "error"),
          // Sin el signal del primer llamador: la llamada es compartida y, si M1 ya rotó el token, abortarla lo perdería.
          signal: AbortSignal.timeout(timeoutMs)
        }));
      }
    } catch {
      if (stryMutAct_9fa48("11051")) {
        {}
      } else {
        stryCov_9fa48("11051");
        throw unavailable();
      }
    }
    if (stryMutAct_9fa48("11053") ? false : stryMutAct_9fa48("11052") ? true : (stryCov_9fa48("11052", "11053"), (stryMutAct_9fa48("11054") ? [] : (stryCov_9fa48("11054"), [400, 401, 403])).includes(response.status))) return null;
    if (stryMutAct_9fa48("11057") ? false : stryMutAct_9fa48("11056") ? true : stryMutAct_9fa48("11055") ? response.ok : (stryCov_9fa48("11055", "11056", "11057"), !response.ok)) throw unavailable();
    if (stryMutAct_9fa48("11061") ? Number(response.headers.get("content-length")) <= MAX_BODY_CHARS : stryMutAct_9fa48("11060") ? Number(response.headers.get("content-length")) >= MAX_BODY_CHARS : stryMutAct_9fa48("11059") ? false : stryMutAct_9fa48("11058") ? true : (stryCov_9fa48("11058", "11059", "11060", "11061"), Number(response.headers.get(stryMutAct_9fa48("11062") ? "" : (stryCov_9fa48("11062"), "content-length"))) > MAX_BODY_CHARS)) throw unavailable();
    const text = await response.text().catch(stryMutAct_9fa48("11063") ? () => undefined : (stryCov_9fa48("11063"), () => stryMutAct_9fa48("11064") ? "Stryker was here!" : (stryCov_9fa48("11064"), "")));
    if (stryMutAct_9fa48("11068") ? text.length <= MAX_BODY_CHARS : stryMutAct_9fa48("11067") ? text.length >= MAX_BODY_CHARS : stryMutAct_9fa48("11066") ? false : stryMutAct_9fa48("11065") ? true : (stryCov_9fa48("11065", "11066", "11067", "11068"), text.length > MAX_BODY_CHARS)) throw unavailable();
    let body: {
      accessToken?: unknown;
      refreshToken?: unknown;
    } | undefined;
    try {
      if (stryMutAct_9fa48("11069")) {
        {}
      } else {
        stryCov_9fa48("11069");
        body = text ? JSON.parse(text) : undefined;
      }
    } catch {
      if (stryMutAct_9fa48("11070")) {
        {}
      } else {
        stryCov_9fa48("11070");
        body = undefined;
      }
    }
    const bearer = stryMutAct_9fa48("11072") ? response.headers.get("authorization").match(/^Bearer\s+(.+)$/i)?.[1] : stryMutAct_9fa48("11071") ? response.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)[1] : (stryCov_9fa48("11071", "11072"), response.headers.get(stryMutAct_9fa48("11073") ? "" : (stryCov_9fa48("11073"), "authorization"))?.match(stryMutAct_9fa48("11078") ? /^Bearer\s+(.)$/i : stryMutAct_9fa48("11077") ? /^Bearer\S+(.+)$/i : stryMutAct_9fa48("11076") ? /^Bearer\s(.+)$/i : stryMutAct_9fa48("11075") ? /^Bearer\s+(.+)/i : stryMutAct_9fa48("11074") ? /Bearer\s+(.+)$/i : (stryCov_9fa48("11074", "11075", "11076", "11077", "11078"), /^Bearer\s+(.+)$/i))?.[1]);
    const accessToken = stryMutAct_9fa48("11079") ? bearer && (typeof body?.accessToken === "string" ? body.accessToken : undefined) : (stryCov_9fa48("11079"), bearer ?? ((stryMutAct_9fa48("11082") ? typeof body?.accessToken !== "string" : stryMutAct_9fa48("11081") ? false : stryMutAct_9fa48("11080") ? true : (stryCov_9fa48("11080", "11081", "11082"), typeof (stryMutAct_9fa48("11083") ? body.accessToken : (stryCov_9fa48("11083"), body?.accessToken)) === (stryMutAct_9fa48("11084") ? "" : (stryCov_9fa48("11084"), "string")))) ? body.accessToken : undefined));
    if (stryMutAct_9fa48("11087") ? (!accessToken || accessToken.length > MAX_TOKEN_CHARS) && !JWT_SHAPE.test(accessToken) : stryMutAct_9fa48("11086") ? false : stryMutAct_9fa48("11085") ? true : (stryCov_9fa48("11085", "11086", "11087"), (stryMutAct_9fa48("11089") ? !accessToken && accessToken.length > MAX_TOKEN_CHARS : stryMutAct_9fa48("11088") ? false : (stryCov_9fa48("11088", "11089"), (stryMutAct_9fa48("11090") ? accessToken : (stryCov_9fa48("11090"), !accessToken)) || (stryMutAct_9fa48("11093") ? accessToken.length <= MAX_TOKEN_CHARS : stryMutAct_9fa48("11092") ? accessToken.length >= MAX_TOKEN_CHARS : stryMutAct_9fa48("11091") ? false : (stryCov_9fa48("11091", "11092", "11093"), accessToken.length > MAX_TOKEN_CHARS)))) || (stryMutAct_9fa48("11094") ? JWT_SHAPE.test(accessToken) : (stryCov_9fa48("11094"), !JWT_SHAPE.test(accessToken))))) throw unavailable();
    const expiresIn = Number(response.headers.get(stryMutAct_9fa48("11095") ? "" : (stryCov_9fa48("11095"), "x-token-expires-in")));
    const jwtExpiresAt = stryMutAct_9fa48("11096") ? readJwtExpiry(accessToken) && (expiresIn > 0 ? now + expiresIn * 1000 : undefined) : (stryCov_9fa48("11096"), readJwtExpiry(accessToken) ?? ((stryMutAct_9fa48("11100") ? expiresIn <= 0 : stryMutAct_9fa48("11099") ? expiresIn >= 0 : stryMutAct_9fa48("11098") ? false : stryMutAct_9fa48("11097") ? true : (stryCov_9fa48("11097", "11098", "11099", "11100"), expiresIn > 0)) ? stryMutAct_9fa48("11101") ? now - expiresIn * 1000 : (stryCov_9fa48("11101"), now + (stryMutAct_9fa48("11102") ? expiresIn / 1000 : (stryCov_9fa48("11102"), expiresIn * 1000))) : undefined));
    if (stryMutAct_9fa48("11105") ? (jwtExpiresAt === undefined || !Number.isFinite(jwtExpiresAt) || jwtExpiresAt <= now) && jwtExpiresAt > now + MAX_LIFETIME_MS : stryMutAct_9fa48("11104") ? false : stryMutAct_9fa48("11103") ? true : (stryCov_9fa48("11103", "11104", "11105"), (stryMutAct_9fa48("11107") ? (jwtExpiresAt === undefined || !Number.isFinite(jwtExpiresAt)) && jwtExpiresAt <= now : stryMutAct_9fa48("11106") ? false : (stryCov_9fa48("11106", "11107"), (stryMutAct_9fa48("11109") ? jwtExpiresAt === undefined && !Number.isFinite(jwtExpiresAt) : stryMutAct_9fa48("11108") ? false : (stryCov_9fa48("11108", "11109"), (stryMutAct_9fa48("11111") ? jwtExpiresAt !== undefined : stryMutAct_9fa48("11110") ? false : (stryCov_9fa48("11110", "11111"), jwtExpiresAt === undefined)) || (stryMutAct_9fa48("11112") ? Number.isFinite(jwtExpiresAt) : (stryCov_9fa48("11112"), !Number.isFinite(jwtExpiresAt))))) || (stryMutAct_9fa48("11115") ? jwtExpiresAt > now : stryMutAct_9fa48("11114") ? jwtExpiresAt < now : stryMutAct_9fa48("11113") ? false : (stryCov_9fa48("11113", "11114", "11115"), jwtExpiresAt <= now)))) || (stryMutAct_9fa48("11118") ? jwtExpiresAt <= now + MAX_LIFETIME_MS : stryMutAct_9fa48("11117") ? jwtExpiresAt >= now + MAX_LIFETIME_MS : stryMutAct_9fa48("11116") ? false : (stryCov_9fa48("11116", "11117", "11118"), jwtExpiresAt > (stryMutAct_9fa48("11119") ? now - MAX_LIFETIME_MS : (stryCov_9fa48("11119"), now + MAX_LIFETIME_MS)))))) {
      if (stryMutAct_9fa48("11120")) {
        {}
      } else {
        stryCov_9fa48("11120");
        throw unavailable();
      }
    }
    const next = stryMutAct_9fa48("11121") ? response.headers.get("x-refresh-token") && (typeof body?.refreshToken === "string" ? body.refreshToken : undefined) : (stryCov_9fa48("11121"), response.headers.get(stryMutAct_9fa48("11122") ? "" : (stryCov_9fa48("11122"), "x-refresh-token")) ?? ((stryMutAct_9fa48("11125") ? typeof body?.refreshToken !== "string" : stryMutAct_9fa48("11124") ? false : stryMutAct_9fa48("11123") ? true : (stryCov_9fa48("11123", "11124", "11125"), typeof (stryMutAct_9fa48("11126") ? body.refreshToken : (stryCov_9fa48("11126"), body?.refreshToken)) === (stryMutAct_9fa48("11127") ? "" : (stryCov_9fa48("11127"), "string")))) ? body.refreshToken : undefined));
    if (stryMutAct_9fa48("11130") ? next !== undefined || next.length === 0 || next.length > MAX_TOKEN_CHARS : stryMutAct_9fa48("11129") ? false : stryMutAct_9fa48("11128") ? true : (stryCov_9fa48("11128", "11129", "11130"), (stryMutAct_9fa48("11132") ? next === undefined : stryMutAct_9fa48("11131") ? true : (stryCov_9fa48("11131", "11132"), next !== undefined)) && (stryMutAct_9fa48("11134") ? next.length === 0 && next.length > MAX_TOKEN_CHARS : stryMutAct_9fa48("11133") ? true : (stryCov_9fa48("11133", "11134"), (stryMutAct_9fa48("11136") ? next.length !== 0 : stryMutAct_9fa48("11135") ? false : (stryCov_9fa48("11135", "11136"), next.length === 0)) || (stryMutAct_9fa48("11139") ? next.length <= MAX_TOKEN_CHARS : stryMutAct_9fa48("11138") ? next.length >= MAX_TOKEN_CHARS : stryMutAct_9fa48("11137") ? false : (stryCov_9fa48("11137", "11138", "11139"), next.length > MAX_TOKEN_CHARS)))))) throw unavailable();
    return stryMutAct_9fa48("11140") ? {} : (stryCov_9fa48("11140"), {
      accessToken,
      refreshToken: stryMutAct_9fa48("11141") ? next && refreshToken : (stryCov_9fa48("11141"), next ?? refreshToken),
      jwtExpiresAt
    });
  }
}

/**
 * Renueva la sesión del pedido y la deja visible para el resto del pedido y en la cookie de la respuesta. Si M1 rechaza
 * el refresh, la sesión muere (InvalidSessionError → 401 → el cliente cierra y va al login). `tolerateUnavailable`: en
 * la renovación preventiva, si M1 no responde se sigue con el token vigente.
 */
export async function renewRequestSession<T extends RenewableSession>(request: Request, session: T, options: {
  tolerateUnavailable: boolean;
}): Promise<T> {
  if (stryMutAct_9fa48("11142")) {
    {}
  } else {
    stryCov_9fa48("11142");
    let next: Session | null;
    try {
      if (stryMutAct_9fa48("11143")) {
        {}
      } else {
        stryCov_9fa48("11143");
        next = await refreshSession(session, stryMutAct_9fa48("11144") ? {} : (stryCov_9fa48("11144"), {
          timeoutMs: options.tolerateUnavailable ? PREVENTIVE_TIMEOUT_MS : REACTIVE_TIMEOUT_MS
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("11145")) {
        {}
      } else {
        stryCov_9fa48("11145");
        if (stryMutAct_9fa48("11148") ? options.tolerateUnavailable || error instanceof BackendUnavailableError : stryMutAct_9fa48("11147") ? false : stryMutAct_9fa48("11146") ? true : (stryCov_9fa48("11146", "11147", "11148"), options.tolerateUnavailable && error instanceof BackendUnavailableError)) return session;
        throw error;
      }
    }
    if (stryMutAct_9fa48("11151") ? false : stryMutAct_9fa48("11150") ? true : stryMutAct_9fa48("11149") ? next : (stryCov_9fa48("11149", "11150", "11151"), !next)) throw new InvalidSessionError(stryMutAct_9fa48("11153") ? "" : (stryCov_9fa48("11153"), "No pudimos confirmar su sesión. Vuelva a ingresar."));
    if (stryMutAct_9fa48("11154")) {
      ;
    } else {
      stryCov_9fa48("11154");
      rememberRenewedSession(request, next);
    }
    await persistRenewedSession(next, request);
    return next as T;
  }
}