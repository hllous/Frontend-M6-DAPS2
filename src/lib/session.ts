import { cookies } from "next/headers";

import { getScenario, type Capability, type ScenarioCrew, type ScenarioId } from "./scenarios";
import { AUTH_COOKIE_NAME } from "./session-config";
import {
  createMockSessionState,
  DEFAULT_LOCAL_SESSION_SECRET,
  openSessionValue,
  sealSessionValue,
  SESSION_ABSOLUTE_MS as SESSION_ABSOLUTE_DURATION_MS,
  SESSION_IDLE_MS as SESSION_IDLE_DURATION_MS,
} from "./session-cookie.mjs";

export { AUTH_COOKIE_NAME } from "./session-config";

export const SESSION_IDLE_MS = SESSION_IDLE_DURATION_MS;
export const SESSION_ABSOLUTE_MS = SESSION_ABSOLUTE_DURATION_MS;

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
  /** Cuadrilla real de un escenario de Campo, resuelta contra GET /crews en el login (sólo modo backend). */
  crew?: ScenarioCrew;
};

export type PublicSession = Omit<Session, "accessToken"> & {
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

  constructor(status: number, message = "El backend no responde. Reintente en unos segundos.") {
    super(message);
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

type SessionOptions = {
  mode: AuthMode;
  now?: number;
  devJwt?: string;
  backendOrigin?: string;
};

type RuntimeEnvironment = {
  M6_AUTH_MODE?: string;
  M6_DEV_JWT?: string;
  M6_SESSION_SECRET?: string;
  NODE_ENV?: string;
};

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

  if (options.mode === "real-m1") {
    throw new AuthUnavailableError("La autenticación real de M1 permanece bloqueada hasta publicar su contrato.");
  }

  if (options.mode === "mock") {
    return createMockSessionState(scenarioId, now);
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
  };
}

export function effectiveSessionExpiry(session: Session): number {
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
  const { accessToken: _accessToken, ...safeSession } = session;
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

export function sealSession(session: Session, secret = sessionSecret()): string {
  return sealSessionValue(session, secret);
}

export function getSessionFromCookieValue(
  cookieValue: string | undefined,
  secret: string | undefined = undefined,
  now = Date.now(),
): Session | undefined {
  if (!cookieValue) return undefined;

  try {
    const sessionKey = secret ?? sessionSecret();
    const plaintext = openSessionValue(cookieValue, sessionKey);
    const value = JSON.parse(plaintext) as Partial<Session>;

    if (!isSession(value) || value.mode !== getAuthMode()) return undefined;
    return isSessionActive(value, now) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function getSessionFromRequest(
  request: Request,
  secret: string | undefined = undefined,
  now = Date.now(),
): Session | undefined {
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

export function sessionCookieRemovalOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 0 };
}

export function sessionSecret(environment: RuntimeEnvironment = process.env): string {
  if (environment.M6_SESSION_SECRET) return environment.M6_SESSION_SECRET;
  if (environment.NODE_ENV === "production") {
    throw new AuthUnavailableError("M6_SESSION_SECRET es obligatorio fuera del desarrollo local.");
  }
  return DEFAULT_LOCAL_SESSION_SECRET;
}

function readJwtExpiry(token: string): number | undefined {
  const [, encodedPayload] = token.split(".");
  if (!encodedPayload) return undefined;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

function isSession(value: Partial<Session>): value is Session {
  return (
    (value.mode === "mock" || value.mode === "backend-development") &&
    typeof value.scenarioId === "string" &&
    typeof value.issuedAt === "number" &&
    typeof value.lastActivityAt === "number" &&
    typeof value.absoluteExpiresAt === "number" &&
    typeof value.jwtExpiresAt === "number" &&
    (value.mode === "mock" ? value.accessToken === undefined : typeof value.accessToken === "string") &&
    (value.crew === undefined || (typeof value.crew?.id === "string" && typeof value.crew?.name === "string"))
  );
}
