import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";

import { demoSigningConfigured, signDemoJwt } from "./demo-jwt";
import { m6RoleSchema, type M6Role } from "./m6-roles";
import { getScenario, type Capability, type ScenarioCrew, type ScenarioId } from "./scenarios";
import { AUTH_COOKIE_NAME, SESSION_MARKER_COOKIE_NAME } from "./session-config";

export { AUTH_COOKIE_NAME, SESSION_MARKER_COOKIE_NAME } from "./session-config";

export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;

export type AuthMode = "mock" | "backend-development" | "real-m1";
export type SupportedAuthMode = Exclude<AuthMode, "real-m1">;

export type Session = {
  mode: SupportedAuthMode;
  scenarioId: ScenarioId;
  issuedAt: number;
  lastActivityAt: number;
  absoluteExpiresAt: number;
  jwtExpiresAt: number;
  accessToken?: string;
  /** Token de renovación de M1 (`X-Refresh-Token`, 7 días). Solo existe si el login lo trajo; nunca llega al navegador. */
  refreshToken?: string;
  /**
   * Quién emite el material de token. `m1` (login real, #145) habilita la renovación; M6_DEV_JWT nunca.
   * `demo`: la sesión no guarda token, el BFF firma uno corto por pedido (demo-jwt.ts) y el vencimiento del token no la cierra.
   */
  source?: "m1" | "demo";
  /** Roles de M6 efectivos: en modo backend los trae GET /me (login y refresco); en mock, el fixture del escenario. */
  roles: M6Role[];
  /** Cuadrilla real de un escenario de Campo, resuelta contra GET /crews en el login (sólo modo backend). */
  crew?: ScenarioCrew;
};

export type PublicSession = Omit<Session, "accessToken" | "refreshToken" | "source"> & {
  expiresAt: number;
};

export class AuthUnavailableError extends Error {
  constructor(message = "La autenticación solicitada no está disponible.") {
    console.error("[m6-auth-unavailable]", message);
    super("La autenticación solicitada no está disponible.");
    this.name = "AuthUnavailableError";
  }
}

export class BackendUnavailableError extends Error {
  readonly status: number;

  constructor(status: number, message = "El backend no responde. Reintente en unos segundos.", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BackendUnavailableError";
    this.status = status;
  }
}

export class InvalidSessionError extends Error {
  constructor(message = "La sesión no es válida o ya expiró.") {
    super(message);
    this.name = "InvalidSessionError";
  }
}

export class ForbiddenSessionError extends Error {
  constructor(message = "La sesión no tiene la capacidad necesaria.") {
    super(message);
    this.name = "ForbiddenSessionError";
  }
}

/** 403 por `sub_type`: el token es de un ciudadano y el sistema es solo para personal municipal (sin `code`). */
export class CitizenForbiddenError extends ForbiddenSessionError {
  constructor(message = "Este sistema es solo para personal municipal.") {
    super(message);
    this.name = "CitizenForbiddenError";
  }
}

type SessionOptions = {
  mode: AuthMode;
  now?: number;
  devJwt?: string;
  backendOrigin?: string;
  /** Firmar un token por pedido con M6_JWT_SECRET en lugar de reenviar M6_DEV_JWT. */
  demoSigning?: boolean;
  /** Roles de GET /me; sin ellos, los del fixture del escenario (mock y tests). */
  roles?: readonly M6Role[];
};

type RuntimeEnvironment = {
  M6_AUTH_MODE?: string;
  M6_DEV_JWT?: string;
  M6_SESSION_SECRET?: string;
  NODE_ENV?: string;
};

const localSessionSecret = "m6-local-development-session-secret";
const sessionKeySalt = Buffer.from("m6-bff-session-key-salt-v1", "utf8");
const sessionKeyInfo = Buffer.from("aes-256-gcm cookie encryption v1", "utf8");

export function getAuthMode(environment: RuntimeEnvironment = process.env): AuthMode {
  const configuredMode = environment.M6_AUTH_MODE;
  if (configuredMode === "mock" || configuredMode === "backend-development" || configuredMode === "real-m1") {
    return configuredMode;
  }

  return environment.NODE_ENV === "production" ? "real-m1" : "mock";
}

