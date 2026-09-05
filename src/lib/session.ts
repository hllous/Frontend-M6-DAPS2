import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";

import { getScenario, type Capability, type ScenarioId } from "./scenarios";
import { AUTH_COOKIE_NAME } from "./session-config";

export { AUTH_COOKIE_NAME } from "./session-config";

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
};

export type PublicSession = Omit<Session, "accessToken"> & {
  expiresAt: number;
};

export class AuthUnavailableError extends Error {
  constructor(message = "La autenticación solicitada no está disponible.") {
    super(message);
    this.name = "AuthUnavailableError";
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
};

type RuntimeEnvironment = {
  M6_AUTH_MODE?: string;
  M6_DEV_JWT?: string;
  M6_SESSION_SECRET?: string;
  NODE_ENV?: string;
};

const localSessionSecret = "m6-local-development-session-secret";

export function getAuthMode(environment: RuntimeEnvironment = process.env): AuthMode {
  if (environment.NODE_ENV === "production") return "real-m1";
  const configuredMode = environment.M6_AUTH_MODE ??
    "mock";

  if (configuredMode === "mock" || configuredMode === "backend-development" || configuredMode === "real-m1") {
    return configuredMode;
  }

  return "real-m1";
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
    return {
      mode: options.mode,
      scenarioId,
      issuedAt: now,
      lastActivityAt: now,
      absoluteExpiresAt: now + SESSION_ABSOLUTE_MS,
      jwtExpiresAt: now + SESSION_ABSOLUTE_MS,
    };
  }

  const accessToken = options.devJwt;
  if (!accessToken) {
    throw new AuthUnavailableError("El modo de desarrollo requiere M6_DEV_JWT en el servidor.");
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

export function refreshSession(session: Session, now = Date.now()): Session | undefined {
  if (!isSessionActive(session, now)) return undefined;
  return { ...session, lastActivityAt: now };
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
  const scenario = getScenario(session.scenarioId);
  if (!scenario.capabilities.includes(capability)) throw new ForbiddenSessionError();
  return session;
}

export function sealSession(session: Session, secret = sessionSecret()): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((value) => value.toString("base64url")).join(".");
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

    if (!isSession(value)) return undefined;
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
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(0, Math.ceil((effectiveSessionExpiry(session) - Date.now()) / 1000)),
  };
}

export function sessionCookieRemovalOptions() {
  return { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 0 };
}

export function sessionSecret(environment: RuntimeEnvironment = process.env): string {
  if (environment.M6_SESSION_SECRET) return environment.M6_SESSION_SECRET;
  if (environment.NODE_ENV === "production") {
    throw new AuthUnavailableError("M6_SESSION_SECRET es obligatorio fuera del desarrollo local.");
  }
  return localSessionSecret;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
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
    (value.mode === "mock" ? value.accessToken === undefined : typeof value.accessToken === "string")
  );
}
