import { NextResponse } from "next/server";


import { M1AccountBlockedError, M1CredentialsRejectedError, M1InvalidResponseError, M1LoginTimeoutError, M1ServiceUnavailableError, loginWithM1 } from "@/lib/m1-auth";
import { fetchMeWithToken, sessionFromMe } from "@/lib/me";
import { getSessionMutationRejection } from "@/lib/session-request";
import { getScenario, isScenarioId } from "@/lib/scenarios";
import { recordTelemetryEvent } from "@/lib/telemetry";
import {
  AUTH_COOKIE_NAME,
  AuthUnavailableError,
  BackendUnavailableError,
  CitizenForbiddenError,
  InvalidSessionError,
  createSession,
  createM1Session,
  getAuthMode,
  isProductionAuthModeMisconfigured,
  publicSession,
  SESSION_MARKER_COOKIE_NAME,
  sessionMarkerCookieOptions,
  sealSession,
  sessionCookieOptions,
} from "@/lib/session";

export const maxDuration = 190;
const MAX_LOGIN_BODY_BYTES = 4_096;
const MAX_CONCURRENT_LOGIN_ATTEMPTS = 5;
let concurrentLoginAttempts = 0;

class LoginBodyTooLargeError extends Error {}

function loginFailure(status: 400 | 401 | 403 | 413 | 415 | 429 | 500 | 502 | 503 | 504, message: string) {
  recordTelemetryEvent({ name: "auth_login_failed", status });
  const response = NextResponse.json({ message }, { status });
  response.headers.set("cache-control", "no-store");
  if (status === 429) response.headers.set("retry-after", "5");
  return response;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export async function POST(request: Request) {
  if (isProductionAuthModeMisconfigured()) {
    console.error("[m6-auth-mode-misconfigured]", process.env.M6_AUTH_MODE);
    return loginFailure(503, "El ingreso no está disponible por una configuración del servidor.");
  }

  const rejection = getSessionMutationRejection(request);
  if (rejection) return loginFailure(rejection.status, rejection.message);

  // El cuerpo se lee antes de tomar un cupo: un cliente lento no debe agotar los intentos concurrentes (solo acotan a M1).
  let body: Record<string, unknown>;
  try {
    const value: unknown = await readBoundedJson(request);
    if (!isObject(value)) throw new Error("invalid body");
    body = value;
  } catch (error) {
    if (error instanceof LoginBodyTooLargeError) {
      return loginFailure(413, "La solicitud de ingreso supera el tamaño permitido.");
    }
    return loginFailure(400, "La solicitud de ingreso no es válida.");
  }

  if (concurrentLoginAttempts >= MAX_CONCURRENT_LOGIN_ATTEMPTS) {
    return loginFailure(429, "Hay demasiados intentos de ingreso en curso. Espere unos segundos e intente nuevamente.");
  }
  concurrentLoginAttempts += 1;

  try {
    return await handleLoginRequest(request, body);
  } finally {
    concurrentLoginAttempts -= 1;
  }
}

async function handleLoginRequest(request: Request, body: Record<string, unknown>) {
  const mode = getAuthMode();
  if (mode === "real-m1") {
    if (!hasOnlyKeys(body, ["email", "password"]) || typeof body.email !== "string" || typeof body.password !== "string") {
      return loginFailure(400, "Ingrese un correo y una contraseña válidos.");
    }
    const email = body.email.trim();
    const password = body.password;
    if (email.length === 0 || email.length > 320 || password.length === 0 || password.length > 1_024) {
      return loginFailure(400, "Ingrese un correo y una contraseña válidos.");
    }

    try {
      const backendOrigin = process.env.M6_BACKEND_ORIGIN;
      if (backendOrigin) wakeBackend(backendOrigin);
      const result = await loginWithM1(email, password);
      if (result.claims.subType !== "EMPLEADO") throw new CitizenForbiddenError();
      if (!backendOrigin) throw new BackendUnavailableError(503);

      const me = await fetchMeWithToken(backendOrigin, result.accessToken);
      if (me.subType !== "EMPLEADO") throw new CitizenForbiddenError();
      if (me.userId !== result.claims.subject) throw new InvalidSessionError();

      const created = createM1Session({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        jwtExpiresAt: result.claims.expiresAt,
        identity: { userId: result.claims.subject, subType: "EMPLEADO", m1Role: me.m1Role },
        roles: me.roles,
      });
      return sessionResponse(request, sessionFromMe(created, me));
    } catch (error) {
      if (error instanceof M1CredentialsRejectedError) return loginFailure(401, "El correo o la contraseña no son correctos.");
      if (error instanceof M1AccountBlockedError) return loginFailure(403, "La cuenta no puede iniciar sesión. Contacte al soporte de M1.");
      if (error instanceof CitizenForbiddenError) return loginFailure(403, "Esta cuenta no tiene acceso a M6.");
      if (error instanceof InvalidSessionError) return loginFailure(401, "No se pudo validar el ingreso con Ambiente. Intente nuevamente.");
      if (error instanceof M1InvalidResponseError) return loginFailure(502, "El servicio de ingreso devolvió una respuesta inválida.");
      if (error instanceof M1LoginTimeoutError) return loginFailure(504, "El servicio de ingreso no respondió dentro de un minuto y medio. Intente nuevamente.");
      if (error instanceof M1ServiceUnavailableError) return loginFailure(503, "El servicio de ingreso no está disponible. Intente nuevamente en unos minutos.");
      if (error instanceof BackendUnavailableError) return loginFailure(503, "El servicio de Ambiente no está disponible. Intente nuevamente en unos minutos.");
      if (error instanceof AuthUnavailableError) return loginFailure(503, error.message);
      return loginFailure(500, "No se pudo iniciar la sesión. Intente nuevamente.");
    }
  }

  if (!hasOnlyKeys(body, ["scenarioId"]) || !isScenarioId(body.scenarioId)) {
    return loginFailure(400, "Seleccione un escenario operativo válido.");
  }

  try {
    if (getScenario(body.scenarioId).subType === "CIUDADANO") throw new CitizenForbiddenError();
    const created = createSession(body.scenarioId, { mode: "mock" });
    return sessionResponse(request, created);
  } catch (error) {
    if (error instanceof CitizenForbiddenError) {
      return loginFailure(403, error.message);
    }
    return loginFailure(500, "No se pudo iniciar la sesión.");
  }
}

function wakeBackend(origin: string): void {
  try {
    void fetch(new URL("/health", origin), {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(2_000),
    }).catch(() => undefined);
  } catch {
    // The real /me call below reports a misconfigured or unavailable backend.
  }
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_LOGIN_BODY_BYTES) {
    throw new LoginBodyTooLargeError();
  }

  const reader = request.body?.getReader();
  if (!reader) throw new Error("missing body");
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      byteLength += value.byteLength;
      if (byteLength > MAX_LOGIN_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new LoginBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function sessionResponse(request: Request, session: Parameters<typeof publicSession>[0]) {
  const response = NextResponse.json({ session: publicSession(session) });
  response.headers.set("cache-control", "no-store");
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: sealSession(session),
    ...sessionCookieOptions(session, request),
  });
  response.cookies.set(SESSION_MARKER_COOKIE_NAME, "1", sessionMarkerCookieOptions(request));
  return response;
}