export function createSession(
  scenarioId: ScenarioId,
  options: SessionOptions,
): Session {
  getScenario(scenarioId);
  const now = options.now ?? Date.now();
  const roles = [...(options.roles ?? getScenario(scenarioId).roles)];

  if (options.mode === "real-m1") {
    throw new AuthUnavailableError("La autenticación real de M1 permanece bloqueada hasta publicar su contrato.");
  }

  if (options.mode === "mock") {
    return {
      mode: options.mode,
      scenarioId,
      issuedAt: now,
      lastActivityAt: now,
      absoluteExpiresAt: now + SESSION_ABSOLUTE_MS,
      jwtExpiresAt: now + SESSION_ABSOLUTE_MS,
      roles,
    };
  }

  if (options.demoSigning) {
    if (!options.backendOrigin) throw new AuthUnavailableError("El backend de desarrollo no está configurado.");
    return {
      mode: options.mode,
      scenarioId,
      issuedAt: now,
      lastActivityAt: now,
      absoluteExpiresAt: now + SESSION_ABSOLUTE_MS,
      jwtExpiresAt: now + SESSION_ABSOLUTE_MS,
      source: "demo",
      roles,
    };
  }

  const accessToken = options.devJwt;
  if (!accessToken) {
    throw new AuthUnavailableError("El modo de desarrollo requiere M6_DEV_JWT en el servidor.");
  }

  if (!options.backendOrigin) {
    throw new AuthUnavailableError("El backend de desarrollo no está configurado.");
  }

  const jwtExpiresAt = readJwtExpiry(accessToken);
  if (jwtExpiresAt === undefined || jwtExpiresAt <= now) {
    throw new AuthUnavailableError("M6_DEV_JWT no tiene una expiración válida.");
  }

  return {
    mode: options.mode,
    scenarioId,
    issuedAt: now,
    lastActivityAt: now,
    absoluteExpiresAt: now + SESSION_ABSOLUTE_MS,
    jwtExpiresAt,
    accessToken,
    roles,
  };
}

/** El token con el que el BFF habla con el backend: el de la sesión, o uno recién firmado si la sesión es de demo. */
export function sessionToken(session: Session): string | undefined {
  if (session.accessToken || session.source !== "demo") return session.accessToken;
  // Sesión demo viva pero sin la clave de firma (se quitó la variable): se trata como sesión caída, no como un 500.
  if (!demoSigningConfigured()) throw new InvalidSessionError("La firma de demo ya no está configurada.");
  return signDemoJwt(session.scenarioId);
}

export function effectiveSessionExpiry(session: Session): number {
  // La sesión de demo no depende del token (se firma por pedido) ni se corta por inactividad: vale el tope absoluto.
  if (session.source === "demo") return session.absoluteExpiresAt;
  return Math.min(
    session.jwtExpiresAt,
    session.lastActivityAt + SESSION_IDLE_MS,
    session.absoluteExpiresAt,
  );
}

export function isSessionActive(session: Session, now = Date.now()): boolean {
  return now < effectiveSessionExpiry(session);
}

export function publicSession(session: Session): PublicSession {
  const { accessToken: _accessToken, refreshToken: _refreshToken, source: _source, ...safeSession } = session;
  return { ...safeSession, expiresAt: effectiveSessionExpiry(session) };
}

export function requireSession(session: Session | undefined): Session {
  if (!session) throw new InvalidSessionError();
  return session;
}

export function requireCapability(session: Session, capability: Capability): Session {
  const scenario = getScenario(session);
  if (!scenario.capabilities.includes(capability)) throw new ForbiddenSessionError();
  return session;
}

/** Un navegador descarta en silencio una cookie de más de ~4 KB; mejor fallar en voz alta. */
export const MAX_SEALED_SESSION_BYTES = 3800;

export function sealSession(session: Session, secret = sessionSecret()): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const sealed = [iv, authTag, ciphertext].map((value) => value.toString("base64url")).join(".");
  if (sealed.length > MAX_SEALED_SESSION_BYTES) {
    throw new Error(`La sesión sellada (${sealed.length} bytes) supera el límite de la cookie (${MAX_SEALED_SESSION_BYTES}).`);
  }
  return sealed;
}

/**
 * Deja la cookie renovada en la respuesta del route handler, arme la respuesta que la arme (Next la fusiona al
 * enviarla). Fuera de un pedido de Next (tests, scripts) no hay store de cookies y no hace nada.
 */
export async function persistRenewedSession(session: Session): Promise<void> {
  let value: string;
  try {
    value = sealSession(session);
  } catch (error) {
    // M1 ya rotó los tokens: que quede claro por qué se corta, en vez de un 500 genérico.
    throw new BackendUnavailableError(502, "La sesión renovada es demasiado grande para la cookie.", { cause: error });
  }
  try {
    (await cookies()).set({ name: AUTH_COOKIE_NAME, value, ...sessionCookieOptions(session) });
  } catch {
    // Sin contexto de pedido de Next: los caminos explícitos (forwardResponse, /api/session) sellan igual.
  }
}

