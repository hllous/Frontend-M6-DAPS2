import {
  BackendUnavailableError,
  InvalidSessionError,
  persistRenewedSession,
  readJwtExpiry,
  readJwtSubject,
  rememberRenewedSession,
  type Session,
} from "./session";

/** Se renueva cuando al access token le queda menos que esto (M1: 15 min de vida). */
export const REFRESH_LEEWAY_MS = 60_000;
export const PREVENTIVE_TIMEOUT_MS = 4_000;
export const REACTIVE_TIMEOUT_MS = 15_000;
const MAX_BODY_CHARS = 8_192;
const MAX_TOKEN_CHARS = 2_048;
const MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;
const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;
// Pedidos en paralelo comparten una sola renovación: si M1 rota el refresh token, un segundo intento con el viejo fallaría.
// Se memoizan solo los tokens (cada pedido los mezcla con SU sesión). Un fallo de red/5xx se memoriza menos tiempo.
// ponytail: solo dentro de una instancia; entre instancias serverless distintas sigue la carrera. Subir a un store compartido si M1 rota.
export const MEMO_MS = 10_000;
export const FAILURE_MEMO_MS = 5_000;

/** Sesión con material de M1 renovable: lo que `canRenew` garantiza. */
export type RenewableSession = Session & { accessToken: string; refreshToken: string; source: "m1" };
type Renewal = { accessToken: string; refreshToken: string; jwtExpiresAt: number };

const renewals = new Map<string, { at: number; ttl: number; result: Promise<Renewal | null> }>();
let warnedInvalidBase = false;

/** `M1_BASE_URL` válida: URL absoluta, sin credenciales, https en producción. Inválida o ausente → undefined. */
export function m1BaseUrl(): URL | undefined {
  const raw = process.env.M1_BASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw.replace(/\/?$/, "/"));
    const protocolOk = url.protocol === "https:" || (url.protocol === "http:" && process.env.NODE_ENV !== "production");
    if (protocolOk && !url.username && !url.password) return url;
  } catch {
    // cae al aviso
  }
  if (!warnedInvalidBase) {
    warnedInvalidBase = true;
    console.error("[m1-refresh] M1_BASE_URL no es válida (URL absoluta, https en producción, sin credenciales); la renovación queda deshabilitada.");
  }
  return undefined;
}

/** Hay con qué renovar: el login real de M1 dejó un refresh token en la sesión y M1_BASE_URL es válida. */
export function canRenew(session: Session): session is RenewableSession {
  return session.source === "m1" && Boolean(session.refreshToken && session.accessToken) && m1BaseUrl() !== undefined;
}

export function isNearExpiry(session: Session, now = Date.now()): boolean {
  return session.jwtExpiresAt - now <= REFRESH_LEEWAY_MS;
}

/**
 * `POST /auth/refresh` de M1 (Catálogo v3.0 §8, 204). NO VERIFICADO contra M1 (no está hosteado): el contrato no define
 * cómo se manda el refresh token ni dónde vienen los tokens nuevos. Supuestos, simétricos al login: el refresh viaja en
 * `X-Refresh-Token`; los tokens nuevos vuelven en `Authorization: Bearer` y `X-Refresh-Token` (o, si no, en un JSON
 * `{ accessToken, refreshToken }`); sin `X-Refresh-Token` nuevo se conserva el anterior.
 * Devuelve `null` si M1 rechaza el refresh (400/401/403) o responde algo inutilizable; lanza BackendUnavailableError
 * para cualquier otro estado o si no responde (no desloguea a nadie por una falla de M1).
 */
export function refreshSession(
  session: RenewableSession,
  options: { now?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<Session | null> {
  const now = options.now ?? Date.now();
  const key = session.refreshToken;
  for (const [token, known] of renewals) if (now - known.at >= known.ttl) renewals.delete(token);

  let entry = renewals.get(key);
  if (!entry) {
    const created = { at: now, ttl: MEMO_MS, result: callM1(key, options.timeoutMs ?? REACTIVE_TIMEOUT_MS, options.signal, now) };
    created.result.catch(() => {
      created.at = now;
      created.ttl = FAILURE_MEMO_MS;
    });
    renewals.set(key, created);
    entry = created;
  }
  return entry.result.then((renewal) => {
    if (!renewal) return null;
    // El mismo usuario: si el `sub` cambió, M1 devolvió la sesión de otra persona y no se acepta.
    const previousSubject = readJwtSubject(session.accessToken);
    if (previousSubject === undefined || previousSubject !== readJwtSubject(renewal.accessToken)) return null;
    return { ...session, ...renewal, lastActivityAt: now };
  });
}

async function callM1(
  refreshToken: string,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  now: number,
): Promise<Renewal | null> {
  const unavailable = () => new BackendUnavailableError(503, "M1 no responde. Reintente en unos segundos.");
  const base = m1BaseUrl();
  if (!base) throw unavailable();
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(timeoutMs);
    response = await fetch(new URL("auth/refresh", base), {
      method: "POST",
      headers: { "X-Refresh-Token": refreshToken },
      redirect: "error",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch {
    throw unavailable();
  }
  if ([400, 401, 403].includes(response.status)) return null;
  if (!response.ok) throw unavailable();

  if (Number(response.headers.get("content-length")) > MAX_BODY_CHARS) return null;
  const text = await response.text().catch(() => "");
  if (text.length > MAX_BODY_CHARS) return null;
  let body: { accessToken?: unknown; refreshToken?: unknown } | undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }

  const bearer = response.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const accessToken = bearer ?? (typeof body?.accessToken === "string" ? body.accessToken : undefined);
  if (!accessToken || accessToken.length > MAX_TOKEN_CHARS || !JWT_SHAPE.test(accessToken)) return null;

  const expiresIn = Number(response.headers.get("x-token-expires-in"));
  const jwtExpiresAt = readJwtExpiry(accessToken) ?? (expiresIn > 0 ? now + expiresIn * 1000 : undefined);
  if (
    jwtExpiresAt === undefined ||
    !Number.isFinite(jwtExpiresAt) ||
    jwtExpiresAt <= now ||
    jwtExpiresAt > now + MAX_LIFETIME_MS
  ) {
    return null;
  }

  const next = response.headers.get("x-refresh-token") ?? (typeof body?.refreshToken === "string" ? body.refreshToken : undefined);
  if (next !== undefined && (next.length === 0 || next.length > MAX_TOKEN_CHARS)) return null;
  return { accessToken, refreshToken: next ?? refreshToken, jwtExpiresAt };
}

/**
 * Renueva la sesión del pedido y la deja visible para el resto del pedido y en la cookie de la respuesta. Si M1 rechaza
 * el refresh, la sesión muere (InvalidSessionError → 401 → el cliente cierra y va al login). `tolerateUnavailable`: en
 * la renovación preventiva, si M1 no responde se sigue con el token vigente.
 */
export async function renewRequestSession(
  request: Request,
  session: RenewableSession,
  options: { tolerateUnavailable: boolean; signal?: AbortSignal },
): Promise<RenewableSession> {
  let next: Session | null;
  try {
    next = await refreshSession(session, {
      timeoutMs: options.tolerateUnavailable ? PREVENTIVE_TIMEOUT_MS : REACTIVE_TIMEOUT_MS,
      signal: options.signal,
    });
  } catch (error) {
    if (options.tolerateUnavailable && error instanceof BackendUnavailableError) return session;
    throw error;
  }
  if (!next) throw new InvalidSessionError("M1 rechazó la renovación de la sesión.");
  rememberRenewedSession(request, next);
  await persistRenewedSession(next);
  return next as RenewableSession;
}
