import { NextResponse } from "next/server";


import { demoSigningConfigured, signDemoJwt } from "@/lib/demo-jwt";
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
  isProductionDemoModeMisconfigured,
  publicSession,
  SESSION_MARKER_COOKIE_NAME,
  sessionMarkerCookieOptions,
  sealSession,
  sessionCookieOptions,
} from "@/lib/session";

export const maxDuration = 120;

function loginFailure(status: 400 | 401 | 403 | 415 | 500 | 502 | 503 | 504, message: string) {
  recordTelemetryEvent({ name: "auth_login_failed", status });
  return NextResponse.json({ message }, { status });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export async function POST(request: Request) {
  if (isProductionDemoModeMisconfigured()) {
    console.error("[m6-auth-mode-misconfigured]", process.env.M6_AUTH_MODE);
    return loginFailure(503, "El ingreso no está disponible por una configuración del servidor.");
  }

  const rejection = getSessionMutationRejection(request);
  if (rejection) return loginFailure(rejection.status, rejection.message);

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!isObject(value)) throw new Error("invalid body");
    body = value;
  } catch {
    return loginFailure(400, "La solicitud de ingreso no es válida.");
  }

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
      const result = await loginWithM1(email, password);
      if (result.claims.subType !== "EMPLEADO") throw new CitizenForbiddenError();

      const backendOrigin = process.env.M6_BACKEND_ORIGIN;
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
      return sessionResponse(sessionFromMe(created, me));
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
    const backendOrigin = process.env.M6_BACKEND_ORIGIN;
    if (mode === "mock" && getScenario(body.scenarioId).subType === "CIUDADANO") throw new CitizenForbiddenError();
    const demoSigning = mode === "backend-development" && demoSigningConfigured();
    const devJwt = demoSigning ? undefined : process.env.M6_DEV_JWT;
    const loginToken = demoSigning ? signDemoJwt(body.scenarioId) : devJwt;
    // En modo backend los roles de M6 salen de GET /me, no del escenario elegido ni del token.
    const me = mode === "backend-development" && backendOrigin && loginToken
      ? await fetchMeWithToken(backendOrigin, loginToken)
      : undefined;
    const created = createSession(body.scenarioId, { mode, devJwt, backendOrigin, roles: me?.roles, demoSigning });
    const session = me ? sessionFromMe(created, me) : created;
    return sessionResponse(session);
  } catch (error) {
    if (error instanceof CitizenForbiddenError) {
      return loginFailure(403, error.message);
    }
    if (error instanceof InvalidSessionError) {
      return loginFailure(401, "El servicio rechazó la sesión de desarrollo. Renueve el token.");
    }
    if (error instanceof AuthUnavailableError || error instanceof BackendUnavailableError) {
      return loginFailure(503, error.message);
    }
    return loginFailure(500, "No se pudo iniciar la sesión.");
  }
}

function sessionResponse(session: Parameters<typeof publicSession>[0]) {
  const response = NextResponse.json({ session: publicSession(session) });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: sealSession(session),
    ...sessionCookieOptions(session),
  });
  response.cookies.set(SESSION_MARKER_COOKIE_NAME, "1", sessionMarkerCookieOptions());
  return response;
}
