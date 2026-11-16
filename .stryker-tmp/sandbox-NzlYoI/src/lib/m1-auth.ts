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
import { m1BaseUrl } from "./m1-refresh";
const MAX_BODY_CHARS = 8_192;
const MAX_TOKEN_CHARS = 1_200;
const MAX_ACCESS_LIFETIME_MS = stryMutAct_9fa48("10632") ? 24 * 60 * 60 / 1000 : (stryCov_9fa48("10632"), (stryMutAct_9fa48("10633") ? 24 * 60 / 60 : (stryCov_9fa48("10633"), (stryMutAct_9fa48("10634") ? 24 / 60 : (stryCov_9fa48("10634"), 24 * 60)) * 60)) * 1000);
export const LOGIN_TIMEOUT_MS = 90_000;
const JWT_SHAPE = stryMutAct_9fa48("10645") ? /^[\w-]+\.[\w-]+\.[\W-]+$/ : stryMutAct_9fa48("10644") ? /^[\w-]+\.[\w-]+\.[^\w-]+$/ : stryMutAct_9fa48("10643") ? /^[\w-]+\.[\w-]+\.[\w-]$/ : stryMutAct_9fa48("10642") ? /^[\w-]+\.[\W-]+\.[\w-]+$/ : stryMutAct_9fa48("10641") ? /^[\w-]+\.[^\w-]+\.[\w-]+$/ : stryMutAct_9fa48("10640") ? /^[\w-]+\.[\w-]\.[\w-]+$/ : stryMutAct_9fa48("10639") ? /^[\W-]+\.[\w-]+\.[\w-]+$/ : stryMutAct_9fa48("10638") ? /^[^\w-]+\.[\w-]+\.[\w-]+$/ : stryMutAct_9fa48("10637") ? /^[\w-]\.[\w-]+\.[\w-]+$/ : stryMutAct_9fa48("10636") ? /^[\w-]+\.[\w-]+\.[\w-]+/ : stryMutAct_9fa48("10635") ? /[\w-]+\.[\w-]+\.[\w-]+$/ : (stryCov_9fa48("10635", "10636", "10637", "10638", "10639", "10640", "10641", "10642", "10643", "10644", "10645"), /^[\w-]+\.[\w-]+\.[\w-]+$/);
export type M1AccessClaims = {
  subject: string;
  subType: "CIUDADANO" | "EMPLEADO";
  role: string;
  expiresAt: number;
};
export class M1CredentialsRejectedError extends Error {
  constructor() {
    if (stryMutAct_9fa48("10646")) {
      {}
    } else {
      stryCov_9fa48("10646");
      super(stryMutAct_9fa48("10647") ? "" : (stryCov_9fa48("10647"), "Usuario o contraseña incorrectos."));
      this.name = stryMutAct_9fa48("10648") ? "" : (stryCov_9fa48("10648"), "M1CredentialsRejectedError");
    }
  }
}
export class M1AccountBlockedError extends Error {
  constructor() {
    if (stryMutAct_9fa48("10649")) {
      {}
    } else {
      stryCov_9fa48("10649");
      super(stryMutAct_9fa48("10650") ? "" : (stryCov_9fa48("10650"), "Esta cuenta no puede iniciar sesión. Comuníquese con el administrador del sistema."));
      this.name = stryMutAct_9fa48("10651") ? "" : (stryCov_9fa48("10651"), "M1AccountBlockedError");
    }
  }
}
export class M1ServiceUnavailableError extends Error {
  constructor() {
    if (stryMutAct_9fa48("10652")) {
      {}
    } else {
      stryCov_9fa48("10652");
      super(stryMutAct_9fa48("10653") ? "" : (stryCov_9fa48("10653"), "El servicio de ingreso no está disponible."));
      this.name = stryMutAct_9fa48("10654") ? "" : (stryCov_9fa48("10654"), "M1ServiceUnavailableError");
    }
  }
}
export class M1LoginTimeoutError extends Error {
  constructor() {
    if (stryMutAct_9fa48("10655")) {
      {}
    } else {
      stryCov_9fa48("10655");
      super(stryMutAct_9fa48("10656") ? "" : (stryCov_9fa48("10656"), "El servicio de ingreso no responde. Reintente en unos segundos."));
      this.name = stryMutAct_9fa48("10657") ? "" : (stryCov_9fa48("10657"), "M1LoginTimeoutError");
    }
  }
}
export class M1InvalidResponseError extends Error {
  constructor() {
    if (stryMutAct_9fa48("10658")) {
      {}
    } else {
      stryCov_9fa48("10658");
      super(stryMutAct_9fa48("10659") ? "" : (stryCov_9fa48("10659"), "El servicio de ingreso no responde. Reintente en unos segundos."));
      this.name = stryMutAct_9fa48("10660") ? "" : (stryCov_9fa48("10660"), "M1InvalidResponseError");
    }
  }
}
type LoginResult = {
  accessToken: string;
  refreshToken: string;
  claims: M1AccessClaims;
};
export async function loginWithM1(email: string, password: string, options: {
  timeoutMs?: number;
  now?: number;
} = {}): Promise<LoginResult> {
  if (stryMutAct_9fa48("10661")) {
    {}
  } else {
    stryCov_9fa48("10661");
    const base = m1BaseUrl();
    if (stryMutAct_9fa48("10664") ? false : stryMutAct_9fa48("10663") ? true : stryMutAct_9fa48("10662") ? base : (stryCov_9fa48("10662", "10663", "10664"), !base)) if (stryMutAct_9fa48("10665")) {
      ;
    } else {
      stryCov_9fa48("10665");
      throw new M1ServiceUnavailableError();
    }
    let response: Response;
    let timeoutSignal: AbortSignal | undefined;
    try {
      if (stryMutAct_9fa48("10666")) {
        {}
      } else {
        stryCov_9fa48("10666");
        timeoutSignal = AbortSignal.timeout(stryMutAct_9fa48("10667") ? options.timeoutMs && LOGIN_TIMEOUT_MS : (stryCov_9fa48("10667"), options.timeoutMs ?? LOGIN_TIMEOUT_MS));
        response = await fetch(new URL(stryMutAct_9fa48("10668") ? "" : (stryCov_9fa48("10668"), "auth/usuario/login"), base), stryMutAct_9fa48("10669") ? {} : (stryCov_9fa48("10669"), {
          method: stryMutAct_9fa48("10670") ? "" : (stryCov_9fa48("10670"), "POST"),
          headers: stryMutAct_9fa48("10671") ? {} : (stryCov_9fa48("10671"), {
            accept: stryMutAct_9fa48("10672") ? "" : (stryCov_9fa48("10672"), "application/json"),
            "content-type": stryMutAct_9fa48("10673") ? "" : (stryCov_9fa48("10673"), "application/json")
          }),
          body: JSON.stringify(stryMutAct_9fa48("10674") ? {} : (stryCov_9fa48("10674"), {
            gmail: email,
            password
          })),
          redirect: stryMutAct_9fa48("10675") ? "" : (stryCov_9fa48("10675"), "error"),
          signal: timeoutSignal
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("10676")) {
        {}
      } else {
        stryCov_9fa48("10676");
        if (stryMutAct_9fa48("10679") ? timeoutSignal.aborted : stryMutAct_9fa48("10678") ? false : stryMutAct_9fa48("10677") ? true : (stryCov_9fa48("10677", "10678", "10679"), timeoutSignal?.aborted)) if (stryMutAct_9fa48("10680")) {
          ;
        } else {
          stryCov_9fa48("10680");
          throw new M1LoginTimeoutError();
        }
        if (stryMutAct_9fa48("10681")) {
          ;
        } else {
          stryCov_9fa48("10681");
          throw new M1ServiceUnavailableError();
        }
      }
    }

    // Catalog v3.0 §6/§9 groups these login responses with rejected credentials; unknown statuses stay unavailable.
    if (stryMutAct_9fa48("10683") ? false : stryMutAct_9fa48("10682") ? true : (stryCov_9fa48("10682", "10683"), (stryMutAct_9fa48("10684") ? [] : (stryCov_9fa48("10684"), [400, 401, 404, 422])).includes(response.status))) if (stryMutAct_9fa48("10685")) {
      ;
    } else {
      stryCov_9fa48("10685");
      throw new M1CredentialsRejectedError();
    }
    if (stryMutAct_9fa48("10688") ? response.status !== 403 : stryMutAct_9fa48("10687") ? false : stryMutAct_9fa48("10686") ? true : (stryCov_9fa48("10686", "10687", "10688"), response.status === 403)) if (stryMutAct_9fa48("10689")) {
      ;
    } else {
      stryCov_9fa48("10689");
      throw new M1AccountBlockedError();
    }
    if (stryMutAct_9fa48("10692") ? false : stryMutAct_9fa48("10691") ? true : stryMutAct_9fa48("10690") ? response.ok : (stryCov_9fa48("10690", "10691", "10692"), !response.ok)) if (stryMutAct_9fa48("10693")) {
      ;
    } else {
      stryCov_9fa48("10693");
      throw new M1ServiceUnavailableError();
    }
    let text: string;
    try {
      if (stryMutAct_9fa48("10694")) {
        {}
      } else {
        stryCov_9fa48("10694");
        text = await response.text();
      }
    } catch (error) {
      if (stryMutAct_9fa48("10695")) {
        {}
      } else {
        stryCov_9fa48("10695");
        if (stryMutAct_9fa48("10698") ? timeoutSignal.aborted : stryMutAct_9fa48("10697") ? false : stryMutAct_9fa48("10696") ? true : (stryCov_9fa48("10696", "10697", "10698"), timeoutSignal?.aborted)) if (stryMutAct_9fa48("10699")) {
          ;
        } else {
          stryCov_9fa48("10699");
          throw new M1LoginTimeoutError();
        }
        if (stryMutAct_9fa48("10700")) {
          ;
        } else {
          stryCov_9fa48("10700");
          throw new M1ServiceUnavailableError();
        }
      }
    }
    if (stryMutAct_9fa48("10704") ? text.length <= MAX_BODY_CHARS : stryMutAct_9fa48("10703") ? text.length >= MAX_BODY_CHARS : stryMutAct_9fa48("10702") ? false : stryMutAct_9fa48("10701") ? true : (stryCov_9fa48("10701", "10702", "10703", "10704"), text.length > MAX_BODY_CHARS)) if (stryMutAct_9fa48("10705")) {
      ;
    } else {
      stryCov_9fa48("10705");
      throw new M1InvalidResponseError();
    }
    try {
      if (stryMutAct_9fa48("10706")) {
        {}
      } else {
        stryCov_9fa48("10706");
        const body: unknown = text ? JSON.parse(text) : undefined;
        if (stryMutAct_9fa48("10709") ? (typeof body !== "object" || body === null) && Array.isArray(body) : stryMutAct_9fa48("10708") ? false : stryMutAct_9fa48("10707") ? true : (stryCov_9fa48("10707", "10708", "10709"), (stryMutAct_9fa48("10711") ? typeof body !== "object" && body === null : stryMutAct_9fa48("10710") ? false : (stryCov_9fa48("10710", "10711"), (stryMutAct_9fa48("10713") ? typeof body === "object" : stryMutAct_9fa48("10712") ? false : (stryCov_9fa48("10712", "10713"), typeof body !== (stryMutAct_9fa48("10714") ? "" : (stryCov_9fa48("10714"), "object")))) || (stryMutAct_9fa48("10716") ? body !== null : stryMutAct_9fa48("10715") ? false : (stryCov_9fa48("10715", "10716"), body === null)))) || Array.isArray(body))) throw new Error(stryMutAct_9fa48("10718") ? "" : (stryCov_9fa48("10718"), "invalid body"));
      }
    } catch {
      if (stryMutAct_9fa48("10719")) {
        {}
      } else {
        stryCov_9fa48("10719");
        if (stryMutAct_9fa48("10720")) {
          ;
        } else {
          stryCov_9fa48("10720");
          throw new M1InvalidResponseError();
        }
      }
    }
    const token = stryMutAct_9fa48("10722") ? response.headers.get("authorization").match(/^Bearer\s+(.+)$/i)?.[1] : stryMutAct_9fa48("10721") ? response.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)[1] : (stryCov_9fa48("10721", "10722"), response.headers.get(stryMutAct_9fa48("10723") ? "" : (stryCov_9fa48("10723"), "authorization"))?.match(stryMutAct_9fa48("10728") ? /^Bearer\s+(.)$/i : stryMutAct_9fa48("10727") ? /^Bearer\S+(.+)$/i : stryMutAct_9fa48("10726") ? /^Bearer\s(.+)$/i : stryMutAct_9fa48("10725") ? /^Bearer\s+(.+)/i : stryMutAct_9fa48("10724") ? /Bearer\s+(.+)$/i : (stryCov_9fa48("10724", "10725", "10726", "10727", "10728"), /^Bearer\s+(.+)$/i))?.[1]);
    const refreshToken = stryMutAct_9fa48("10729") ? response.headers.get("x-refresh-token") && undefined : (stryCov_9fa48("10729"), response.headers.get(stryMutAct_9fa48("10730") ? "" : (stryCov_9fa48("10730"), "x-refresh-token")) ?? undefined);
    const expiresIn = Number(response.headers.get(stryMutAct_9fa48("10731") ? "" : (stryCov_9fa48("10731"), "x-token-expires-in")));
    if (stryMutAct_9fa48("10734") ? (!token || token.length > MAX_TOKEN_CHARS || !JWT_SHAPE.test(token) || !refreshToken || refreshToken.length > MAX_TOKEN_CHARS || !Number.isFinite(expiresIn)) && expiresIn <= 0 : stryMutAct_9fa48("10733") ? false : stryMutAct_9fa48("10732") ? true : (stryCov_9fa48("10732", "10733", "10734"), (stryMutAct_9fa48("10736") ? (!token || token.length > MAX_TOKEN_CHARS || !JWT_SHAPE.test(token) || !refreshToken || refreshToken.length > MAX_TOKEN_CHARS) && !Number.isFinite(expiresIn) : stryMutAct_9fa48("10735") ? false : (stryCov_9fa48("10735", "10736"), (stryMutAct_9fa48("10738") ? (!token || token.length > MAX_TOKEN_CHARS || !JWT_SHAPE.test(token) || !refreshToken) && refreshToken.length > MAX_TOKEN_CHARS : stryMutAct_9fa48("10737") ? false : (stryCov_9fa48("10737", "10738"), (stryMutAct_9fa48("10740") ? (!token || token.length > MAX_TOKEN_CHARS || !JWT_SHAPE.test(token)) && !refreshToken : stryMutAct_9fa48("10739") ? false : (stryCov_9fa48("10739", "10740"), (stryMutAct_9fa48("10742") ? (!token || token.length > MAX_TOKEN_CHARS) && !JWT_SHAPE.test(token) : stryMutAct_9fa48("10741") ? false : (stryCov_9fa48("10741", "10742"), (stryMutAct_9fa48("10744") ? !token && token.length > MAX_TOKEN_CHARS : stryMutAct_9fa48("10743") ? false : (stryCov_9fa48("10743", "10744"), (stryMutAct_9fa48("10745") ? token : (stryCov_9fa48("10745"), !token)) || (stryMutAct_9fa48("10748") ? token.length <= MAX_TOKEN_CHARS : stryMutAct_9fa48("10747") ? token.length >= MAX_TOKEN_CHARS : stryMutAct_9fa48("10746") ? false : (stryCov_9fa48("10746", "10747", "10748"), token.length > MAX_TOKEN_CHARS)))) || (stryMutAct_9fa48("10749") ? JWT_SHAPE.test(token) : (stryCov_9fa48("10749"), !JWT_SHAPE.test(token))))) || (stryMutAct_9fa48("10750") ? refreshToken : (stryCov_9fa48("10750"), !refreshToken)))) || (stryMutAct_9fa48("10753") ? refreshToken.length <= MAX_TOKEN_CHARS : stryMutAct_9fa48("10752") ? refreshToken.length >= MAX_TOKEN_CHARS : stryMutAct_9fa48("10751") ? false : (stryCov_9fa48("10751", "10752", "10753"), refreshToken.length > MAX_TOKEN_CHARS)))) || (stryMutAct_9fa48("10754") ? Number.isFinite(expiresIn) : (stryCov_9fa48("10754"), !Number.isFinite(expiresIn))))) || (stryMutAct_9fa48("10757") ? expiresIn > 0 : stryMutAct_9fa48("10756") ? expiresIn < 0 : stryMutAct_9fa48("10755") ? false : (stryCov_9fa48("10755", "10756", "10757"), expiresIn <= 0)))) {
      if (stryMutAct_9fa48("10758")) {
        {}
      } else {
        stryCov_9fa48("10758");
        if (stryMutAct_9fa48("10759")) {
          ;
        } else {
          stryCov_9fa48("10759");
          throw new M1InvalidResponseError();
        }
      }
    }
    const claims = readM1AccessClaims(token, stryMutAct_9fa48("10760") ? options.now && Date.now() : (stryCov_9fa48("10760"), options.now ?? Date.now()));
    if (stryMutAct_9fa48("10763") ? false : stryMutAct_9fa48("10762") ? true : stryMutAct_9fa48("10761") ? claims : (stryCov_9fa48("10761", "10762", "10763"), !claims)) if (stryMutAct_9fa48("10764")) {
      ;
    } else {
      stryCov_9fa48("10764");
      throw new M1InvalidResponseError();
    }
    return stryMutAct_9fa48("10765") ? {} : (stryCov_9fa48("10765"), {
      accessToken: token,
      refreshToken,
      claims
    });
  }
}
export function readM1AccessClaims(token: string, now = Date.now()): M1AccessClaims | undefined {
  if (stryMutAct_9fa48("10766")) {
    {}
  } else {
    stryCov_9fa48("10766");
    if (stryMutAct_9fa48("10769") ? token.length > MAX_TOKEN_CHARS && !JWT_SHAPE.test(token) : stryMutAct_9fa48("10768") ? false : stryMutAct_9fa48("10767") ? true : (stryCov_9fa48("10767", "10768", "10769"), (stryMutAct_9fa48("10772") ? token.length <= MAX_TOKEN_CHARS : stryMutAct_9fa48("10771") ? token.length >= MAX_TOKEN_CHARS : stryMutAct_9fa48("10770") ? false : (stryCov_9fa48("10770", "10771", "10772"), token.length > MAX_TOKEN_CHARS)) || (stryMutAct_9fa48("10773") ? JWT_SHAPE.test(token) : (stryCov_9fa48("10773"), !JWT_SHAPE.test(token))))) return undefined;
    const encodedPayload = token.split(stryMutAct_9fa48("10774") ? "" : (stryCov_9fa48("10774"), "."))[1];
    if (stryMutAct_9fa48("10777") ? false : stryMutAct_9fa48("10776") ? true : stryMutAct_9fa48("10775") ? encodedPayload : (stryCov_9fa48("10775", "10776", "10777"), !encodedPayload)) return undefined;
    try {
      if (stryMutAct_9fa48("10778")) {
        {}
      } else {
        stryCov_9fa48("10778");
        const value = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<string, unknown>;
        const subject = value.sub;
        const numericSubject = (stryMutAct_9fa48("10781") ? typeof subject !== "number" : stryMutAct_9fa48("10780") ? false : stryMutAct_9fa48("10779") ? true : (stryCov_9fa48("10779", "10780", "10781"), typeof subject === (stryMutAct_9fa48("10782") ? "" : (stryCov_9fa48("10782"), "number")))) ? stryMutAct_9fa48("10785") ? Number.isSafeInteger(subject) || subject >= 0 : stryMutAct_9fa48("10784") ? false : stryMutAct_9fa48("10783") ? true : (stryCov_9fa48("10783", "10784", "10785"), Number.isSafeInteger(subject) && (stryMutAct_9fa48("10788") ? subject < 0 : stryMutAct_9fa48("10787") ? subject > 0 : stryMutAct_9fa48("10786") ? true : (stryCov_9fa48("10786", "10787", "10788"), subject >= 0))) : stryMutAct_9fa48("10791") ? typeof subject === "string" || /^\d{1,19}$/.test(subject) : stryMutAct_9fa48("10790") ? false : stryMutAct_9fa48("10789") ? true : (stryCov_9fa48("10789", "10790", "10791"), (stryMutAct_9fa48("10793") ? typeof subject !== "string" : stryMutAct_9fa48("10792") ? true : (stryCov_9fa48("10792", "10793"), typeof subject === (stryMutAct_9fa48("10794") ? "" : (stryCov_9fa48("10794"), "string")))) && (stryMutAct_9fa48("10798") ? /^\D{1,19}$/ : stryMutAct_9fa48("10797") ? /^\d$/ : stryMutAct_9fa48("10796") ? /^\d{1,19}/ : stryMutAct_9fa48("10795") ? /\d{1,19}$/ : (stryCov_9fa48("10795", "10796", "10797", "10798"), /^\d{1,19}$/)).test(subject));
        const normalizedSubject = numericSubject ? BigInt(String(subject)).toString() : undefined;
        const expiresAt = (stryMutAct_9fa48("10801") ? typeof value.exp !== "number" : stryMutAct_9fa48("10800") ? false : stryMutAct_9fa48("10799") ? true : (stryCov_9fa48("10799", "10800", "10801"), typeof value.exp === (stryMutAct_9fa48("10802") ? "" : (stryCov_9fa48("10802"), "number")))) ? stryMutAct_9fa48("10803") ? value.exp / 1000 : (stryCov_9fa48("10803"), value.exp * 1000) : Number.NaN;
        if (stryMutAct_9fa48("10806") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access" || !normalizedSubject || value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO" || typeof value.rol !== "string" || value.rol.length === 0 || typeof value.exp !== "number" || !Number.isFinite(value.exp) || !Number.isFinite(expiresAt) || expiresAt <= now) && expiresAt > now + MAX_ACCESS_LIFETIME_MS : stryMutAct_9fa48("10805") ? false : stryMutAct_9fa48("10804") ? true : (stryCov_9fa48("10804", "10805", "10806"), (stryMutAct_9fa48("10808") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access" || !normalizedSubject || value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO" || typeof value.rol !== "string" || value.rol.length === 0 || typeof value.exp !== "number" || !Number.isFinite(value.exp) || !Number.isFinite(expiresAt)) && expiresAt <= now : stryMutAct_9fa48("10807") ? false : (stryCov_9fa48("10807", "10808"), (stryMutAct_9fa48("10810") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access" || !normalizedSubject || value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO" || typeof value.rol !== "string" || value.rol.length === 0 || typeof value.exp !== "number" || !Number.isFinite(value.exp)) && !Number.isFinite(expiresAt) : stryMutAct_9fa48("10809") ? false : (stryCov_9fa48("10809", "10810"), (stryMutAct_9fa48("10812") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access" || !normalizedSubject || value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO" || typeof value.rol !== "string" || value.rol.length === 0 || typeof value.exp !== "number") && !Number.isFinite(value.exp) : stryMutAct_9fa48("10811") ? false : (stryCov_9fa48("10811", "10812"), (stryMutAct_9fa48("10814") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access" || !normalizedSubject || value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO" || typeof value.rol !== "string" || value.rol.length === 0) && typeof value.exp !== "number" : stryMutAct_9fa48("10813") ? false : (stryCov_9fa48("10813", "10814"), (stryMutAct_9fa48("10816") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access" || !normalizedSubject || value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO" || typeof value.rol !== "string") && value.rol.length === 0 : stryMutAct_9fa48("10815") ? false : (stryCov_9fa48("10815", "10816"), (stryMutAct_9fa48("10818") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access" || !normalizedSubject || value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO") && typeof value.rol !== "string" : stryMutAct_9fa48("10817") ? false : (stryCov_9fa48("10817", "10818"), (stryMutAct_9fa48("10820") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access" || !normalizedSubject) && value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO" : stryMutAct_9fa48("10819") ? false : (stryCov_9fa48("10819", "10820"), (stryMutAct_9fa48("10822") ? (value.iss !== "modulo1-ciudadanos" || value.typ !== "access") && !normalizedSubject : stryMutAct_9fa48("10821") ? false : (stryCov_9fa48("10821", "10822"), (stryMutAct_9fa48("10824") ? value.iss !== "modulo1-ciudadanos" && value.typ !== "access" : stryMutAct_9fa48("10823") ? false : (stryCov_9fa48("10823", "10824"), (stryMutAct_9fa48("10826") ? value.iss === "modulo1-ciudadanos" : stryMutAct_9fa48("10825") ? false : (stryCov_9fa48("10825", "10826"), value.iss !== (stryMutAct_9fa48("10827") ? "" : (stryCov_9fa48("10827"), "modulo1-ciudadanos")))) || (stryMutAct_9fa48("10829") ? value.typ === "access" : stryMutAct_9fa48("10828") ? false : (stryCov_9fa48("10828", "10829"), value.typ !== (stryMutAct_9fa48("10830") ? "" : (stryCov_9fa48("10830"), "access")))))) || (stryMutAct_9fa48("10831") ? normalizedSubject : (stryCov_9fa48("10831"), !normalizedSubject)))) || (stryMutAct_9fa48("10833") ? value.sub_type !== "CIUDADANO" || value.sub_type !== "EMPLEADO" : stryMutAct_9fa48("10832") ? false : (stryCov_9fa48("10832", "10833"), (stryMutAct_9fa48("10835") ? value.sub_type === "CIUDADANO" : stryMutAct_9fa48("10834") ? true : (stryCov_9fa48("10834", "10835"), value.sub_type !== (stryMutAct_9fa48("10836") ? "" : (stryCov_9fa48("10836"), "CIUDADANO")))) && (stryMutAct_9fa48("10838") ? value.sub_type === "EMPLEADO" : stryMutAct_9fa48("10837") ? true : (stryCov_9fa48("10837", "10838"), value.sub_type !== (stryMutAct_9fa48("10839") ? "" : (stryCov_9fa48("10839"), "EMPLEADO")))))))) || (stryMutAct_9fa48("10841") ? typeof value.rol === "string" : stryMutAct_9fa48("10840") ? false : (stryCov_9fa48("10840", "10841"), typeof value.rol !== (stryMutAct_9fa48("10842") ? "" : (stryCov_9fa48("10842"), "string")))))) || (stryMutAct_9fa48("10844") ? value.rol.length !== 0 : stryMutAct_9fa48("10843") ? false : (stryCov_9fa48("10843", "10844"), value.rol.length === 0)))) || (stryMutAct_9fa48("10846") ? typeof value.exp === "number" : stryMutAct_9fa48("10845") ? false : (stryCov_9fa48("10845", "10846"), typeof value.exp !== (stryMutAct_9fa48("10847") ? "" : (stryCov_9fa48("10847"), "number")))))) || (stryMutAct_9fa48("10848") ? Number.isFinite(value.exp) : (stryCov_9fa48("10848"), !Number.isFinite(value.exp))))) || (stryMutAct_9fa48("10849") ? Number.isFinite(expiresAt) : (stryCov_9fa48("10849"), !Number.isFinite(expiresAt))))) || (stryMutAct_9fa48("10852") ? expiresAt > now : stryMutAct_9fa48("10851") ? expiresAt < now : stryMutAct_9fa48("10850") ? false : (stryCov_9fa48("10850", "10851", "10852"), expiresAt <= now)))) || (stryMutAct_9fa48("10855") ? expiresAt <= now + MAX_ACCESS_LIFETIME_MS : stryMutAct_9fa48("10854") ? expiresAt >= now + MAX_ACCESS_LIFETIME_MS : stryMutAct_9fa48("10853") ? false : (stryCov_9fa48("10853", "10854", "10855"), expiresAt > (stryMutAct_9fa48("10856") ? now - MAX_ACCESS_LIFETIME_MS : (stryCov_9fa48("10856"), now + MAX_ACCESS_LIFETIME_MS)))))) {
          if (stryMutAct_9fa48("10857")) {
            {}
          } else {
            stryCov_9fa48("10857");
            return undefined;
          }
        }
        return stryMutAct_9fa48("10858") ? {} : (stryCov_9fa48("10858"), {
          subject: normalizedSubject,
          subType: value.sub_type,
          role: value.rol,
          expiresAt
        });
      }
    } catch {
      if (stryMutAct_9fa48("10859")) {
        {}
      } else {
        stryCov_9fa48("10859");
        return undefined;
      }
    }
  }
}