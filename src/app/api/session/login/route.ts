import { NextResponse } from "next/server";


import { demoSigningConfigured, signDemoJwt } from "@/lib/demo-jwt";
import { fetchMeWithToken, sessionFromMe } from "@/lib/me";
import { getSessionMutationRejection } from "@/lib/session-request";
import { getScenario, isScenarioId } from "@/lib/scenarios";
import {
  AUTH_COOKIE_NAME,
  AuthUnavailableError,
  BackendUnavailableError,
  CitizenForbiddenError,
  InvalidSessionError,
  createSession,
  getAuthMode,
  publicSession,
  SESSION_MARKER_COOKIE_NAME,
  sessionMarkerCookieOptions,
  sealSession,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(request: Request) {
  const rejection = getSessionMutationRejection(request);
  if (rejection) return NextResponse.json({ message: rejection.message }, { status: rejection.status });

  let body: { scenarioId?: unknown };
  try {
    body = (await request.json()) as { scenarioId?: unknown };
  } catch {
    return NextResponse.json({ message: "El escenario de ingreso no es válido." }, { status: 400 });
  }

  if (!isScenarioId(body.scenarioId)) {
    return NextResponse.json({ message: "Seleccione un escenario operativo válido." }, { status: 400 });
  }

  try {
    const backendOrigin = process.env.M6_BACKEND_ORIGIN;
    const mode = getAuthMode();
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
    const response = NextResponse.json({ session: publicSession(session) });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: sealSession(session),
      ...sessionCookieOptions(session),
    });
    response.cookies.set(SESSION_MARKER_COOKIE_NAME, "1", sessionMarkerCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof CitizenForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof InvalidSessionError) {
      return NextResponse.json({ message: "El servicio rechazó la sesión de desarrollo. Renueve el token." }, { status: 401 });
    }
    if (error instanceof AuthUnavailableError || error instanceof BackendUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: "No se pudo iniciar la sesión." }, { status: 500 });
  }
}