export function getSessionFromCookieValue(
  cookieValue: string | undefined,
  secret: string | undefined = undefined,
  now = Date.now(),
): Session | undefined {
  if (!cookieValue) return undefined;

  try {
    const sessionKey = secret ?? sessionSecret();
    const [encodedIv, encodedAuthTag, encodedCiphertext] = cookieValue.split(".");
    if (!encodedIv || !encodedAuthTag || !encodedCiphertext) return undefined;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(sessionKey),
      Buffer.from(encodedIv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const value = JSON.parse(plaintext) as Partial<Session>;

    if (!isSession(value) || value.mode !== getAuthMode()) return undefined;
    return isSessionActive(value, now) ? value : undefined;
  } catch {
    return undefined;
  }
}

// Sesión renovada contra M1 durante un pedido: el resto del pedido ve los tokens nuevos, no los de la cookie.
const renewedRequestSessions = new WeakMap<Request, Session>();
// Respuesta que debe llevar la cookie resellada con esa sesión (la aplica forwardResponse).
const renewedResponseSessions = new WeakMap<Response, Session>();

export function rememberRenewedSession(request: Request, session: Session): void {
  renewedRequestSessions.set(request, session);
}

export function wasSessionRenewed(request: Request): boolean {
  return renewedRequestSessions.has(request);
}

export function rememberRenewedResponse(response: Response, session: Session): void {
  renewedResponseSessions.set(response, session);
}

export function renewedSessionForResponse(response: Response): Session | undefined {
  return renewedResponseSessions.get(response);
}

export function getSessionFromRequest(
  request: Request,
  secret: string | undefined = undefined,
  now = Date.now(),
): Session | undefined {
  const renewed = renewedRequestSessions.get(request);
  if (renewed) return renewed;

  const cookieHeader = request.headers.get("cookie");
  const cookieValue = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);

  return getSessionFromCookieValue(cookieValue, secret, now);
}

export function getRequiredSession(request: Request): Session {
  return requireSession(getSessionFromRequest(request));
}

export async function getSession(
  secret: string | undefined = undefined,
  now = Date.now(),
): Promise<Session | undefined> {
  const cookieStore = await cookies();
  return getSessionFromCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value, secret, now);
}

export function sessionCookieOptions(session: Session) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(0, Math.ceil((effectiveSessionExpiry(session) - Date.now()) / 1000)),
  };
}

/** Marca de "ya ingresó": vive lo que el tope de la sesión y la lee el proxy. */
export function sessionMarkerCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_ABSOLUTE_MS / 1000 };
}

export function sessionCookieRemovalOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 0 };
}

export function sessionSecret(environment: RuntimeEnvironment = process.env): string {
  if (environment.M6_SESSION_SECRET) return environment.M6_SESSION_SECRET;
  if (environment.NODE_ENV === "production") {
    throw new AuthUnavailableError("M6_SESSION_SECRET es obligatorio fuera del desarrollo local.");
  }
  return localSessionSecret;
}

function deriveKey(secret: string): Buffer {
  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(secret, "utf8"),
    sessionKeySalt,
    sessionKeyInfo,
    32,
  ));
}

function readJwtPayload(token: string): { exp?: unknown; sub?: unknown } | undefined {
  const [, encodedPayload] = token.split(".");
  if (!encodedPayload) return undefined;

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as { exp?: unknown; sub?: unknown };
  } catch {
    return undefined;
  }
}

export function readJwtExpiry(token: string): number | undefined {
  const exp = readJwtPayload(token)?.exp;
  return typeof exp === "number" ? exp * 1000 : undefined;
}

/** `sub` como texto (M1 lo manda numérico o string); undefined si no se puede leer. */
export function readJwtSubject(token: string): string | undefined {
  const sub = readJwtPayload(token)?.sub;
  return typeof sub === "string" || typeof sub === "number" ? String(sub) : undefined;
}

function isSession(value: Partial<Session>): value is Session {
  return (
    (value.mode === "mock" || value.mode === "backend-development") &&
    typeof value.scenarioId === "string" &&
    typeof value.issuedAt === "number" &&
    typeof value.lastActivityAt === "number" &&
    typeof value.absoluteExpiresAt === "number" &&
    typeof value.jwtExpiresAt === "number" &&
    m6RoleSchema.array().safeParse(value.roles).success &&
    (value.mode === "mock" || value.source === "demo" ? value.accessToken === undefined : typeof value.accessToken === "string") &&
    (value.source === undefined || ((value.source === "m1" || value.source === "demo") && value.mode !== "mock")) &&
    (value.refreshToken === undefined || (value.mode !== "mock" && typeof value.refreshToken === "string")) &&
    (value.crew === undefined || (typeof value.crew?.id === "string" && typeof value.crew?.name === "string"))
  );
}
