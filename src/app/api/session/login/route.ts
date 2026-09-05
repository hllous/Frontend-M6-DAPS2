import { NextResponse } from "next/server";

import { isScenarioId } from "@/lib/scenarios";
import {
  AUTH_COOKIE_NAME,
  AuthUnavailableError,
  createSession,
  getAuthMode,
  publicSession,
  sealSession,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(request: Request) {
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
    const session = createSession(body.scenarioId, {
      mode: getAuthMode(),
      devJwt: process.env.M6_DEV_JWT,
    });
    const response = NextResponse.json({ session: publicSession(session) });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: sealSession(session),
      ...sessionCookieOptions(session),
    });
    return response;
  } catch (error) {
    if (error instanceof AuthUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: "No se pudo iniciar la sesión." }, { status: 500 });
  }
}
