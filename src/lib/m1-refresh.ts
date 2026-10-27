import {
  BackendUnavailableError,
  InvalidSessionError,
  readJwtExpiry,
  rememberRenewedSession,
  type Session,
} from "./session";

/** Se renueva cuando al access token le queda menos que esto (M1: 15 min de vida). */
export const REFRESH_LEEWAY_MS = 60_000;
const REFRESH_TIMEOUT_MS = 15_000;
// Pedidos en paralelo comparten una sola renovación: si M1 rota el refresh token, un segundo intento con el viejo fallaría.
// ponytail: solo dentro de una instancia; entre instancias serverless distintas sigue la carrera. Subir a un store compartido si M1 rota.
const MEMO_MS = 30_000;
const renewals = new Map<string, { at: number; result: Promise<Session | null> }>();

/** Hay con qué renovar: el login trajo un refresh token y M1_BASE_URL está configurada. */
export function canRenew(session: Session): boolean {
  return Boolean(session.refreshToken && process.env.M1_BASE_URL);
}

export function isNearExpiry(session: Session, now = Date.now()): boolean {
  return session.jwtExpiresAt - now <= REFRESH_LEEWAY_MS;
}

/**
 * `POST /auth/refresh` de M1 (Catálogo v3.0 §8, 204). NO VERIFICADO contra M1 (no está hosteado): el contrato no define
 * cómo se manda el refresh token ni dónde vienen los tokens nuevos. Supuestos, simétricos al login: el refresh viaja en
 * `X-Refresh-Token`; los tokens nuevos vuelven en `Authorization: Bearer` y `X-Refresh-Token` (o, si no, en un JSON
 * `{ accessToken, refreshToken }`); sin `X-Refresh-Token` nuevo se conserva el anterior.
 * Devuelve `null` si M1 rechaza el refresh o no devuelve un access token usable; lanza BackendUnavailableError si no responde.
 */
export function refreshSession(session: Session, now = Date.now()): Promise<Session | null> {
  const key = session.refreshToken!;
  const known = renewals.get(key);
  if (known && now - known.at < MEMO_MS) return known.result;

  for (const [token, entry] of renewals) if (now - entry.at >= MEMO_MS) renewals.delete(token);
  const result = callM1(session, key, now);
  renewals.set(key, { at: now, result });
  // Un fallo de red no se memoriza: el próximo pedido puede reintentar.
  result.catch(() => renewals.delete(key));
  return result;
}

async function callM1(session: Session, refreshToken: string, now: number): Promise<Session | null> {
  let response: Response;
  try {
    const base = process.env.M1_BASE_URL!.replace(/\/?$/, "/");
    response = await fetch(new URL("auth/refresh", base), {
      method: "POST",
      headers: { "X-Refresh-Token": refreshToken },
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
  } catch {
    throw new BackendUnavailableError(503, "M1 no responde. Reintente en unos segundos.");
  }
  if (response.status >= 500) throw new BackendUnavailableError(503, "M1 no responde. Reintente en unos segundos.");
  if (!response.ok) return null;

  const body = (await response.json().catch(() => undefined)) as { accessToken?: unknown; refreshToken?: unknown } | undefined;
  const bearer = response.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const accessToken = bearer ?? (typeof body?.accessToken === "string" ? body.accessToken : undefined);
  if (!accessToken) return null;

  const expiresIn = Number(response.headers.get("x-token-expires-in"));
  const jwtExpiresAt = readJwtExpiry(accessToken) ?? (expiresIn > 0 ? now + expiresIn * 1000 : undefined);
  if (jwtExpiresAt === undefined || jwtExpiresAt <= now) return null;

  const nextRefresh = response.headers.get("x-refresh-token") ?? (typeof body?.refreshToken === "string" ? body.refreshToken : undefined);
  return { ...session, accessToken, refreshToken: nextRefresh ?? refreshToken, jwtExpiresAt, lastActivityAt: now };
}

/**
 * Renueva la sesión del pedido y la deja visible para el resto del pedido. Si M1 rechaza el refresh, la sesión muere
 * (InvalidSessionError → 401 → el cliente cierra y va al login). `tolerateUnavailable`: en la renovación preventiva,
 * si M1 no responde se sigue con el token vigente.
 */
export async function renewRequestSession(request: Request, session: Session, tolerateUnavailable: boolean): Promise<Session> {
  let next: Session | null;
  try {
    next = await refreshSession(session);
  } catch (error) {
    if (tolerateUnavailable && error instanceof BackendUnavailableError) return session;
    throw error;
  }
  if (!next) throw new InvalidSessionError("M1 rechazó la renovación de la sesión.");
  rememberRenewedSession(request, next);
  return next;
}
